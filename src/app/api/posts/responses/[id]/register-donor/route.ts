import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postResponses } from "@/db/schema";
import { errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { upsertPostDonor } from "@/lib/donor-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("posts", "publish");
    const { id } = await params;
    const responseId = Number(id);

    if (!Number.isSafeInteger(responseId) || responseId <= 0) {
      return Response.json({ message: "الاستجابة غير موجودة" }, { status: 404 });
    }

    const [postResp] = await db.select().from(postResponses).where(eq(postResponses.id, responseId));
    if (!postResp) {
      return Response.json({ message: "الاستجابة غير موجودة" }, { status: 404 });
    }

    const { donorId, donorCode } = await upsertPostDonor({
      donorName: postResp.donorName,
      donorPhone: postResp.donorPhone,
      bloodType: postResp.bloodType,
      postId: postResp.postId,
      isNearby: postResp.isNearby,
      estimatedArrival: postResp.estimatedArrival,
      notes: postResp.notes,
    });

    // Update response status to registered
    await db
      .update(postResponses)
      .set({
        status: "registered",
        updatedAt: new Date(),
      })
      .where(eq(postResponses.id, responseId));

    await writeAudit({
      user,
      action: "register_donor_arrival",
      entity: "post_responses",
      entityId: responseId,
      page: "/reception/posts",
      changes: [
        { field: "status", from: postResp.status, to: "registered" },
        { field: "donorCode", from: null, to: donorCode },
      ],
    });

    return Response.json({
      success: true,
      message: `تم تحويل المتبرع (${postResp.donorName}) بنجاح بالكود (${donorCode}) إلى قائمة فحص المختبر للفيروسات وسجل المتبرعين`,
      donorId,
      donorCode,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
