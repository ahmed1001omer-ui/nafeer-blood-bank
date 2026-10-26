import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mobileUsers } from "@/db/schema";
import { BLOOD_TYPES } from "@/lib/constants";
import { getDonorProfileAndEligibility, mobileUserResponse, requireMobileUser } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireMobileUser(request);
  if (!user) return Response.json({ message: "جلسة غير صالحة" }, { status: 401 });
  const profile = await getDonorProfileAndEligibility(user.phone);
  return Response.json({
    user: mobileUserResponse(user, {
      lastDonation: profile.lastDonationDate,
      nextDonationDate: profile.nextDonationDate,
      eligibility: profile.eligibility,
    }),
  });
}

export async function PUT(request: Request) {
  const user = await requireMobileUser(request);
  if (!user) return Response.json({ message: "جلسة غير صالحة" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const bloodType = typeof body.bloodType === "string" ? body.bloodType : "";
  const errors: Record<string, string> = {};
  if (name.length < 2 || name.length > 120) errors.name = "أدخل اسمًا صحيحًا";
  if (city.length < 2 || city.length > 100) errors.city = "أدخل المدينة";
  if (!BLOOD_TYPES.includes(bloodType as (typeof BLOOD_TYPES)[number])) errors.bloodType = "فصيلة الدم غير صحيحة";
  if (Object.keys(errors).length) return Response.json({ message: "يرجى تصحيح البيانات", errors }, { status: 400 });
  const [updated] = await db.update(mobileUsers).set({ name, city, bloodType, updatedAt: new Date() })
    .where(eq(mobileUsers.id, user.id)).returning();
  const profile = await getDonorProfileAndEligibility(updated.phone);
  return Response.json({
    user: mobileUserResponse(updated, {
      lastDonation: profile.lastDonationDate,
      nextDonationDate: profile.nextDonationDate,
      eligibility: profile.eligibility,
    }),
  });
}
