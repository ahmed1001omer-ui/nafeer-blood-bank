import { db } from "@/db";
import { bloodRequests, patients } from "@/db/schema";
import { requireOption, requireNumber, requireText, requireDate, optionalText } from "@/lib/validation";
import { BLOOD_COMPONENTS, BLOOD_TYPES, PRIORITY_OPTIONS, REQUEST_STATUSES } from "@/lib/constants";
import { clientIp, diffChanges, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedPriority = PRIORITY_OPTIONS.map((p) => p.value);
const allowedStatus = REQUEST_STATUSES.map((s) => s.value);
const FIELDS = ["patientId", "patientName", "requester", "bloodType", "component", "unitsRequested", "priority", "status", "requestDate"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("requests", "update");
    const { id } = await params;
    const reqId = Number(id);
    if (!Number.isFinite(reqId)) throw new HttpError(400, "معرّف غير صحيح");

    const [existing] = await db.select().from(bloodRequests).where(eq(bloodRequests.id, reqId));
    if (!existing) throw new HttpError(404, "الطلب غير موجود");

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const patientName = has("patientName") ? requireText(errors, "patientName", body.patientName, "اسم المريض") : existing.patientName;
    const requester = has("requester") ? requireText(errors, "requester", body.requester, "الجهة الطالبة") : existing.requester;
    const bloodType = has("bloodType") ? requireOption(errors, "bloodType", body.bloodType, "الفصيلة", [...BLOOD_TYPES]) : existing.bloodType;
    const component = has("component") ? requireOption(errors, "component", body.component, "المكوّن", [...BLOOD_COMPONENTS]) : existing.component;
    const unitsRequested = has("unitsRequested") ? requireNumber(errors, "unitsRequested", body.unitsRequested, "عدد الوحدات", { min: 1, max: Number.MAX_SAFE_INTEGER }) : existing.unitsRequested;
    const priority = has("priority") ? requireOption(errors, "priority", body.priority, "الأولوية", allowedPriority) : existing.priority;
    const status = has("status") ? requireOption(errors, "status", body.status, "الحالة", allowedStatus) : existing.status;
    const requestDate = has("requestDate") ? requireDate(errors, "requestDate", body.requestDate, "تاريخ الطلب") : existing.requestDate;
    const notes = has("notes") ? optionalText(body.notes) : existing.notes;
    let patientId = existing.patientId;
    if (has("patientId")) {
      const rawPatientId = body.patientId;
      if (rawPatientId === null || rawPatientId === "") {
        patientId = null;
      } else {
        const parsedPatientId = Number(rawPatientId);
        if (!Number.isSafeInteger(parsedPatientId) || parsedPatientId <= 0) {
          errors.patientId = "معرّف المريض غير صحيح";
        } else {
          const [patient] = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, parsedPatientId));
          if (!patient) throw new HttpError(404, "المريض المحدد غير موجود");
          patientId = patient.id;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const next = { patientId, patientName, requester, bloodType, component, unitsRequested, priority, status, requestDate, notes };
    const changes = diffChanges(existing as unknown as Record<string, unknown>, next, FIELDS);
    const [updated] = await db.update(bloodRequests).set(next).where(eq(bloodRequests.id, reqId)).returning();
    await writeAudit({ user, action: "update", entity: "requests", entityId: reqId, page: "/requests", changes, ip: clientIp(request) });

    return Response.json({ request: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
