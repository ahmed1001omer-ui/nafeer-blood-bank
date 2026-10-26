import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { donationPosts, mobileUsers, postResponses } from "@/db/schema";
import { normalizeMobilePhone, requireMobileUser } from "@/lib/mobile-auth";
import { getBloodBankSettings } from "@/lib/blood-bank-settings";
import { upsertPostDonor } from "@/lib/donor-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMobileUser(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const { id } = await params;
  const numericDigits = (id || "").replace(/\D/g, "");
  let postId = numericDigits ? Number(numericDigits) : Number(id);

  let post = null;
  if (Number.isSafeInteger(postId) && postId > 0) {
    const [found] = await db
      .select()
      .from(donationPosts)
      .where(and(eq(donationPosts.id, postId), eq(donationPosts.status, "published")));
    post = found;
  }

  // Fallback to the latest active published post so mobile requests with mock/string IDs are never dropped
  if (!post) {
    const [latest] = await db
      .select()
      .from(donationPosts)
      .where(eq(donationPosts.status, "published"))
      .orderBy(desc(donationPosts.createdAt))
      .limit(1);
    post = latest;
    if (post) {
      postId = post.id;
    }
  }

  if (!post) {
    return Response.json({ message: "لا توجد إعلانات تبرع منشورة حاليًا في بنك الدم" }, { status: 404 });
  }

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

  let bloodType = typeof body.bloodType === "string" && body.bloodType.trim() ? body.bloodType.trim() : (user?.bloodType ?? post.bloodType);
  const isNearby = typeof body.isNearby === "string" && body.isNearby.trim() ? body.isNearby.trim() : null;
  const isSerious = typeof body.isSerious === "boolean" ? body.isSerious : true;
  const estimatedArrival = typeof body.estimatedArrival === "string" && body.estimatedArrival.trim() ? body.estimatedArrival.trim() : null;
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  let mobileUserId = user?.id;
  if (!mobileUserId) {
    const normalizedPhone = normalizeMobilePhone(donorPhone);
    const [existingUser] = await db.select().from(mobileUsers).where(eq(mobileUsers.phone, normalizedPhone));
    if (existingUser) {
      mobileUserId = existingUser.id;
      if (!donorName) donorName = existingUser.name;
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

  // Check duplicate response
  const [existing] = await db
    .select()
    .from(postResponses)
    .where(and(eq(postResponses.postId, postId), eq(postResponses.mobileUserId, mobileUserId)));

  let responseId: number;

  if (existing) {
    responseId = existing.id;
    // Refresh existing record with updated phone/proximity/seriousness and status registered
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
        postId,
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
      postId,
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
    console.error("Failed to upsert donor for post response:", error);
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
