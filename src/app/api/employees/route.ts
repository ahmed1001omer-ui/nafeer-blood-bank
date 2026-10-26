import { db } from "@/db";
import { employees } from "@/db/schema";
import { requireDate, requireOption, requireText, optionalText } from "@/lib/validation";
import { EMPLOYEE_ROLES, EMPLOYEE_STATUSES } from "@/lib/constants";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedStatuses = EMPLOYEE_STATUSES.map((item) => item.value);

export async function GET() {
  try {
    await requirePermission("employees", "view");
    const rows = await db.select().from(employees).orderBy(asc(employees.id));
    return Response.json({ employees: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("employees", "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const name = requireText(errors, "name", body.name, "اسم الموظف");
    const role = requireOption(errors, "role", body.role, "الوظيفة", [...EMPLOYEE_ROLES]);
    const hireDate = requireDate(errors, "hireDate", body.hireDate, "تاريخ التعيين");
    const status = body.status
      ? requireOption(errors, "status", body.status, "الحالة", allowedStatuses)
      : "active";
    const phone = optionalText(body.phone);

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const [created] = await db.insert(employees).values({ name, role, hireDate, status, phone }).returning();
    await writeAudit({ user, action: "create", entity: "employees", entityId: created.id, page: "/employees", ip: clientIp(request) });
    return Response.json({ employee: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
