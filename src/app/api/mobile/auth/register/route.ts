import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mobileUsers } from "@/db/schema";
import { BLOOD_TYPES } from "@/lib/constants";
import { createMobileToken, mobileUserResponse, normalizeMobilePhone, validMobilePhone } from "@/lib/mobile-auth";
import { isDuplicateError } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = normalizeMobilePhone(typeof body.phone === "string" ? body.phone : "");
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const bloodType = typeof body.bloodType === "string" ? body.bloodType : "";
  const password = typeof body.password === "string" ? body.password : "";
  const errors: Record<string, string> = {};

  if (name.length < 2 || name.length > 120) errors.name = "أدخل اسمًا صحيحًا";
  if (!validMobilePhone(phone)) errors.phone = "أدخل رقم هاتف صحيحًا";
  if (city.length < 2 || city.length > 100) errors.city = "أدخل المدينة";
  if (!BLOOD_TYPES.includes(bloodType as (typeof BLOOD_TYPES)[number])) errors.bloodType = "فصيلة الدم غير صحيحة";
  if (password.length < 8 || password.length > 128) errors.password = "كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا";
  if (Object.keys(errors).length) return Response.json({ message: "يرجى تصحيح البيانات", errors }, { status: 400 });

  const [existing] = await db.select({ id: mobileUsers.id }).from(mobileUsers).where(eq(mobileUsers.phone, phone));
  if (existing) return Response.json({ message: "رقم الهاتف مسجل مسبقًا", errors: { phone: "رقم الهاتف مسجل مسبقًا" } }, { status: 409 });

  try {
    const [user] = await db.insert(mobileUsers).values({
      name, phone, city, bloodType, passwordHash: await bcrypt.hash(password, 12),
    }).returning();
    return Response.json({ user: mobileUserResponse(user), token: await createMobileToken(user.id) }, { status: 201 });
  } catch (error) {
    if (isDuplicateError(error)) return Response.json({ message: "رقم الهاتف مسجل مسبقًا", errors: { phone: "رقم الهاتف مسجل مسبقًا" } }, { status: 409 });
    console.error("Mobile registration failed", error);
    return Response.json({ message: "تعذر إنشاء الحساب حاليًا" }, { status: 500 });
  }
}
