import { db } from "@/db";
import { users } from "@/db/schema";
import { requireText, requireOption } from "@/lib/validation";
import { ALL_PERMISSIONS, ROLES } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { isDuplicateError } from "@/lib/db-errors";
import { clientIp, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function requireSystemAdmin(user: { role: string }) {
  if (user.role !== "admin") throw new HttpError(403, "يتطلب هذا الإجراء صلاحية مسؤول النظام");
}

const allowedRoles = ROLES.map((r) => r.value);

export async function GET() {
  try {
    const user = await requirePermission("users", "view");
    requireSystemAdmin(user);
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        permissions: users.permissions,
        active: users.active,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.id));
    return Response.json({ users: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("users", "create");
    requireSystemAdmin(user);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const username = requireText(errors, "username", body.username, "اسم المستخدم");
    const fullName = requireText(errors, "fullName", body.fullName, "الاسم الكامل");
    const role = requireOption(errors, "role", body.role, "الدور", allowedRoles);
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 6) errors.password = "كلمة المرور يجب أن تكون 6 أحرف فأكثر";
    const permissions = Array.isArray(body.permissions) ? body.permissions as string[] : [];
    if (permissions.some((permission) => typeof permission !== "string" || !ALL_PERMISSIONS.includes(permission as (typeof ALL_PERMISSIONS)[number]))) {
      errors.permissions = "توجد صلاحية غير معروفة";
    }
    if (role === "admin" && user.role !== "admin") errors.role = "إنشاء مسؤول نظام يتطلب صلاحية مسؤول النظام";

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    try {
      const [created] = await db
        .insert(users)
        .values({
          username,
          fullName,
          role,
          passwordHash: await hashPassword(password),
          permissions,
          active: true,
        })
        .returning({ id: users.id, username: users.username });
      await writeAudit({ user, action: "create", entity: "users", entityId: created.id, page: "/admin/users", ip: clientIp(request) });
      return Response.json({ user: created }, { status: 201 });
    } catch (dbError) {
      if (isDuplicateError(dbError)) {
        return Response.json({ message: "اسم المستخدم مستخدم مسبقًا", errors: { username: "اسم المستخدم موجود بالفعل" } }, { status: 400 });
      }
      throw dbError;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
