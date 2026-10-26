import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { errorResponse, requirePermission } from "@/lib/server-guard";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("audit", "view");
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(500);
    return Response.json({ logs: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
