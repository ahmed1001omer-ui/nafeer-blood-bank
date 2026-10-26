import { db } from "@/db";
import { employees } from "@/db/schema";
import { requireDate, requireOption, requireText, optionalText } from "@/lib/validation";
import { EMPLOYEE_ROLES, EMPLOYEE_STATUSES } from "@/lib/constants";
import { clientIp, diffChanges, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedStatuses = EMPLOYEE_STATUSES.map((item) => item.value);
const FIELDS = ["name", "role", "hireDate", "status", "phone"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("employees", "update");
    const { id } = await params;
    const employeeId = Number(id);
    if (!Number.isFinite(employeeId)) throw new HttpError(400, "معرّف غير صحيح");

    const [existing] = await db.select().from(employees).where(eq(employees.id, employeeId));
    if (!existing) throw new HttpError(404, "الموظف غير موجود");

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const name = has("name") ? requireText(errors, "name", body.name, "اسم الموظف") : existing.name;
    const role = has("role") ? requireOption(errors, "role", body.role, "الوظيفة", [...EMPLOYEE_ROLES]) : existing.role;
    const hireDate = has("hireDate") ? requireDate(errors, "hireDate", body.hireDate, "تاريخ التعيين") : existing.hireDate;
    const status = has("status") ? requireOption(errors, "status", body.status, "الحالة", allowedStatuses) : existing.status;
    const phone = has("phone") ? optionalText(body.phone) : existing.phone;

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const next = { name, role, hireDate, status, phone };
    const changes = diffChanges(existing as unknown as Record<string, unknown>, next, FIELDS);
    const [updated] = await db.update(employees).set(next).where(eq(employees.id, employeeId)).returning();
    await writeAudit({ user, action: "update", entity: "employees", entityId: employeeId, page: "/employees", changes, ip: clientIp(request) });

    return Response.json({ employee: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
