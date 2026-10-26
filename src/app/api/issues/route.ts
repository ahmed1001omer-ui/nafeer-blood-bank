import { db } from "@/db";
import { bloodIssues, bloodRequests, bloodUnits, inventoryMovements } from "@/db/schema";
import { requireDate, requireText, optionalText } from "@/lib/validation";
import { clientIp, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { daysUntil } from "@/lib/format";
import { and, desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("issues", "view");
    const rows = await db.select().from(bloodIssues).orderBy(desc(bloodIssues.issueDate), desc(bloodIssues.id));
    return Response.json({ issues: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("issues", "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const unitId = Number(body.unitId);
    if (!Number.isFinite(unitId)) throw new HttpError(400, "يجب اختيار وحدة الدم");

    const patientName = requireText(errors, "patientName", body.patientName, "اسم المريض");
    const issueDate = requireDate(errors, "issueDate", body.issueDate, "تاريخ الصرف");
    const notes = optionalText(body.notes);
    const requestId = body.requestId ? Number(body.requestId) : null;

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const [unit] = await db.select().from(bloodUnits).where(eq(bloodUnits.id, unitId));
    if (!unit) throw new HttpError(404, "الوحدة غير موجودة");

    // تحقق من الصلاحية قبل الصرف
    if (unit.status === "dispensed") throw new HttpError(409, "تم صرف هذه الوحدة مسبقًا");
    const expiryDays = daysUntil(unit.expiryDate);
    if (unit.status === "expired" || !Number.isFinite(expiryDays) || expiryDays < 0) {
      throw new HttpError(400, "لا يمكن صرف وحدة منتهية الصلاحية");
    }
    if (unit.status === "quarantine" || unit.status === "rejected") {
      throw new HttpError(400, "لا يمكن صرف وحدة غير صالحة أو تحت الحجر");
    }

    // صرف آمن ضد التزامن: التحديث المشروط على الحالة "متاح"/"محجوز"
    const dispensed = await db
      .update(bloodUnits)
      .set({ status: "dispensed", updatedAt: new Date() })
      .where(and(eq(bloodUnits.id, unitId), sql`${bloodUnits.status} in ('available','reserved')`))
      .returning();

    if (dispensed.length === 0) {
      throw new HttpError(409, "تعذر الصرف — ربما تم صرف الوحدة بواسطة موظف آخر");
    }

    let requestNumber: string | null = null;
    if (requestId) {
      const [req] = await db.select().from(bloodRequests).where(eq(bloodRequests.id, requestId));
      if (req) {
        requestNumber = req.requestNumber;
        const fulfilled = req.unitsFulfilled + 1;
        const status = fulfilled >= req.unitsRequested ? "fulfilled" : "partial";
        await db.update(bloodRequests).set({ unitsFulfilled: fulfilled, status }).where(eq(bloodRequests.id, requestId));
      }
    }

    const [created] = await db
      .insert(bloodIssues)
      .values({
        requestId,
        requestNumber,
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        bloodType: unit.bloodType,
        component: unit.component,
        patientName,
        issueDate,
        issuedBy: user.fullName,
        notes,
      })
      .returning();

    // تسجيل الحركة في سجل تحركات المخزون
    await db.insert(inventoryMovements).values({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      bloodType: unit.bloodType,
      type: "issue",
      reason: requestNumber ? `صرف مقابل الطلب ${requestNumber}` : `صرف للمريض ${patientName}`,
      performedBy: user.fullName,
      movementDate: issueDate,
    });

    await writeAudit({
      user,
      action: "issue",
      entity: "issues",
      entityId: created.id,
      page: "/inventory/issues",
      changes: [{ field: "unit", from: unit.status, to: "dispensed" }],
      ip: clientIp(request),
    });

    return Response.json({ issue: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
