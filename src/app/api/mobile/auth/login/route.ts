import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mobileUsers } from "@/db/schema";
import { createMobileToken, mobileUserResponse, normalizeMobilePhone, validMobilePhone } from "@/lib/mobile-auth";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = extractClientIp(request);
  const rateLimitResult = checkRateLimit(`mobile-login:${ip}`, { limit: 10, windowMs: 60 * 1000 });
  if (!rateLimitResult.allowed) {
    return Response.json(
      { message: "تم تجاوز الحد الأقصى للمحاولات، يرجى المحاولة بعد قليل" },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const phone = normalizeMobilePhone(typeof body.phone === "string" ? body.phone : "");
  const password = typeof body.password === "string" ? body.password : "";
  if (!validMobilePhone(phone) || !password) return Response.json({ message: "رقم الهاتف أو كلمة المرور غير صحيحة" }, { status: 401 });

  const [user] = await db.select().from(mobileUsers).where(eq(mobileUsers.phone, phone));
  if (!user?.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ message: "رقم الهاتف أو كلمة المرور غير صحيحة" }, { status: 401 });
  }
  return Response.json({ user: mobileUserResponse(user), token: await createMobileToken(user.id) });
}
