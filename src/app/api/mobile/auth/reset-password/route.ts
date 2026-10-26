import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { mobileUsers } from "@/db/schema";
import { normalizeMobilePhone, validMobilePhone } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const phone = normalizeMobilePhone(rawPhone);
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!rawPhone || !validMobilePhone(phone)) {
      return Response.json({ ok: false, message: "يرجى إدخال رقم هاتف صحيح" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(otp)) {
      return Response.json({ ok: false, message: "رمز التحقق يجب أن يتكون من 6 أرقام" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return Response.json({ ok: false, message: "كلمة المرور يجب أن تكون 6 أحرف فأكثر" }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(mobileUsers)
      .where(or(eq(mobileUsers.phone, phone), eq(mobileUsers.phone, rawPhone)));

    if (!user || !user.active || !user.otpHash || !user.otpExpiry) {
      return Response.json(
        { ok: false, message: "رمز التحقق غير صحيح أو غير موجود. يرجى طلب رمز جديد." },
        { status: 400 }
      );
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      return Response.json(
        { ok: false, message: "انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد." },
        { status: 400 }
      );
    }

    if (user.otpAttempts >= 5) {
      return Response.json(
        { ok: false, message: "تم تجاوز الحد الأقصى للمحاولات (5 محاولات). يرجى طلب رمز جديد." },
        { status: 400 }
      );
    }

    const expected = Buffer.from(user.otpHash, "hex");
    const supplied = Buffer.from(createHash("sha256").update(otp).digest("hex"), "hex");

    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      await db
        .update(mobileUsers)
        .set({ otpAttempts: user.otpAttempts + 1 })
        .where(eq(mobileUsers.id, user.id));
      return Response.json({ ok: false, message: "رمز التحقق غير صحيح" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(mobileUsers)
      .set({
        passwordHash,
        otpHash: null,
        otpExpiry: null,
        otpAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(mobileUsers.id, user.id));

    return Response.json({ ok: true, message: "تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول." });
  } catch (error) {
    console.error("Mobile Reset Password Error:", error);
    return Response.json({ ok: false, message: "حدث خطأ غير متوقع أثناء تحديث كلمة المرور" }, { status: 500 });
  }
}
