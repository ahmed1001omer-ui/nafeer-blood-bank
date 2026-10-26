import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireDate, requireNumber, requireOption, requireText, optionalText } from "@/lib/validation";
import { BLOOD_TYPES, GENDERS } from "@/lib/constants";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedGenders = GENDERS.map((item) => item.value);

export async function GET() {
  try {
    await requirePermission("patients", "view");
    const rows = await db.select().from(patients).orderBy(desc(patients.recordDate), desc(patients.id));
    return Response.json({ patients: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("patients", "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const name = requireText(errors, "name", body.name, "اسم المريض");
    const age = requireNumber(errors, "age", body.age, "العمر");
    const bloodType = requireOption(errors, "bloodType", body.bloodType, "فصيلة الدم", [...BLOOD_TYPES]);
    const hospital = requireText(errors, "hospital", body.hospital, "اسم المستشفى أو الجهة");
    const gender = requireOption(errors, "gender", body.gender, "الجنس", allowedGenders);
    const recordDate = requireDate(errors, "recordDate", body.recordDate, "التاريخ");
    const nationalId = optionalText(body.nationalId);
    const phone = optionalText(body.phone);

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const [created] = await db
      .insert(patients)
      .values({ name, age, bloodType, hospital, gender, recordDate, nationalId, phone })
      .returning();

    await writeAudit({
      user,
      action: "create",
      entity: "patients",
      entityId: created.id,
      page: "/reception/patients",
      ip: clientIp(request),
    });

    return Response.json({ patient: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
