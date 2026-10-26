import { db } from "@/db";
import { bloodUnits } from "@/db/schema";
import { requireDate, requireNumber, requireOption, requireText, optionalText } from "@/lib/validation";
import { BLOOD_COMPONENTS, BLOOD_TYPES, RH_TYPES, UNIT_STATUSES } from "@/lib/constants";
import { clientIp, diffChanges, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedRh = RH_TYPES.map((item) => item.value);
const allowedStatus = UNIT_STATUSES.map((item) => item.value);
const FIELDS = ["unitNumber", "bloodType", "rh", "component", "status", "collectionDate", "expiryDate", "quantity", "storageLocation", "sourceCode"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("units", "update");
    const { id } = await params;
    const unitId = Number(id);
    if (!Number.isFinite(unitId)) throw new HttpError(400, "معرّف غير صحيح");

    const [existing] = await db.select().from(bloodUnits).where(eq(bloodUnits.id, unitId));
    if (!existing) throw new HttpError(404, "الوحدة غير موجودة");

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const unitNumber = has("unitNumber") ? requireText(errors, "unitNumber", body.unitNumber, "رقم الوحدة") : existing.unitNumber;
    const bloodType = has("bloodType") ? requireOption(errors, "bloodType", body.bloodType, "فصيلة الدم", [...BLOOD_TYPES]) : existing.bloodType;
    const rh = has("rh") ? requireOption(errors, "rh", body.rh, "Rh", allowedRh) : existing.rh;
    const component = has("component") ? requireOption(errors, "component", body.component, "نوع مكوّن الدم", [...BLOOD_COMPONENTS]) : existing.component;
    const status = has("status") ? requireOption(errors, "status", body.status, "الحالة", allowedStatus) : existing.status;
    const collectionDate = has("collectionDate") ? requireDate(errors, "collectionDate", body.collectionDate, "تاريخ السحب") : existing.collectionDate;
    const expiryDate = has("expiryDate") ? requireDate(errors, "expiryDate", body.expiryDate, "تاريخ الانتهاء") : existing.expiryDate;
    const quantity = has("quantity") ? requireNumber(errors, "quantity", body.quantity, "الكمية", { min: 1, max: Number.MAX_SAFE_INTEGER }) : existing.quantity;
    const storageLocation = has("storageLocation") ? requireText(errors, "storageLocation", body.storageLocation, "موقع التخزين") : existing.storageLocation;
    const sourceCode = has("sourceCode") ? optionalText(body.sourceCode) : existing.sourceCode;

    if (collectionDate && expiryDate && expiryDate < collectionDate) {
      errors.expiryDate = "تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ السحب";
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const next = { unitNumber, bloodType, rh, component, status, collectionDate, expiryDate, quantity, storageLocation, sourceCode, updatedAt: new Date() };
    const changes = diffChanges(existing as unknown as Record<string, unknown>, next, FIELDS);
    const [updated] = await db.update(bloodUnits).set(next).where(eq(bloodUnits.id, unitId)).returning();
    await writeAudit({ user, action: "update", entity: "units", entityId: unitId, page: "/inventory/units", changes, ip: clientIp(request) });

    return Response.json({ unit: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("units", "delete");
    const { id } = await params;
    const unitId = Number(id);
    if (!Number.isFinite(unitId)) throw new HttpError(400, "معرّف غير صحيح");

    const [existing] = await db.select().from(bloodUnits).where(eq(bloodUnits.id, unitId));
    if (!existing) throw new HttpError(404, "الوحدة غير موجودة");

    await db.delete(bloodUnits).where(eq(bloodUnits.id, unitId));
    await writeAudit({ user, action: "delete", entity: "units", entityId: unitId, page: "/inventory/units", changes: [{ field: "unitNumber", from: existing.unitNumber, to: null }], ip: clientIp(request) });

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
