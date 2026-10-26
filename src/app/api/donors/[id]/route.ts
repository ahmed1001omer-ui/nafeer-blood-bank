import { db } from "@/db";
import { donors } from "@/db/schema";
import { requireDate, requireNumber, requireOption, requireText, optionalText, optionalNumber } from "@/lib/validation";
import { BLOOD_TYPES, ELIGIBILITY_OPTIONS, GENDERS, INITIAL_EXAM_RESULTS } from "@/lib/constants";
import { clientIp, diffChanges, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { and, eq, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedGenders = GENDERS.map((item) => item.value);
const allowedEligibility = ELIGIBILITY_OPTIONS.map((item) => item.value);
const FIELDS = ["code", "name", "age", "gender", "phone", "nationalId", "address", "initialExam", "bloodType", "vitalSigns", "hemoglobin", "eligibility", "ineligibilityReason", "registerDate"];

function normalizeDateInput(val: unknown, fallback: string): string {
  if (typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return fallback;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("donors", "update");
    const { id } = await params;
    const donorId = Number(id);
    if (!Number.isFinite(donorId)) throw new HttpError(400, "معرّف غير صحيح");

    const [existing] = await db.select().from(donors).where(eq(donors.id, donorId));
    if (!existing) throw new HttpError(404, "المتبرع غير موجود");

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const code = has("code") ? requireText(errors, "code", body.code, "كود المتبرع") : existing.code;
    const name = has("name") ? requireText(errors, "name", body.name, "اسم المتبرع") : existing.name;
    const age = has("age") ? requireNumber(errors, "age", body.age, "العمر") : existing.age;
    const gender = has("gender") ? requireOption(errors, "gender", body.gender, "الجنس", allowedGenders) : existing.gender;

    const bloodType = has("bloodType") && body.bloodType ? (BLOOD_TYPES as readonly string[]).includes(String(body.bloodType)) ? String(body.bloodType) : existing.bloodType : existing.bloodType;
    const initialExam = has("initialExam") && body.initialExam ? (INITIAL_EXAM_RESULTS as readonly string[]).includes(String(body.initialExam)) ? String(body.initialExam) : existing.initialExam : existing.initialExam;
    const eligibility = has("eligibility") && body.eligibility ? (allowedEligibility as readonly string[]).includes(String(body.eligibility)) ? String(body.eligibility) : existing.eligibility : existing.eligibility;
    const registerDate = has("registerDate") ? normalizeDateInput(body.registerDate, existing.registerDate) : existing.registerDate;
    const phone = has("phone") ? optionalText(body.phone) : existing.phone;
    const nationalId = has("nationalId") ? optionalText(body.nationalId) : existing.nationalId;
    const address = has("address") ? optionalText(body.address) : existing.address;
    const vitalSigns = has("vitalSigns") ? optionalText(body.vitalSigns) : existing.vitalSigns;
    const hemoglobin = has("hemoglobin") ? optionalNumber(body.hemoglobin) : existing.hemoglobin;
    const ineligibilityReason =
      has("ineligibilityReason") || eligibility === "not_eligible"
        ? eligibility === "not_eligible"
          ? requireText(errors, "ineligibilityReason", body.ineligibilityReason, "سبب عدم الأهلية")
          : optionalText(body.ineligibilityReason)
        : existing.ineligibilityReason;

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    if (code !== existing.code) {
      const duplicate = await db.select({ id: donors.id }).from(donors).where(and(eq(donors.code, code), ne(donors.id, donorId)));
      if (duplicate.length > 0) {
        return Response.json({ message: "كود المتبرع مستخدم مسبقًا", errors: { code: "هذا الكود مستخدم لمتبرع آخر" } }, { status: 400 });
      }
    }

    const labCompleted = ["eligible", "temp_banned", "final_banned", "deferred"].includes(existing.status);
    const next = {
      code, name, age, gender, phone, nationalId, address, initialExam, bloodType, vitalSigns, hemoglobin, eligibility, ineligibilityReason, registerDate,
      stage: labCompleted ? existing.stage : eligibility === "eligible" ? "waiting_lab" : "reception",
      status: labCompleted ? existing.status : eligibility === "eligible" ? "waiting_lab" : "reception_rejected",
      updatedAt: new Date(),
    };
    const changes = diffChanges(existing as unknown as Record<string, unknown>, next, FIELDS);
    const [updated] = await db.update(donors).set(next).where(eq(donors.id, donorId)).returning();
    await writeAudit({ user, action: "update", entity: "donors", entityId: donorId, page: "/reception/donors", changes, ip: clientIp(request) });

    return Response.json({ donor: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("donors", "delete");
    const { id } = await params;
    const donorId = Number(id);
    if (!Number.isFinite(donorId)) throw new HttpError(400, "معرّف غير صحيح");

    const [existing] = await db.select().from(donors).where(eq(donors.id, donorId));
    if (!existing) throw new HttpError(404, "المتبرع غير موجود");

    await db.delete(donors).where(eq(donors.id, donorId));

    await writeAudit({
      user,
      action: "delete",
      entity: "donors",
      entityId: donorId,
      page: "/reception/donors",
      changes: [{ field: "donor", from: existing.name, to: null }],
      ip: clientIp(request),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
