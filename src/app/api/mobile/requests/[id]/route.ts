import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests } from "@/db/schema";
import { mapMobileRequest } from "@/lib/mobile-public-data";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isSafeInteger(requestId) || requestId <= 0) return Response.json({ message: "الطلب غير موجود" }, { status: 404 });
  const [row] = await db.select().from(bloodRequests).where(and(eq(bloodRequests.id, requestId), eq(bloodRequests.status, "pending")));
  if (!row) return Response.json({ message: "الطلب غير موجود" }, { status: 404 });
  return Response.json({ request: mapMobileRequest(row) });
}
