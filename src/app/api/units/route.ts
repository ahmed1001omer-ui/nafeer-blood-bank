import { db } from "@/db";
import { bloodUnits, inventoryMovements } from "@/db/schema";
import { requireDate, requireNumber, requireOption, requireText, optionalText } from "@/lib/validation";
import { BLOOD_COMPONENTS, BLOOD_TYPES, RH_TYPES, UNIT_STATUSES } from "@/lib/constants";
import { isDuplicateError } from "@/lib/db-errors";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { asc, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedRh = RH_TYPES.map((item) => item.value);
const allowedStatus = UNIT_STATUSES.map((item) => item.value);

export async function GET() {
  try {
    await requirePermission("units", "view");
    const rows = await db.select().from(bloodUnits).orderBy(asc(bloodUnits.expiryDate), asc(bloodUnits.id));
    return Response.json({ units: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("units", "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

  const unitNumber = requireText(errors, "unitNumber", body.unitNumber, "رقم الوحدة");
  const bloodType = requireOption(errors, "bloodType", body.bloodType, "فصيلة الدم", [...BLOOD_TYPES]);
  const rh = requireOption(errors, "rh", body.rh, "Rh", allowedRh);
  const component = requireOption(errors, "component", body.component, "نوع مكوّن الدم", [...BLOOD_COMPONENTS]);
  const status = requireOption(errors, "status", body.status, "الحالة", allowedStatus);
  const collectionDate = requireDate(errors, "collectionDate", body.collectionDate, "تاريخ السحب");
  const expiryDate = requireDate(errors, "expiryDate", body.expiryDate, "تاريخ الانتهاء");
  const quantity = requireNumber(errors, "quantity", body.quantity ?? 1, "الكمية", { min: 1, max: Number.MAX_SAFE_INTEGER });
    const storageLocation = requireText(errors, "storageLocation", body.storageLocation, "موقع التخزين");
    const sourceCode = optionalText(body.sourceCode);

    if (collectionDate && expiryDate && expiryDate < collectionDate) {
      errors.expiryDate = "تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ السحب";
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    try {
      const [created] = await db
        .insert(bloodUnits)
        .values({ unitNumber, bloodType, rh, component, status, collectionDate, expiryDate, quantity, storageLocation, sourceCode })
        .returning();
      await db.insert(inventoryMovements).values({
        unitId: created.id,
        unitNumber: created.unitNumber,
        bloodType: created.bloodType,
        type: "add",
        toLocation: created.storageLocation,
        reason: sourceCode ? `مصدر: ${sourceCode}` : "إضافة وحدة",
        performedBy: user.fullName,
        movementDate: collectionDate,
      });
      await writeAudit({ user, action: "create", entity: "units", entityId: created.id, page: "/inventory/units", ip: clientIp(request) });
      return Response.json({ unit: created }, { status: 201 });
    } catch (dbError) {
      if (isDuplicateError(dbError)) {
        return Response.json(
          { message: "رقم الوحدة مستخدم مسبقًا", errors: { unitNumber: "رقم الوحدة موجود بالفعل" } },
          { status: 400 },
        );
      }
      throw dbError;
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("units", "delete");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const all = Boolean(body.all);
    const ids = Array.isArray(body.ids) ? (body.ids as number[]).map(Number).filter(Number.isFinite) : [];

    if (all) {
      await db.delete(bloodUnits);
      await writeAudit({ user, action: "delete", entity: "units", entityId: 0, page: "/inventory/units", changes: [{ field: "units", from: "all", to: "deleted" }], ip: clientIp(request) });
      return Response.json({ success: true, message: "تم تفريغ كافة وحدات المخزون بنجاح" });
    }

    if (ids.length > 0) {
      await db.delete(bloodUnits).where(inArray(bloodUnits.id, ids));
      await writeAudit({ user, action: "delete", entity: "units", entityId: ids[0], page: "/inventory/units", changes: [{ field: "units", from: ids.join(","), to: "deleted" }], ip: clientIp(request) });
      return Response.json({ success: true, count: ids.length });
    }

    return Response.json({ message: "لم يتم تحديد أي عناصر للحذف" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
