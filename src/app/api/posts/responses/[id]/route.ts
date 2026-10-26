import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postResponses } from "@/db/schema";
import { diffChanges, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["queued", "new", "reviewed", "contacted", "registered", "donated", "cancelled"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("posts", "publish");
    const { id } = await params;
    const responseId = Number(id);

    if (!Number.isSafeInteger(responseId) || responseId <= 0) {
      return Response.json({ message: "الاستجابة غير موجودة" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as { status?: string; notes?: string };
    const { status, notes } = body;

    if (status && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return Response.json(
        { message: `حالة غير صالحة. الحالات المسموحة: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const [existing] = await db.select().from(postResponses).where(eq(postResponses.id, responseId));
    if (!existing) {
      return Response.json({ message: "الاستجابة غير موجودة" }, { status: 404 });
    }

    const updatePayload: Partial<typeof postResponses.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (status) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;

    const [updated] = await db
      .update(postResponses)
      .set(updatePayload)
      .where(eq(postResponses.id, responseId))
      .returning();

    await writeAudit({
      user,
      action: "update",
      entity: "post_responses",
      entityId: responseId,
      page: "/reception/posts",
      changes: diffChanges(existing as Record<string, unknown>, updated as Record<string, unknown>, ["status", "notes"]),
    });

    return Response.json({ success: true, response: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
