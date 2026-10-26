import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { dispatchVerificationOtp } from "@/lib/communication-service";
import { checkRateLimit, extractClientIp } from "@/lib/rate-limit";
import { isInternetAvailable } from "@/lib/network";
import { eq, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = extractClientIp(request);
    const rateLimitResult = checkRateLimit(`otp:${ip}`, { limit: 10, windowMs: 10 * 60 * 1000 });
    if (!rateLimitResult.allowed) {
      return Response.json(
        { ok: false, message: "تم تجاوز الحد المسموح لطلب رمز التحقق، يرجى الانتظار قليلاً" },
        { status: 429 }
      );
    }

    // شرط إلزامي: توفر اتصال بالإنترنت لإرسال رمز التحقق أونلاين
    const online = await isInternetAvailable(2500);
    if (!online) {
      return Response.json(
        {
          ok: false,
          online: false,
          requiresInternet: true,
          message: "يتطلب إرسال رمز التحقق توفر اتصال نشط بالإنترنت لتسليمه بأمان إلى بريدك الإلكتروني أو هاتفك المسجل. يرجى الاتصال بالإنترنت والمحاولة مجدداً.",
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";

    if (!identifier) {
      return Response.json({ message: "يرجى إدخال اسم المستخدم أو البريد الإلكتروني أو رقم الهاتف" }, { status: 400 });
    }

    const rawId = identifier.trim();
    const cleanId = rawId.toLowerCase();

    const [user] = await db
      .select({ id: users.id, email: users.email, phone: users.phone, username: users.username })
      .from(users)
      .where(
        or(
          sql`LOWER(${users.email}) = ${cleanId}`,
          sql`LOWER(${users.username}) = ${cleanId}`,
          eq(users.email, rawId),
          eq(users.username, rawId),
          eq(users.phone, rawId)
        )
      );

    if (!user) {
      return Response.json({
        ok: false,
        message: "لم يتم العثور على حساب بهذه البيانات. يرجى التأكد من اسم المستخدم أو البريد المسجل.",
      }, { status: 404 });
    }

    // توليد رمز OTP مكون من 6 أرقام
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await hashPassword(otp);
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // صلاحية 15 دقيقة

    await db
      .update(users)
      .set({
        otpHash,
        otpExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log(`[AUTH OTP ONLINE] OTP generated for user @${user.username}: ${otp}`);

    // إرسال الرمز عبر القنوات الخارجية أونلاين (البريد الإلكتروني / SMS / واتساب)
    const dispatchResult = await dispatchVerificationOtp({
      code: otp,
      email: user.email,
      phone: user.phone,
      username: user.username,
    });

    let message = "";
    if (dispatchResult.delivered) {
      message = `تم إرسال رمز التحقق بنجاح عبر الإنترنت إلى ${dispatchResult.channels.join(" و ")}. يرجى مراجعة رسائلك وإدخال الرمز لتأكيد الحساب.`;
    } else {
      message = `تم تأكيد الاتصال بالإنترنت وتوليد رمز التحقق للحساب. يرجى التأكد من تفعيل بوابات SMTP أو SMS في الإعدادات للتسليم الفعلي.`;
    }

    return Response.json({
      ok: true,
      online: true,
      delivered: dispatchResult.delivered,
      channels: dispatchResult.channels,
      message,
      // في حال لم يتم إعداد بوابة SMS/SMTP حقيقية، نتيح الرمز للدعم التجريبي فقط إذا تعذر التسليم الخارجي
      devCode: dispatchResult.delivered ? undefined : otp,
      username: user.username,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return Response.json({ message: "حدث خطأ غير متوقع أثناء معالجة الطلب" }, { status: 500 });
  }
}
