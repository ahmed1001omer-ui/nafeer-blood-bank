import { requireMobileUser } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireMobileUser(request);
  if (!user) return Response.json({ message: "جلسة غير صالحة" }, { status: 401 });
  // There is no persisted notification entity in the current schema.
  return Response.json({ notifications: [] });
}
