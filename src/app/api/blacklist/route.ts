import { db } from "@/db";
import { blacklist, donors } from "@/db/schema";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { daysUntil, todayISO } from "@/lib/format";
import { desc, eq } from "drizzle-orm";
import { requireDate, requireOption, requireText, optionalText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("blacklist", "view");
    const rows = await db.select().from(blacklist).orderBy(desc(blacklist.startDate), desc(blacklist.id));
    // حساب حالة الحظر المؤقت/التأجيل تلقائيًا عند انتهاء التاريخ
    const entries = rows.map((row) => {
      let activeStatus: "final" | "active" | "expired" = "active";
      if (row.type === "final") {
        activeStatus = "final";
      } else if (row.endDate && typeof row.endDate === "string" && row.endDate.length >= 10 && daysUntil(row.endDate) < 0) {
        activeStatus = "expired";
      }
      return { ...row, activeStatus };
    });
    return Response.json({ entries });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("blacklist", "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const type = requireOption(errors, "type", body.type, "نوع الحظر", ["final", "temporary", "deferral"]);
    const donorName = requireText(errors, "donorName", body.donorName, "اسم المتبرع");
    const donorCode = typeof body.donorCode === "string" && body.donorCode.trim()
      ? body.donorCode.trim()
      : `DNR-${Math.floor(1000 + Math.random() * 9000)}`;
    const reason = requireText(errors, "reason", body.reason, "سبب الحظر");
    const startDate = requireDate(errors, "startDate", body.startDate ?? todayISO(), "تاريخ البداية");

    let endDate: string | null = null;
    if (type !== "final") {
      endDate = requireDate(errors, "endDate", body.endDate, "تاريخ الانتهاء");
      if (startDate && endDate && endDate < startDate) {
        errors.endDate = "تاريخ انتهاء الحظر لا يمكن أن يكون قبل تاريخ البداية";
      }
    }

    const notes = optionalText(body.notes);

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    // فحص ما إذا كان المتبرع موجوداً مسبقاً لربط معرّفه
    const [existingDonor] = await db.select().from(donors).where(eq(donors.code, donorCode)).limit(1);

    const [created] = await db
      .insert(blacklist)
      .values({
        donorId: existingDonor?.id ?? null,
        donorCode,
        donorName,
        type,
        reason,
        startDate: startDate as string,
        endDate: type === "final" ? null : endDate,
        notes,
      })
      .returning();

    if (existingDonor) {
      const statusMap: Record<string, string> = {
        final: "final_banned",
        temporary: "temp_banned",
        deferral: "deferred",
      };
      await db
        .update(donors)
        .set({ status: statusMap[type], updatedAt: new Date() })
        .where(eq(donors.id, existingDonor.id));
    }

    await writeAudit({
      user,
      action: "create",
      entity: "blacklist",
      entityId: created.id,
      page: "/lab/blacklist",
      changes: [{ field: "type", from: null, to: type }, { field: "reason", from: null, to: reason }],
      ip: clientIp(request),
    });

    return Response.json({ entry: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("blacklist", "delete");
    const { searchParams } = new URL(request.url);
    let id = Number(searchParams.get("id"));

    if (!Number.isFinite(id) || id <= 0) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      id = Number(body.id);
    }

    if (!Number.isFinite(id) || id <= 0) {
      return Response.json({ message: "معرّف السجل غير صحيح" }, { status: 400 });
    }

    const [existing] = await db.select().from(blacklist).where(eq(blacklist.id, id)).limit(1);
    if (!existing) {
      return Response.json({ message: "السجل غير موجود أو تم حذفه مسبقاً" }, { status: 404 });
    }

    await db.delete(blacklist).where(eq(blacklist.id, id));

    // إذا كان المتبرع موجوداً وله حالة حظر، نعيده للحالة المناسبة
    if (existing.donorId) {
      const [donorRecord] = await db.select().from(donors).where(eq(donors.id, existing.donorId)).limit(1);
      if (donorRecord && (donorRecord.status === "final_banned" || donorRecord.status === "temp_banned" || donorRecord.status === "deferred")) {
        await db
          .update(donors)
          .set({ status: "eligible", updatedAt: new Date() })
          .where(eq(donors.id, existing.donorId));
      }
    }

    await writeAudit({
      user,
      action: "delete",
      entity: "blacklist",
      entityId: id,
      page: "/lab/blacklist",
      changes: [{ field: "deleted", from: existing.reason, to: "lifted" }],
      ip: clientIp(request),
    });

    return Response.json({ success: true, message: "تم رفع الحظر بنجاح" });
  } catch (error) {
    return errorResponse(error);
  }
}
