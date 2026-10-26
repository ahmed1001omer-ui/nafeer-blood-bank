import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { donations, donors, postResponses } from "@/db/schema";
import { getDonorProfileAndEligibility, getPhoneVariants, requireMobileUser } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireMobileUser(request);
  if (!user) return Response.json({ message: "جلسة غير صالحة" }, { status: 401 });

  const phoneVariants = getPhoneVariants(user.phone);

  // Also include any phones from post responses by this mobile user
  const userResponses = await db
    .select({ phone: postResponses.donorPhone })
    .from(postResponses)
    .where(inArray(postResponses.mobileUserId, [user.id]));
  for (const resp of userResponses) {
    if (resp.phone) {
      for (const v of getPhoneVariants(resp.phone)) {
        if (!phoneVariants.includes(v)) phoneVariants.push(v);
      }
    }
  }

  const donorRows = await db
    .select({ id: donors.id, code: donors.code })
    .from(donors)
    .where(inArray(donors.phone, phoneVariants));
  const donorIds = donorRows.map((row) => row.id);

  const rows = donorIds.length
    ? await db
        .select()
        .from(donations)
        .where(inArray(donations.donorId, donorIds))
        .orderBy(desc(donations.donationDate), desc(donations.id))
    : [];

  const profile = await getDonorProfileAndEligibility(user.phone);

  const completed = rows.filter((row) => row.status === "completed");
  const lastDonation = profile.lastDonationDate ?? (completed[0]?.donationDate ?? null);

  return Response.json({
    donations: rows.map((row) => ({
      id: String(row.id),
      date: row.donationDate,
      units: 1,
      quantityMl: row.quantityMl,
      bloodType: row.bloodType,
      status: row.status,
      notes: row.notes,
      handledBy: row.handledBy,
    })),
    summary: {
      count: completed.length,
      totalMl: completed.reduce((total, row) => total + row.quantityMl, 0),
      lastDonation,
      nextDonationDate: profile.nextDonationDate,
    },
    eligibility: profile.eligibility,
  });
}

