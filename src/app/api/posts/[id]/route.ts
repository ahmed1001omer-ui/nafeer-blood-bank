import { eq } from "drizzle-orm";
import { db } from "@/db";
import { donationPosts, postResponses } from "@/db/schema";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("posts", "publish");
    const { id } = await params;
    const postId = Number(id);

    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return Response.json({ message: "المنشور غير موجود" }, { status: 404 });
    }

    const [post] = await db.select().from(donationPosts).where(eq(donationPosts.id, postId));
    if (!post) {
      return Response.json({ message: "المنشور غير موجود" }, { status: 404 });
    }

    // Delete associated post responses so there are no dangling records
    await db.delete(postResponses).where(eq(postResponses.postId, postId));

    // Delete the post
    await db.delete(donationPosts).where(eq(donationPosts.id, postId));

    await writeAudit({
      user,
      action: "delete",
      entity: "donation_posts",
      entityId: postId,
      page: "/reception/posts",
      ip: clientIp(request),
    });

    return Response.json({
      success: true,
      message: "تم حذف المنشور وإزالته من لوحة الإدارة وتطبيق المتبرعين بنجاح",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("posts", "publish");
    const { id } = await params;
    const postId = Number(id);

    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return Response.json({ message: "المنشور غير موجود" }, { status: 404 });
    }

    const [post] = await db.select().from(donationPosts).where(eq(donationPosts.id, postId));
    if (!post) {
      return Response.json({ message: "المنشور غير موجود" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Partial<typeof donationPosts.$inferInsert> = {};

    if (typeof body.status === "string" && ["published", "cancelled", "completed"].includes(body.status)) {
      updates.status = body.status;
    }
    if (typeof body.notes === "string") {
      updates.notes = body.notes;
    }
    if (typeof body.unitsNeeded === "number" && body.unitsNeeded > 0) {
      updates.unitsNeeded = body.unitsNeeded;
    }

    const [updated] = await db
      .update(donationPosts)
      .set(updates)
      .where(eq(donationPosts.id, postId))
      .returning();

    await writeAudit({
      user,
      action: "update",
      entity: "donation_posts",
      entityId: postId,
      page: "/reception/posts",
      changes: Object.entries(updates).map(([field, val]) => ({
        field,
        from: (post as Record<string, unknown>)[field],
        to: val,
      })),
      ip: clientIp(request),
    });

    return Response.json({
      success: true,
      message: "تم تحديث المنشور بنجاح",
      post: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
