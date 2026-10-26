import { db } from "@/db";
import { bloodUnits, inventoryMovements } from "@/db/schema";
import { requireDate, requireOption, requireText, optionalText } from "@/lib/validation";
import { clientIp, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { daysUntil } from "@/lib/format";
import { and, desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MOVEMENT_TYPES = ["add", "issue", "discard", "transfer"];

export async function GET() {
  try {
    await requirePermission("units", "view");
    const rows = await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.id)).limit(300);
    return Response.json({ movements: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    // النقل/الإتلاف يتطلب صلاحية تعديل، والصرف صلاحية صرف
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const type = requireOption(errors, "type", body.type, "نوع الحركة", MOVEMENT_TYPES);

    const permAction = type === "issue" ? "issue" : type === "discard" ? "delete" : "update";
    const user = await requirePermission("units", permAction);

    const unitId = Number(body.unitId);
    if (!Number.isFinite(unitId)) throw new HttpError(400, "يجب اختيار الوحدة");
    const movementDate = requireDate(errors, "movementDate", body.movementDate, "تاريخ الحركة");
    const reason = optionalText(body.reason);
    const toLocation = type === "transfer" ? requireText(errors, "toLocation", body.toLocation, "الموقع الجديد") : optionalText(body.toLocation);

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const [unit] = await db.select().from(bloodUnits).where(eq(bloodUnits.id, unitId));
    if (!unit) throw new HttpError(404, "الوحدة غير موجودة");

    let newStatus = unit.status;
    let fromLocation = unit.storageLocation;
    let newLocation = unit.storageLocation;

    if (type === "issue") {
      if (unit.status === "dispensed") throw new HttpError(409, "تم صرف هذه الوحدة مسبقًا");
      const expiryDays = daysUntil(unit.expiryDate);
      if (unit.status === "expired" || !Number.isFinite(expiryDays) || expiryDays < 0) throw new HttpError(400, "لا يمكن صرف وحدة منتهية الصلاحية");
      if (unit.status === "quarantine" || unit.status === "rejected") throw new HttpError(400, "لا يمكن صرف وحدة غير صالحة");
      const updated = await db
        .update(bloodUnits)
        .set({ status: "dispensed", updatedAt: new Date() })
        .where(and(eq(bloodUnits.id, unitId), sql`${bloodUnits.status} in ('available','reserved')`))
        .returning();
      if (updated.length === 0) throw new HttpError(409, "تعذر الصرف — ربما تمت العملية بواسطة موظف آخر");
      newStatus = "dispensed";
    } else if (type === "discard") {
      if (unit.status === "dispensed") throw new HttpError(400, "لا يمكن إتلاف وحدة مصروفة");
      await db.update(bloodUnits).set({ status: "rejected", updatedAt: new Date() }).where(eq(bloodUnits.id, unitId));
      newStatus = "rejected";
    } else if (type === "transfer") {
      await db.update(bloodUnits).set({ storageLocation: toLocation as string, updatedAt: new Date() }).where(eq(bloodUnits.id, unitId));
      newLocation = toLocation as string;
    }

    const [created] = await db
      .insert(inventoryMovements)
      .values({
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        bloodType: unit.bloodType,
        type,
        fromLocation: type === "transfer" ? fromLocation : null,
        toLocation: type === "transfer" ? newLocation : null,
        reason,
        performedBy: user.fullName,
        movementDate,
      })
      .returning();

    await writeAudit({
      user,
      action: type,
      entity: "units",
      entityId: unit.id,
      page: "/inventory/units",
      changes: type === "transfer"
        ? [{ field: "storageLocation", from: fromLocation, to: newLocation }]
        : [{ field: "status", from: unit.status, to: newStatus }],
      ip: clientIp(request),
    });

    return Response.json({ movement: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
