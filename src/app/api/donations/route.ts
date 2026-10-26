import { db } from "@/db";
import { donations, donors } from "@/db/schema";
import { requireDate, requireOption, optionalText } from "@/lib/validation";
import { BLOOD_TYPES, DONATION_STATUSES } from "@/lib/constants";
import { clientIp, errorResponse, HttpError, requirePermission, writeAudit } from "@/lib/server-guard";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const allowedStatus = DONATION_STATUSES.map((s) => s.value);

export async function GET() {
  try {
    await requirePermission("donations", "view");
    const rows = await db.select().from(donations).orderBy(desc(donations.donationDate), desc(donations.id));
    return Response.json({ donations: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("donations", "create");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

    const donorId = Number(body.donorId);
    if (!Number.isFinite(donorId)) throw new HttpError(400, "يجب اختيار المتبرع");
    const [donor] = await db.select().from(donors).where(eq(donors.id, donorId));
    if (!donor) throw new HttpError(404, "المتبرع غير موجود");

    const bloodType = requireOption(errors, "bloodType", body.bloodType ?? donor.bloodType, "الفصيلة", [...BLOOD_TYPES]);
    const quantityMl = Number(body.quantityMl ?? 450);
    if (!Number.isInteger(quantityMl) || quantityMl < 1 || quantityMl > 1000) {
      errors.quantityMl = "أدخل كمية صحيحة بالملليلتر";
    }
    const donationDate = requireDate(errors, "donationDate", body.donationDate, "تاريخ التبرع");
    const status = requireOption(errors, "status", body.status ?? "under_review", "الحالة", allowedStatus);
    const notes = optionalText(body.notes);

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const [created] = await db
      .insert(donations)
      .values({
        donorId: donor.id,
        donorCode: donor.code,
        donorName: donor.name,
        bloodType,
        quantityMl,
        donationDate,
        status,
        handledBy: user.fullName,
        notes,
      })
      .returning();

    if (status === "completed") {
      await db
        .update(donors)
        .set({ donationCount: (donor.donationCount ?? 0) + 1, lastDonationDate: donationDate })
        .where(eq(donors.id, donor.id));
    }

    await writeAudit({ user, action: "create", entity: "donations", entityId: created.id, page: "/donations", ip: clientIp(request) });
    return Response.json({ donation: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
