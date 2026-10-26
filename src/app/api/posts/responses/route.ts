import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { donationPosts, postResponses } from "@/db/schema";
import { errorResponse, requirePermission } from "@/lib/server-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requirePermission("posts", "view");
    const { searchParams } = new URL(request.url);
    const filterPostId = searchParams.get("postId");
    const filterStatus = searchParams.get("status");

    let query = db
      .select({
        id: postResponses.id,
        postId: postResponses.postId,
        mobileUserId: postResponses.mobileUserId,
        donorName: postResponses.donorName,
        donorPhone: postResponses.donorPhone,
        bloodType: postResponses.bloodType,
        status: postResponses.status,
        isNearby: postResponses.isNearby,
        isSerious: postResponses.isSerious,
        estimatedArrival: postResponses.estimatedArrival,
        notes: postResponses.notes,
        createdAt: postResponses.createdAt,
        hospital: donationPosts.hospital,
        postComponent: donationPosts.component,
      })
      .from(postResponses)
      .leftJoin(donationPosts, eq(postResponses.postId, donationPosts.id))
      .orderBy(desc(postResponses.createdAt), desc(postResponses.id));

    const rows = await query;
    let filtered = rows;

    if (filterPostId) {
      const pid = Number(filterPostId);
      if (pid > 0) filtered = filtered.filter((r) => r.postId === pid);
    }
    if (filterStatus) {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    return Response.json({ responses: filtered });
  } catch (error) {
    return errorResponse(error);
  }
}
