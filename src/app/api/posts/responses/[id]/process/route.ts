import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { blacklist, donations, donors, postResponses } from "@/db/schema";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("posts", "publish");
    const { id } = await params;
    const responseId = Number(id);

    if (!Number.isSafeInteger(responseId) || responseId <= 0) {
      return Response.json({ message: "الاستجابة غير موجودة" }, { status: 404 });
    }

    const [postResp] = await db.select().from(postResponses).where(eq(postResponses.id, responseId));
    if (!postResp) {
      return Response.json({ message: "الاستجابة غير موجودة" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const outcome = typeof body.outcome === "string" ? body.outcome : "donated"; // "donated" | "ineligible"

    const donorName = typeof body.donorName === "string" && body.donorName.trim() ? body.donorName.trim() : postResp.donorName;
    const donorPhone = typeof body.donorPhone === "string" && body.donorPhone.trim() ? body.donorPhone.trim() : postResp.donorPhone;
    const bloodType = typeof body.bloodType === "string" && body.bloodType.trim() ? body.bloodType.trim() : postResp.bloodType;

    // Check if a donor record already exists with this phone
    let donorRecord = null;
    if (donorPhone) {
      const [found] = await db.select().from(donors).where(eq(donors.phone, donorPhone));
      donorRecord = found ?? null;
    }

    if (outcome === "donated") {
      const donationDate = typeof body.donationDate === "string" && body.donationDate.trim() ? body.donationDate.trim() : todayISO();
      const quantityMl = typeof body.quantityMl === "number" && body.quantityMl > 0 ? body.quantityMl : 450;
      const vitalSigns = typeof body.vitalSigns === "string" && body.vitalSigns.trim() ? body.vitalSigns.trim() : null;
      const hemoglobin = typeof body.hemoglobin === "number" && !isNaN(body.hemoglobin) ? body.hemoglobin : null;
      const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : "";

      let finalDonorId: number;
      let finalDonorCode: string;

      if (donorRecord) {
        finalDonorId = donorRecord.id;
        finalDonorCode = donorRecord.code;
        await db
          .update(donors)
          .set({
            eligibility: "eligible",
            stage: "waiting_lab",
            status: "waiting_lab",
            donationCount: (donorRecord.donationCount ?? 0) + 1,
            lastDonationDate: donationDate,
            bloodType,
            vitalSigns: vitalSigns ?? donorRecord.vitalSigns,
            hemoglobin: hemoglobin ?? donorRecord.hemoglobin,
            updatedAt: new Date(),
          })
          .where(eq(donors.id, donorRecord.id));
      } else {
        const generatedCode = `DNR-${Math.floor(1000 + Math.random() * 9000)}`;
        finalDonorCode = generatedCode;
        const [newDonor] = await db
          .insert(donors)
          .values({
            code: generatedCode,
            name: donorName,
            age: 26,
            gender: "male",
            phone: donorPhone,
            bloodType,
            initialExam: "fit",
            eligibility: "eligible",
            stage: "waiting_lab",
            status: "waiting_lab",
            donationCount: 1,
            lastDonationDate: donationDate,
            registerDate: donationDate,
            vitalSigns,
            hemoglobin,
          })
          .returning();
        finalDonorId = newDonor.id;
      }

      // Record in donations table
      const [createdDonation] = await db
        .insert(donations)
        .values({
          donorId: finalDonorId,
          donorCode: finalDonorCode,
          donorName,
          bloodType,
          quantityMl,
          donationDate,
          status: "completed",
          handledBy: user.fullName,
          notes: `تبرع عبر استجابة لإعلان منشور #${postResp.postId}${notes ? ` — ${notes}` : ""}`,
        })
        .returning();

      // Update post response
      await db
        .update(postResponses)
        .set({
          status: "donated",
          notes: `${postResp.notes ? `${postResp.notes} | ` : ""}تم اعتماد التبرع (سجل #${createdDonation.id})`,
          updatedAt: new Date(),
        })
        .where(eq(postResponses.id, responseId));

      await writeAudit({
        user,
        action: "create",
        entity: "donations",
        entityId: createdDonation.id,
        page: "/reception/posts",
        ip: clientIp(request),
      });

      return Response.json({
        success: true,
        message: "تم حفظ التبرع بنجاح واعتماد المتبرع في النظام",
        donation: createdDonation,
      });
    }

    if (outcome === "ineligible") {
      const blacklistType = typeof body.blacklistType === "string" ? body.blacklistType : "temporary"; // temporary | final | deferral
      const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "غير لائق صحيًا للتبرع بعد الفحص الأولي";
      const startDate = typeof body.startDate === "string" && body.startDate.trim() ? body.startDate.trim() : todayISO();
      const endDate = typeof body.endDate === "string" && body.endDate.trim() ? body.endDate.trim() : null;
      const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : "";

      let finalDonorId: number | null = null;
      let finalDonorCode = `DNR-R${responseId}`;

      if (donorRecord) {
        finalDonorId = donorRecord.id;
        finalDonorCode = donorRecord.code;
        await db
          .update(donors)
          .set({
            eligibility: "not_eligible",
            stage: "reception",
            status: "reception_rejected",
            ineligibilityReason: reason,
            updatedAt: new Date(),
          })
          .where(eq(donors.id, donorRecord.id));
      } else {
        const [newDonor] = await db
          .insert(donors)
          .values({
            code: finalDonorCode,
            name: donorName,
            age: 26,
            gender: "male",
            phone: donorPhone,
            bloodType,
            initialExam: "unfit",
            eligibility: "not_eligible",
            ineligibilityReason: reason,
            stage: "reception",
            status: "reception_rejected",
            donationCount: 0,
            registerDate: startDate,
          })
          .returning();
        finalDonorId = newDonor.id;
      }

      // Insert into blacklist
      const [createdBlacklist] = await db
        .insert(blacklist)
        .values({
          donorId: finalDonorId,
          donorCode: finalDonorCode,
          donorName,
          type: blacklistType,
          reason,
          startDate,
          endDate,
          notes: `استبعاد وحظر عبر فحص استجابة إعلان #${postResp.postId}${notes ? ` — ${notes}` : ""}`,
        })
        .returning();

      // Update post response
      await db
        .update(postResponses)
        .set({
          status: "cancelled",
          notes: `${postResp.notes ? `${postResp.notes} | ` : ""}غير مؤهل للتبرع — أُضيف للقائمة السوداء: ${reason}`,
          updatedAt: new Date(),
        })
        .where(eq(postResponses.id, responseId));

      await writeAudit({
        user,
        action: "create",
        entity: "blacklist",
        entityId: createdBlacklist.id,
        page: "/reception/posts",
        ip: clientIp(request),
      });

      return Response.json({
        success: true,
        message: "تم تسجيل عدم الأهلية وإضافة المتبرع إلى القائمة السوداء بنجاح",
        blacklist: createdBlacklist,
      });
    }

    return Response.json({ message: "نوع العملية غير معروف" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
