import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests } from "@/db/schema";
import { mapMobileRequest, pageWindow } from "@/lib/mobile-public-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { limit, offset } = pageWindow(searchParams);
  const rows = await db.select().from(bloodRequests).where(eq(bloodRequests.status, "pending"))
    .orderBy(desc(bloodRequests.priority), desc(bloodRequests.requestDate), desc(bloodRequests.id)).limit(limit + 1).offset(offset);
  const hasMore = rows.length > limit;
  return Response.json({ requests: rows.slice(0, limit).map(mapMobileRequest), pagination: { limit, offset, hasMore, nextOffset: hasMore ? offset + limit : null } });
}
