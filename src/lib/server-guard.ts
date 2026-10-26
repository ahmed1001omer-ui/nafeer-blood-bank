import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { getSession, type SessionUser } from "./auth";
import { can } from "./rbac";

export class HttpError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

/** يضمن وجود جلسة، وإلا يرمي 401 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "يجب تسجيل الدخول للمتابعة");
  return session;
}

/** يضمن الجلسة + صلاحية محددة، وإلا 401/403 */
export async function requirePermission(resource: string, action: string): Promise<SessionUser> {
  const session = await requireSession();
  if (!can(session.permissions, resource, action)) {
    throw new HttpError(403, "ليس لديك صلاحية لتنفيذ هذه العملية");
  }
  return session;
}

/** يحوّل أخطاء HttpError إلى استجابة JSON موحّدة */
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json({ message: error.message, errors: error.errors ?? {} }, { status: error.status });
  }
  console.error(error);
  return Response.json({ message: "حدث خطأ غير متوقع في الخادم" }, { status: 500 });
}

export type AuditChange = { field: string; from: unknown; to: unknown };

export async function writeAudit(params: {
  user: SessionUser;
  action: string;
  entity: string;
  entityId?: string | number | null;
  page?: string;
  changes?: AuditChange[];
  ip?: string | null;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.user.id,
      username: params.user.username,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId != null ? String(params.entityId) : null,
      page: params.page ?? null,
      changes: params.changes ?? null,
      ip: params.ip ?? null,
    });
  } catch (error) {
    console.error("audit write failed", error);
  }
}

/** يحسب الفروق بين سجلين لتخزينها في الـ Audit Log */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): AuditChange[] {
  const changes: AuditChange[] = [];
  for (const field of fields) {
    const from = before[field];
    const to = after[field];
    if (from !== to && !(from == null && to == null)) {
      changes.push({ field, from: from ?? null, to: to ?? null });
    }
  }
  return changes;
}

export function clientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}
