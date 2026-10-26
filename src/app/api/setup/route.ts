import { db } from "@/db";
import { systemSettings, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { BLOOD_BANK_SETTINGS_KEY } from "@/lib/blood-bank-settings";
import { ALL_PERMISSIONS } from "@/lib/rbac";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const adminCount = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));

    return Response.json({
      setupRequired: adminCount.length === 0,
    });
  } catch (error) {
    console.error("Setup GET error:", error);
    return Response.json({ setupRequired: false, error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminCount = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));

    if (adminCount.length > 0) {
      return Response.json(
        { message: "تم إعداد مدير النظام بالفعل. هذه الصفحة مقفلة." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    // Institution settings
    const bloodBankName = typeof body.bloodBankName === "string" ? body.bloodBankName.trim() : "";
    const hospitalName = typeof body.hospitalName === "string" ? body.hospitalName.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const bankPhone = typeof body.bankPhone === "string" ? body.bankPhone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";

    const errors: Record<string, string> = {};
    if (!username) errors.username = "اسم المستخدم مطلوب";
    if (!fullName) errors.fullName = "الاسم الكامل مطلوب";
    if (password.length < 6) errors.password = "كلمة المرور يجب أن تكون 6 أحرف فأكثر";
    if (!bloodBankName) errors.bloodBankName = "اسم بنك الدم مطلوب";
    if (!hospitalName) errors.hospitalName = "اسم المستشفى / المؤسسة الصحية مطلوب";

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح البيانات", errors }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({
        username,
        fullName,
        passwordHash,
        role: "admin",
        permissions: ALL_PERMISSIONS,
        active: true,
        email: email || null,
        phone: phone || null,
      })
      .returning({ id: users.id, username: users.username });

    const bankSettings = {
      name: bloodBankName || "بنك الدم المركزي",
      hospitalName: hospitalName || "المستشفى المركزي",
      city: city || "الخرطوم",
      phone: bankPhone || phone || "0912345678",
      address: address || "المجمع الطبي الرئيسي",
    };

    await db
      .insert(systemSettings)
      .values({
        key: BLOOD_BANK_SETTINGS_KEY,
        value: bankSettings,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: bankSettings, updatedAt: new Date() },
      });

    return Response.json({ success: true, user: created }, { status: 201 });
  } catch (error) {
    console.error("Setup POST error:", error);
    return Response.json({ message: "حدث خطأ أثناء إنشاء الحساب" }, { status: 500 });
  }
}
