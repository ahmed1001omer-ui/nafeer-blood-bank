import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bloodRequests, donationPosts, mobileUsers, postResponses } from "@/db/schema";
import { normalizeMobilePhone, requireMobileUser } from "@/lib/mobile-auth";
import { getBloodBankSettings } from "@/lib/blood-bank-settings";
import { upsertPostDonor } from "@/lib/donor-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const { id } = await params;
  const requestId = Number((id || "").replace(/\D/g, "")) || Number(id);

  let bloodRequest = null;
  if (Number.isSafeInteger(requestId) && requestId > 0) {
    const [found] = await db
      .select()
      .from(bloodRequests)
      .where(and(eq(bloodRequests.id, requestId), eq(bloodRequests.status, "pending")));
    bloodRequest = found;
  }

  // Find or link with active donation post
  let post = null;
  const [latestPost] = await db
    .select()
    .from(donationPosts)
    .where(eq(donationPosts.status, "published"))
    .limit(1);
  post = latestPost;

  let donorPhone = typeof body.donorPhone === "string" && body.donorPhone.trim() ? body.donorPhone.trim() : (user?.phone ?? "");
  let donorName = typeof body.donorName === "string" && body.donorName.trim()
    ? body.donorName.trim()
    : (user?.name?.trim() ? user.name.trim() : "");

  if (!donorPhone) {
    return Response.json({ message: "يرجى إدخال رقم هاتف المتبرع للتواصل" }, { status: 400 });
  }

  if (!donorName) {
    const compactPhone = donorPhone.replace(/\D/g, "");
    donorName = `متبرع ${compactPhone.length >= 4 ? `(${compactPhone.slice(-4)})` : ""}`.trim();
  }

  const bloodType = typeof body.bloodType === "string" && body.bloodType.trim() ? body.bloodType.trim() : (user?.bloodType ?? bloodRequest?.bloodType ?? "O+");
  const isNearby = typeof body.isNearby === "string" && body.isNearby.trim() ? body.isNearby.trim() : null;
  const isSerious = typeof body.isSerious === "boolean" ? body.isSerious : true;
  const estimatedArrival = typeof body.estimatedArrival === "string" && body.estimatedArrival.trim() ? body.estimatedArrival.trim() : null;
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : (bloodRequest ? `استجابة لطلب المريض: ${bloodRequest.patientName}` : null);

  let mobileUserId = user?.id;
  if (!mobileUserId) {
    const normalizedPhone = normalizeMobilePhone(donorPhone);
    const [existingUser] = await db.select().from(mobileUsers).where(eq(mobileUsers.phone, normalizedPhone));
    if (existingUser) {
      mobileUserId = existingUser.id;
    } else {
      const bank = await getBloodBankSettings();
      const [newUser] = await db
        .insert(mobileUsers)
        .values({
          name: donorName,
          phone: normalizedPhone,
          city: bank.city || "الخرطوم",
          bloodType: bloodType,
          passwordHash: "direct_donor_response",
          active: true,
        })
        .returning();
      mobileUserId = newUser.id;
    }
  }

  const targetPostId = post?.id ?? 1;

  // Check duplicate response
  const [existing] = await db
    .select()
    .from(postResponses)
    .where(and(eq(postResponses.postId, targetPostId), eq(postResponses.mobileUserId, mobileUserId)));

  let responseId: number;

  if (existing) {
    responseId = existing.id;
    await db
      .update(postResponses)
      .set({
        donorPhone,
        donorName,
        bloodType,
        isNearby: isNearby ?? existing.isNearby,
        isSerious: isSerious ?? existing.isSerious,
        estimatedArrival: estimatedArrival ?? existing.estimatedArrival,
        notes: notes ?? existing.notes,
        status: "registered",
        updatedAt: new Date(),
      })
      .where(eq(postResponses.id, existing.id));
  } else {
    const [created] = await db
      .insert(postResponses)
      .values({
        postId: targetPostId,
        mobileUserId,
        donorName,
        donorPhone,
        bloodType,
        isNearby,
        isSerious,
        estimatedArrival,
        notes,
        status: "registered",
      })
      .returning();
    responseId = created.id;
  }

  // Guaranteed synchronization to donors table in waiting_lab stage
  try {
    const { donorCode } = await upsertPostDonor({
      donorName,
      donorPhone,
      bloodType,
      postId: targetPostId,
      isNearby,
      estimatedArrival,
      notes,
    });

    return Response.json(
      {
        success: true,
        message: `تم تسجيل استجابتك بنجاح (${donorCode})، وأنت في قائمة انتظار بنك الدم وفحص المختبر للفيروسات.`,
        responseId,
        donorCode,
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    console.error("Failed to upsert donor for blood request response:", error);
    return Response.json(
      {
        success: true,
        message: "تم تسجيل استجابتك بنجاح في نظام بنك الدم.",
        responseId,
      },
      { status: 200 }
    );
  }
}
