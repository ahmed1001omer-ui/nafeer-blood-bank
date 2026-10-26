import { isInternetAvailable } from "@/lib/network";

export const dynamic = "force-dynamic";

export async function GET() {
  const online = await isInternetAvailable(2000);
  return Response.json({
    online,
    mode: online ? "online" : "offline",
    timestamp: Date.now(),
  });
}
