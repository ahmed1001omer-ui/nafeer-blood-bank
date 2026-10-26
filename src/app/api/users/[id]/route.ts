import { db } from "@/db";
import { users } from "@/db/schema";
import { requireText, requireOption } from "@/lib/validation";
import { ALL_PERMISSIONS, ROLES } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { clientIp, diffChanges, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedRoles = ROLES.map((r) => r.value);
const FIELDS = ["username", "fullName", "role", "active", "permissions"];

function requireSystemAdmin(user: { role: string }) {
  if (user.role !== "admin") throw new HttpError(403, "يتطلب هذا الإجراء صلاحية مسؤول النظام");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePermission("users", "update");
    requireSystemAdmin(admin);
    const { id } = await params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) throw new HttpError(400, "معرّف غير صحيح");

    const [existing] = await db.select().from(users).where(eq(users.id, userId));
    if (!existing) throw new HttpError(404, "المستخدم غير موجود");

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const username = has("username") ? requireText(errors, "username", body.username, "اسم المستخدم") : existing.username;
    const fullName = has("fullName") ? requireText(errors, "fullName", body.fullName, "الاسم الكامل") : existing.fullName;
    const role = has("role") ? requireOption(errors, "role", body.role, "الدور", allowedRoles) : existing.role;
    const active = has("active") && typeof body.active === "boolean" ? body.active : existing.active;
    if (has("active") && typeof body.active !== "boolean") errors.active = "حالة الحساب غير صحيحة";
    if (admin.id === userId && active === false) {
      throw new HttpError(400, "لا يمكنك تعطيل حسابك الحالي أثناء تسجيل الدخول");
    }
    if (admin.id === userId && role !== "admin") {
      throw new HttpError(400, "لا يمكنك تغيير دور حساب مسؤول النظام الحالي");
    }
    const permissions = has("permissions") && Array.isArray(body.permissions) ? body.permissions as string[] : existing.permissions ?? [];
    if (has("permissions") && (!Array.isArray(body.permissions) || permissions.some((permission) => typeof permission !== "string" || !ALL_PERMISSIONS.includes(permission as (typeof ALL_PERMISSIONS)[number])))) {
      errors.permissions = "قائمة الصلاحيات غير صحيحة";
    }

    // إعادة تعيين كلمة المرور (اختياري) — يتطلب صلاحية reset
    let passwordHash = existing.passwordHash;
    if (has("password") && typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 6) errors.password = "كلمة المرور يجب أن تكون 6 أحرف فأكثر";
      else {
        const canReset = admin.permissions.includes("users:reset");
        if (!canReset) throw new HttpError(403, "ليس لديك صلاحية إعادة تعيين كلمة المرور");
        passwordHash = await hashPassword(body.password);
      }
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const next = { username, fullName, role, active, permissions, passwordHash, updatedAt: new Date() };
    const changes = diffChanges(existing as unknown as Record<string, unknown>, next, FIELDS);
    if (passwordHash !== existing.passwordHash) changes.push({ field: "password", from: "***", to: "*** (تم التغيير)" });

    await db.update(users).set(next).where(eq(users.id, userId));
    await writeAudit({ user: admin, action: "update", entity: "users", entityId: userId, page: "/admin/users", changes, ip: clientIp(request) });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePermission("users", "delete");
    requireSystemAdmin(admin);
    const { id } = await params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) throw new HttpError(400, "معرّف غير صحيح");

    if (admin.id === userId) {
      throw new HttpError(400, "لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول");
    }

    const [existing] = await db.select().from(users).where(eq(users.id, userId));
    if (!existing) throw new HttpError(404, "المستخدم غير موجود");

    await db.delete(users).where(eq(users.id, userId));
    await writeAudit({
      user: admin,
      action: "delete",
      entity: "users",
      entityId: userId,
      page: "/admin/users",
      changes: [{ field: "user", from: existing.username, to: null }],
      ip: clientIp(request),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
