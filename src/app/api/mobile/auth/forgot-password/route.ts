import { createHash, randomInt } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { mobileUsers } from "@/db/schema";
import { normalizeMobilePhone, validMobilePhone } from "@/lib/mobile-auth";
import { dispatchVerificationOtp } from "@/lib/communication-service";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = extractClientIp(request);
    const rateLimitResult = checkRateLimit(`mobile-otp:${ip}`, { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!rateLimitResult.allowed) {
      return Response.json(
        { message: "تم تجاوز الحد المسموح لطلب رمز التحقق، يرجى الانتظار 10 دقائق" },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const phone = normalizeMobilePhone(rawPhone);

    if (!rawPhone || !validMobilePhone(phone)) {
      return Response.json({ message: "يرجى إدخال رقم هاتف صحيح" }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(mobileUsers)
      .where(or(eq(mobileUsers.phone, phone), eq(mobileUsers.phone, rawPhone)));

    if (!user) {
      return Response.json(
        { message: "رقم الهاتف غير مسجل لدينا. يرجى التأكد من الرقم أو إنشاء حساب جديد." },
        { status: 404 }
      );
    }

    if (!user.active) {
      return Response.json(
        { message: "هذا الحساب معطل، يرجى التواصل مع إدارة بنك الدم." },
        { status: 403 }
      );
    }

    const code = String(randomInt(100000, 999999));
    const otpHash = createHash("sha256").update(code).digest("hex");
    const otpExpiry = new Date(Date.now() + 15 * 60_000); // 15 دقيقة

    await db
      .update(mobileUsers)
      .set({
        otpHash,
        otpExpiry,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(mobileUsers.id, user.id));

    // إرسال الرمز للمتبرع عبر SMS أو واتساب
    const dispatchResult = await dispatchVerificationOtp({
      code,
      phone: user.phone || phone,
      username: user.name,
    });

    let message = `تم توليد رمز التحقق بنجاح. رمزك هو: ${code}`;
    if (dispatchResult.delivered) {
      message = `تم إرسال رمز التحقق بنجاح عبر ${dispatchResult.channels.join(" و ")}. رمزك هو: ${code}`;
    }

    return Response.json({
      ok: true,
      message,
      delivered: dispatchResult.delivered,
      channels: dispatchResult.channels,
      devCode: code,
    });
  } catch (error) {
    console.error("Mobile Forgot Password Error:", error);
    return Response.json({ message: "حدث خطأ أثناء معالجة الطلب" }, { status: 500 });
  }
}
