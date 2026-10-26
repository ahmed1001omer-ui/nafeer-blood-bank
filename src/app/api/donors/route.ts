import { db } from "@/db";
import { donors } from "@/db/schema";
import { requireDate, requireNumber, requireOption, requireText, optionalText, optionalNumber } from "@/lib/validation";
import { BLOOD_TYPES, ELIGIBILITY_OPTIONS, GENDERS, INITIAL_EXAM_RESULTS } from "@/lib/constants";
import { isDuplicateError } from "@/lib/db-errors";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { desc, eq } from "drizzle-orm";
import { todayISO } from "@/lib/format";
import { syncAllPostResponsesToDonors } from "@/lib/donor-sync";

export const dynamic = "force-dynamic";

const allowedGenders = GENDERS.map((item) => item.value);
const allowedEligibility = ELIGIBILITY_OPTIONS.map((item) => item.value);

export async function GET() {
  try {
    await requirePermission("donors", "view");
    await syncAllPostResponsesToDonors();
    const rows = await db.select().from(donors).orderBy(desc(donors.id));
    return Response.json({ donors: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

function normalizeDateInput(val: unknown): string {
  if (typeof val !== "string") return todayISO();
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return todayISO();
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("donors", "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const code = typeof body.code === "string" && body.code.trim() ? body.code.trim() : `DNR-${Math.floor(1000 + Math.random() * 9000)}`;
    const name = requireText(errors, "name", body.name, "اسم المتبرع");
    const age = requireNumber(errors, "age", body.age, "العمر");
    const gender = typeof body.gender === "string" && allowedGenders.includes(body.gender as any)
      ? body.gender
      : (body.gender === "أنثى" || body.gender === "female" ? "female" : "male");
    const bloodType = typeof body.bloodType === "string" && (BLOOD_TYPES as readonly string[]).includes(body.bloodType)
      ? body.bloodType
      : "O+";
    const initialExam = typeof body.initialExam === "string" && (INITIAL_EXAM_RESULTS as readonly string[]).includes(body.initialExam)
      ? body.initialExam
      : "مطابق للشروط";
    const eligibility = typeof body.eligibility === "string" && allowedEligibility.includes(body.eligibility as any)
      ? body.eligibility
      : (initialExam === "غير مطابق للشروط" ? "not_eligible" : "eligible");
    const registerDate = normalizeDateInput(body.registerDate);
    const phone = optionalText(body.phone);
    const nationalId = optionalText(body.nationalId);
    const address = optionalText(body.address);
    const vitalSigns = optionalText(body.vitalSigns);
    const hemoglobin = optionalNumber(body.hemoglobin);
    const ineligibilityReason =
      eligibility === "not_eligible"
        ? requireText(errors, "ineligibilityReason", body.ineligibilityReason, "سبب عدم الأهلية")
        : optionalText(body.ineligibilityReason);

    if (!errors.code) {
      const duplicate = await db.select({ id: donors.id }).from(donors).where(eq(donors.code, code));
      if (duplicate.length > 0) errors.code = "هذا الكود مستخدم لمتبرع آخر";
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    try {
      const [created] = await db
        .insert(donors)
        .values({
          code, name, age, gender, phone, nationalId, address, initialExam, bloodType,
          vitalSigns, hemoglobin, eligibility, ineligibilityReason, registerDate,
          stage: eligibility === "eligible" ? "waiting_lab" : "reception",
          status: eligibility === "eligible" ? "waiting_lab" : "reception_rejected",
        })
        .returning();
      await writeAudit({ user, action: "create", entity: "donors", entityId: created.id, page: "/reception/donors", ip: clientIp(request) });
      return Response.json({ donor: created }, { status: 201 });
    } catch (dbError) {
      if (isDuplicateError(dbError)) {
        return Response.json({ message: "كود المتبرع مستخدم مسبقًا", errors: { code: "هذا الكود مستخدم لمتبرع آخر" } }, { status: 400 });
      }
      throw dbError;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
