import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { donationPosts } from "@/db/schema";
import { mapMobilePost } from "@/lib/mobile-public-data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isSafeInteger(postId) || postId <= 0) return Response.json({ message: "المنشور غير موجود" }, { status: 404 });
  const [post] = await db.select().from(donationPosts).where(and(eq(donationPosts.id, postId), eq(donationPosts.status, "published")));
  if (!post) return Response.json({ message: "المنشور غير موجود" }, { status: 404 });
  return Response.json({ post: mapMobilePost(post) });
}
