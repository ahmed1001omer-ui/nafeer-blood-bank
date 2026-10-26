import { db } from "@/db";
import { bloodRequests, patients } from "@/db/schema";
import { requireDate, requireNumber, requireOption, requireText, optionalText } from "@/lib/validation";
import { BLOOD_COMPONENTS, BLOOD_TYPES, PRIORITY_OPTIONS } from "@/lib/constants";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedPriority = PRIORITY_OPTIONS.map((p) => p.value);

async function nextRequestNumber(): Promise<string> {
  const rows = await db.select({ requestNumber: bloodRequests.requestNumber }).from(bloodRequests);
  const year = new Date().getFullYear();
  const nums = rows
    .map((r) => Number(r.requestNumber.split("-").pop()))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `REQ-${year}-${String(next).padStart(3, "0")}`;
}

export async function GET() {
  try {
    await requirePermission("requests", "view");
    const rows = await db.select().from(bloodRequests).orderBy(desc(bloodRequests.requestDate), desc(bloodRequests.id));
    return Response.json({ requests: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("requests", "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const patientName = requireText(errors, "patientName", body.patientName, "اسم المريض");
    const requester = requireText(errors, "requester", body.requester, "الجهة الطالبة");
    const bloodType = requireOption(errors, "bloodType", body.bloodType, "الفصيلة", [...BLOOD_TYPES]);
    const component = requireOption(errors, "component", body.component, "المكوّن", [...BLOOD_COMPONENTS]);
    const unitsRequested = requireNumber(errors, "unitsRequested", body.unitsRequested, "عدد الوحدات", { min: 1, max: Number.MAX_SAFE_INTEGER });
    const priority = requireOption(errors, "priority", body.priority ?? "normal", "الأولوية", allowedPriority);
    const requestDate = requireDate(errors, "requestDate", body.requestDate, "تاريخ الطلب");
    const notes = optionalText(body.notes);
    const rawPatientId = body.patientId;
    let resolvedPatientId: number | null = null;
    if (rawPatientId !== undefined && rawPatientId !== null && rawPatientId !== "") {
      const patientId = Number(rawPatientId);
      if (!Number.isSafeInteger(patientId) || patientId <= 0) {
        return Response.json({ message: "معرّف المريض غير صحيح" }, { status: 400 });
      }
      const [patient] = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId));
      if (!patient) return Response.json({ message: "المريض المحدد غير موجود" }, { status: 404 });
      resolvedPatientId = patient.id;
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const [created] = await db
      .insert(bloodRequests)
      .values({
        requestNumber: await nextRequestNumber(),
        patientId: resolvedPatientId,
        patientName,
        requester,
        bloodType,
        component,
        unitsRequested,
        priority,
        requestDate,
        notes,
        createdBy: user.fullName,
      })
      .returning();

    await writeAudit({ user, action: "create", entity: "requests", entityId: created.id, page: "/requests", ip: clientIp(request) });
    return Response.json({ request: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
