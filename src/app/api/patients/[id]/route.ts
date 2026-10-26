import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireDate, requireNumber, requireOption, requireText, optionalText } from "@/lib/validation";
import { BLOOD_TYPES, GENDERS } from "@/lib/constants";
import { clientIp, diffChanges, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedGenders = GENDERS.map((item) => item.value);
const FIELDS = ["name", "age", "nationalId", "phone", "bloodType", "hospital", "gender", "recordDate"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("patients", "update");
    const { id } = await params;
    const patientId = Number(id);
    if (!Number.isFinite(patientId)) throw new HttpError(400, "معرّف غير صحيح");

    const [existing] = await db.select().from(patients).where(eq(patients.id, patientId));
    if (!existing) throw new HttpError(404, "المريض غير موجود");

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const name = has("name") ? requireText(errors, "name", body.name, "اسم المريض") : existing.name;
    const age = has("age") ? requireNumber(errors, "age", body.age, "العمر") : existing.age;
    const bloodType = has("bloodType")
      ? requireOption(errors, "bloodType", body.bloodType, "فصيلة الدم", [...BLOOD_TYPES])
      : existing.bloodType;
    const hospital = has("hospital")
      ? requireText(errors, "hospital", body.hospital, "اسم المستشفى أو الجهة")
      : existing.hospital;
    const gender = has("gender")
      ? requireOption(errors, "gender", body.gender, "الجنس", allowedGenders)
      : existing.gender;
    const recordDate = has("recordDate")
      ? requireDate(errors, "recordDate", body.recordDate, "التاريخ")
      : existing.recordDate;
    const nationalId = has("nationalId") ? optionalText(body.nationalId) : existing.nationalId;
    const phone = has("phone") ? optionalText(body.phone) : existing.phone;

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const next = { name, age, bloodType, hospital, gender, recordDate, nationalId, phone };
    const changes = diffChanges(existing as unknown as Record<string, unknown>, next, FIELDS);

    const [updated] = await db.update(patients).set(next).where(eq(patients.id, patientId)).returning();

    await writeAudit({
      user,
      action: "update",
      entity: "patients",
      entityId: patientId,
      page: "/reception/patients",
      changes,
      ip: clientIp(request),
    });

    return Response.json({ patient: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("patients", "delete");
    const { id } = await params;
    const patientId = Number(id);
    if (!Number.isFinite(patientId)) throw new HttpError(400, "معرّف غير صحيح");

    const [existing] = await db.select().from(patients).where(eq(patients.id, patientId));
    if (!existing) throw new HttpError(404, "المريض غير موجود");

    await db.delete(patients).where(eq(patients.id, patientId));

    await writeAudit({
      user,
      action: "delete",
      entity: "patients",
      entityId: patientId,
      page: "/reception/patients",
      changes: [{ field: "patient", from: existing.name, to: null }],
      ip: clientIp(request),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
