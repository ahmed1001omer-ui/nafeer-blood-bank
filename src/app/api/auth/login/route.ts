import { authenticate, createSession } from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/server-guard";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";
import { isInternetAvailable } from "@/lib/network";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // التحقق الإلزامي من توفر اتصال بالإنترنت للتحقق الأمني من الخادم
  const online = await isInternetAvailable(2500);
  if (!online) {
    return Response.json(
      {
        ok: false,
        online: false,
        requiresInternet: true,
        message: "يتطلب تسجيل الدخول توفر اتصال نشط بالإنترنت للتحقق الأمني من بيانات الاعتماد لدى الخادم المركزي. يرجى الاتصال بالإنترنت والمحاولة مجدداً.",
      },
      { status: 400 }
    );
  }

  const ip = extractClientIp(request);
  const rateLimitResult = checkRateLimit(`login:${ip}`, { limit: 10, windowMs: 60 * 1000 });
  if (!rateLimitResult.allowed) {
    return Response.json(
      { message: "تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول، يرجى المحاولة بعد دقيقة" },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;

  const errors: Record<string, string> = {};
  if (!username) errors.username = "يرجى إدخال اسم المستخدم";
  if (!password) errors.password = "يرجى إدخال كلمة المرور";
  if (Object.keys(errors).length > 0) {
    return Response.json({ message: "بيانات ناقصة", errors }, { status: 400 });
  }

  const user = await authenticate(username, password);
  if (!user) {
    return Response.json(
      { message: "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب معطّل" },
      { status: 401 },
    );
  }

  await createSession(user, remember);
  await writeAudit({ user, action: "login", entity: "auth", page: "/login", ip: clientIp(request) });

  return Response.json({ user });
}
