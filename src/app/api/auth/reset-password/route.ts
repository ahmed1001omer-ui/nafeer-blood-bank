import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { eq, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    const errors: Record<string, string> = {};
    if (!identifier) errors.identifier = "يرجى إدخال اسم المستخدم أو البريد الإلكتروني أو رقم الهاتف";
    if (!otp) errors.otp = "رمز التحقق مطلوب";
    if (newPassword.length < 6) errors.newPassword = "كلمة المرور الجديدة يجب أن تكون 6 أحرف فأكثر";

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح البيانات المدخلة", errors }, { status: 400 });
    }

    const rawId = identifier.trim();
    const cleanId = rawId.toLowerCase();

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        otpHash: users.otpHash,
        otpExpiry: users.otpExpiry,
      })
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

    if (!user || !user.otpHash || !user.otpExpiry) {
      return Response.json({ message: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
    }

    // التحقق من صلاحية الرمز (تاريخ الانتهاء)
    if (new Date() > new Date(user.otpExpiry)) {
      // إبطال الرمز المنتهي
      await db
        .update(users)
        .set({ otpHash: null, otpExpiry: null })
        .where(eq(users.id, user.id));
      return Response.json({ message: "رمز التحقق منتهي الصلاحية، يرجى طلب رمز جديد" }, { status: 400 });
    }

    // مطابقة الرمز بواسطة bcrypt
    const isValidOtp = await verifyPassword(otp, user.otpHash);
    if (!isValidOtp) {
      return Response.json({ message: "رمز التحقق غير صحيح" }, { status: 400 });
    }

    // تحديث كلمة المرور وإلغاء الرمز المستخدم (Single-use OTP)
    const newPasswordHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        otpHash: null,
        otpExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return Response.json({
      ok: true,
      message: "تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return Response.json({ message: "حدث خطأ أثناء إعادة تعيين كلمة المرور" }, { status: 500 });
  }
}
