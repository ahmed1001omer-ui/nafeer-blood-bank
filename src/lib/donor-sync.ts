import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { donors, postResponses } from "@/db/schema";
import { getPhoneVariants } from "@/lib/mobile-auth";
import { todayISO } from "@/lib/format";

/**
 * Generate a guaranteed collision-free unique donor code.
 * Example: DNR-72819
 */
export async function generateUniqueDonorCode(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const candidate = `DNR-${randomNum}`;
    const [existing] = await db
      .select({ id: donors.id })
      .from(donors)
      .where(eq(donors.code, candidate))
      .limit(1);
    if (!existing) {
      return candidate;
    }
  }
  // Fallback to timestamp-based unique code
  return `DNR-${Date.now().toString().slice(-6)}`;
}

export type UpsertPostDonorParams = {
  donorName: string;
  donorPhone: string;
  bloodType: string;
  postId?: number | string | null;
  isNearby?: string | null;
  estimatedArrival?: string | null;
  notes?: string | null;
};

/**
 * Upsert a donor from a post response into the donors table,
 * placing them in `stage: "waiting_lab"` and `status: "waiting_lab"`
 * so they appear immediately in:
 * 1) Reception Donor Registry (/reception/donors)
 * 2) Laboratory Viral Screening Waiting List (/lab/waiting)
 */
export async function upsertPostDonor(params: UpsertPostDonorParams): Promise<{ donorId: number; donorCode: string }> {
  const { donorName, donorPhone, bloodType, postId, isNearby, estimatedArrival, notes } = params;

  const phoneVariants = getPhoneVariants(donorPhone);
  const existingDonors = await db
    .select()
    .from(donors)
    .where(inArray(donors.phone, phoneVariants));

  const donorRecord = existingDonors[0] ?? null;

  const postIdentifier = postId ? `منشور #${postId}` : "منشور إعلان";
  const postBadgeMeta = `متبرع عبر ${postIdentifier} - ${isNearby || "قريب"}${estimatedArrival ? " - الوصول: " + estimatedArrival : ""}${notes ? " - " + notes : ""}`;

  if (donorRecord) {
    // If the donor exists, ensure they are placed in waiting_lab if they are not permanently banned
    if (donorRecord.status !== "final_banned") {
      await db
        .update(donors)
        .set({
          eligibility: "eligible",
          stage: "waiting_lab",
          status: "waiting_lab",
          bloodType: bloodType || donorRecord.bloodType,
          vitalSigns: `${postBadgeMeta}${donorRecord.vitalSigns ? " | " + donorRecord.vitalSigns : ""}`,
          registerDate: todayISO(),
          updatedAt: new Date(),
        })
        .where(eq(donors.id, donorRecord.id));
    }
    return { donorId: donorRecord.id, donorCode: donorRecord.code };
  }

  // Create new donor
  const newCode = await generateUniqueDonorCode();
  const [newDonor] = await db
    .insert(donors)
    .values({
      code: newCode,
      name: donorName,
      age: 26,
      gender: "male",
      phone: donorPhone,
      bloodType: bloodType || "O+",
      initialExam: "مطابق للشروط",
      eligibility: "eligible",
      stage: "waiting_lab",
      status: "waiting_lab",
      donationCount: 0,
      registerDate: todayISO(),
      vitalSigns: postBadgeMeta,
    })
    .returning();

  return { donorId: newDonor.id, donorCode: newDonor.code };
}

/**
 * Scan all post responses with active status and make sure a corresponding
 * donor record exists in `donors` with `waiting_lab`.
 * This acts as a background guarantee whenever `/api/donors` is read.
 */
export async function syncAllPostResponsesToDonors(): Promise<void> {
  try {
    const pendingResponses = await db
      .select()
      .from(postResponses)
      .where(inArray(postResponses.status, ["registered", "queued", "new"]));

    for (const resp of pendingResponses) {
      if (!resp.donorPhone) continue;
      const phoneVariants = getPhoneVariants(resp.donorPhone);
      const [existing] = await db
        .select({ id: donors.id, stage: donors.stage })
        .from(donors)
        .where(inArray(donors.phone, phoneVariants))
        .limit(1);

      if (!existing) {
        await upsertPostDonor({
          donorName: resp.donorName,
          donorPhone: resp.donorPhone,
          bloodType: resp.bloodType,
          postId: resp.postId,
          isNearby: resp.isNearby,
          estimatedArrival: resp.estimatedArrival,
          notes: resp.notes,
        });
      } else if (existing.stage !== "waiting_lab" && existing.stage !== "completed") {
        await db
          .update(donors)
          .set({
            stage: "waiting_lab",
            status: "waiting_lab",
            eligibility: "eligible",
            updatedAt: new Date(),
          })
          .where(eq(donors.id, existing.id));
      }
    }
  } catch (err) {
    console.error("Error in syncAllPostResponsesToDonors:", err);
  }
}
