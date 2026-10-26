import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { donationPosts } from "@/db/schema";
import { mapMobilePost, pageWindow } from "@/lib/mobile-public-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { limit, offset } = pageWindow(searchParams);
  const rows = await db.select().from(donationPosts).where(eq(donationPosts.status, "published"))
    .orderBy(desc(donationPosts.publishDate), desc(donationPosts.id)).limit(limit + 1).offset(offset);
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit).map(mapMobilePost);
  return Response.json({ posts, pagination: { limit, offset, hasMore, nextOffset: hasMore ? offset + limit : null } });
}
