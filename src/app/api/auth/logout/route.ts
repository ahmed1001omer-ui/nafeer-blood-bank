import { destroySession, getSession } from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/server-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (session) {
    await writeAudit({ user: session, action: "logout", entity: "auth", page: "/", ip: clientIp(request) });
  }
  await destroySession();
  return Response.json({ ok: true });
}
