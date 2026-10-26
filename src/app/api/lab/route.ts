import { db } from "@/db";
import { requireDate, requireOption, requireText, optionalText } from "@/lib/validation";
import {
  FINAL_POSITIVE_TESTS,
  LAB_DECISIONS,
  TEMP_POSITIVE_TESTS,
} from "@/lib/constants";
import { desc, eq, inArray } from "drizzle-orm";
import { blacklist, donations, donors, labTests, postResponses } from "@/db/schema";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { todayISO } from "@/lib/format";
import { getPhoneVariants } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

const allowedDecisions = LAB_DECISIONS.map((item) => item.value);

export async function GET() {
  try {
    await requirePermission("lab", "view");
    const rows = await db.select().from(labTests).orderBy(desc(labTests.id));
    return Response.json({ labTests: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("lab", "approve");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const donorId = Number(body.donorId);
    if (!Number.isFinite(donorId)) {
      return Response.json({ message: "معرّف المتبرع غير صحيح" }, { status: 400 });
    }

    const [donor] = await db.select().from(donors).where(eq(donors.id, donorId));
    if (!donor) {
      return Response.json({ message: "المتبرع غير موجود" }, { status: 404 });
    }

  const testKeys = ["hiv", "hepatitisB", "hepatitisC", "htlv", "syphilis", "malaria"] as const;
  const tests: Record<string, string> = {};
  for (const key of testKeys) {
    tests[key] = requireOption(errors, key, body[key], "نتيجة الفحص", ["negative", "positive", "indeterminate", "not_tested"]);
  }

  let decision = requireOption(errors, "decision", body.decision, "القرار النهائي", allowedDecisions);

  // قواعد العمل: الفيروسات الخطيرة تعني حظرًا نهائيًا تلقائيًا
  const positiveFinal = FINAL_POSITIVE_TESTS.filter((key) => tests[key] === "positive");
  const positiveTemp = TEMP_POSITIVE_TESTS.filter((key) => tests[key] === "positive");

  if (positiveFinal.length > 0) {
    decision = "final_banned";
  } else if (positiveTemp.length > 0 && decision === "eligible") {
    decision = "temp_banned";
  }

  let reason = optionalText(body.reason);
  let startDate = body.startDate ? requireDate(errors, "startDate", body.startDate, "تاريخ البداية") : null;
  let endDate = body.endDate ? requireDate(errors, "endDate", body.endDate, "تاريخ الانتهاء") : null;
  const notes = optionalText(body.notes);

  if (decision !== "eligible") {
    // السبب مطلوب لكنه قابل للتخصيص (القوائم القياسية تُقترح في الواجهة وتبقى السياسة قابلة للتعديل)
    reason = requireText(errors, "reason", body.reason, "سبب الحظر");
    startDate = requireDate(errors, "startDate", body.startDate ?? startDate, "تاريخ بداية الحظر");
    if (decision !== "final_banned") {
      endDate = requireDate(errors, "endDate", body.endDate ?? endDate, "تاريخ انتهاء الحظر");
      // تحقق: نهاية الحظر لا تكون قبل بدايته
      if (startDate && endDate && endDate < startDate) {
        errors.endDate = "تاريخ انتهاء الحظر لا يمكن أن يكون قبل تاريخ البداية";
      }
    } else {
      endDate = optionalText(body.endDate);
    }
  } else {
    reason = optionalText(body.reason);
    startDate = optionalText(body.startDate);
    endDate = optionalText(body.endDate);
  }

  if (Object.keys(errors).length > 0) {
    return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
  }

  const [createdTest] = await db
    .insert(labTests)
    .values({
      donorId: donor.id,
      donorCode: donor.code,
      donorName: donor.name,
      hiv: tests.hiv,
      hepatitisB: tests.hepatitisB,
      hepatitisC: tests.hepatitisC,
      htlv: tests.htlv,
      syphilis: tests.syphilis,
      malaria: tests.malaria,
      decision,
      approved: true,
      reason,
      startDate,
      endDate,
      notes,
      testedBy: user.fullName,
    })
    .returning();

  const statusMap: Record<string, string> = {
    eligible: "eligible",
    temp_banned: "temp_banned",
    final_banned: "final_banned",
    deferred: "deferred",
  };

  await db
    .update(donors)
    .set({ status: statusMap[decision], stage: "completed", updatedAt: new Date() })
    .where(eq(donors.id, donor.id));

  if (decision === "eligible") {
    // المتبرع المؤهل يُسجَّل له تبرع مكتمل ويُحدَّث عداد تبرعاته
    const labDonationNote = notes || "تم الفحص المخبري وسحب عينة الدم بنجاح. دم سليم وصالح للاستخدام السريري.";
    await db.insert(donations).values({
      donorId: donor.id,
      donorCode: donor.code,
      donorName: donor.name,
      bloodType: donor.bloodType,
      quantityMl: 450,
      donationDate: todayISO(),
      status: "completed",
      handledBy: user.fullName,
      notes: labDonationNote,
    });
    await db
      .update(donors)
      .set({ donationCount: (donor.donationCount ?? 0) + 1, lastDonationDate: todayISO() })
      .where(eq(donors.id, donor.id));

    // تحديث استجابة المنشور (إن وُجدت) إلى تم التبرع
    if (donor.phone) {
      const phoneVariants = getPhoneVariants(donor.phone);
      await db
        .update(postResponses)
        .set({ status: "donated", updatedAt: new Date() })
        .where(inArray(postResponses.donorPhone, phoneVariants));
    }
  } else {
    await db.insert(blacklist).values({
      donorId: donor.id,
      donorCode: donor.code,
      donorName: donor.name,
      type: decision === "final_banned" ? "final" : decision === "temp_banned" ? "temporary" : "deferral",
      reason: reason ?? "",
      startDate: startDate as string,
      endDate: decision === "final_banned" ? null : (endDate as string),
      notes,
    });

    // تحديث استجابة المنشور (إن وُجدت) إلى ملغاة مع توضيح السبب
    if (donor.phone) {
      const phoneVariants = getPhoneVariants(donor.phone);
      await db
        .update(postResponses)
        .set({ status: "cancelled", notes: reason, updatedAt: new Date() })
        .where(inArray(postResponses.donorPhone, phoneVariants));
    }
  }

    await writeAudit({
      user,
      action: "approve",
      entity: "lab",
      entityId: donor.id,
      page: "/lab/waiting",
      changes: [{ field: "decision", from: donor.status, to: decision }],
      ip: clientIp(request),
    });

    return Response.json({ labTest: createdTest, decision }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
