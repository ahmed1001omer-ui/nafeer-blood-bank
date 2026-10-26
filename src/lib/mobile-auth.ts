import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { blacklist, donations, donors, mobileUsers } from "@/db/schema";
import { addDaysISO, formatDate, todayISO } from "@/lib/format";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "bbms-local-dev-secret-change-in-production-please",
);

export async function createMobileToken(userId: number) {
  return new SignJWT({ kind: "mobile" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function requireMobileUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;

  try {
    const { payload } = await jwtVerify(match[1], secret);
    if (payload.kind !== "mobile" || !payload.sub) return null;
    const [user] = await db.select().from(mobileUsers).where(eq(mobileUsers.id, Number(payload.sub)));
    return user?.active ? user : null;
  } catch {
    return null;
  }
}

export function getPhoneVariants(phone: string): string[] {
  if (!phone) return [];
  const compact = phone.trim().replace(/[\s()-]/g, "");
  const set = new Set<string>();
  set.add(compact);
  if (compact.startsWith("+249")) {
    const raw = compact.slice(4);
    set.add("0" + raw);
    set.add(raw);
    set.add("249" + raw);
  } else if (compact.startsWith("249")) {
    const raw = compact.slice(3);
    set.add("+249" + raw);
    set.add("0" + raw);
    set.add(raw);
  } else if (compact.startsWith("0")) {
    const raw = compact.slice(1);
    set.add("+249" + raw);
    set.add("249" + raw);
    set.add(raw);
  } else {
    set.add("+249" + compact);
    set.add("0" + compact);
    set.add("249" + compact);
  }
  return Array.from(set);
}

export type DonorEligibilityResult = {
  canDonate: boolean;
  status: "eligible" | "temporary_deferred" | "permanently_deferred" | "interval_waiting";
  reason: string | null;
  notes: string | null;
  message: string;
  untilDate: string | null;
};

export async function getDonorProfileAndEligibility(phone: string) {
  const phoneVariants = getPhoneVariants(phone);
  const donorRows = await db
    .select()
    .from(donors)
    .where(inArray(donors.phone, phoneVariants));

  const donorIds = donorRows.map((d) => d.id);
  const donorCodes = donorRows.map((d) => d.code);

  // Check blacklist
  let blRecord = null;
  if (donorIds.length > 0 || donorCodes.length > 0) {
    const conditions = [];
    if (donorIds.length > 0) conditions.push(inArray(blacklist.donorId, donorIds));
    if (donorCodes.length > 0) conditions.push(inArray(blacklist.donorCode, donorCodes));

    const blList = await db
      .select()
      .from(blacklist)
      .where(
        donorIds.length > 0
          ? inArray(blacklist.donorId, donorIds)
          : inArray(blacklist.donorCode, donorCodes)
      )
      .orderBy(desc(blacklist.id));
    blRecord = blList[0] ?? null;
  }

  // Check donations
  let lastDonationDate: string | null = null;
  let nextDonationDate: string | null = null;
  if (donorIds.length > 0) {
    const dList = await db
      .select()
      .from(donations)
      .where(inArray(donations.donorId, donorIds))
      .orderBy(desc(donations.donationDate), desc(donations.id));
    const completed = dList.find((d) => d.status === "completed");
    if (completed) {
      lastDonationDate = completed.donationDate;
      nextDonationDate = addDaysISO(lastDonationDate, 90);
    }
  }

  const today = todayISO();

  let eligibility: DonorEligibilityResult = {
    canDonate: true,
    status: "eligible",
    reason: null,
    notes: "أنت مؤهل للتبرع بالدم الآن للمساهمة في إنقاذ حياة المحتاجين.",
    message: "أنت مؤهل للتبرع بالدم الآن",
    untilDate: null,
  };

  if (blRecord) {
    if (blRecord.type === "final") {
      eligibility = {
        canDonate: false,
        status: "permanently_deferred",
        reason: blRecord.reason,
        notes: blRecord.notes ?? "بناءً على نتائج الفحوصات المخبرية ومعايير السلامة السريرية.",
        message: "عزيزي المتبرع، نظراً للمعايير الطبية لسلامتك وسلامة المرضى، لا يمكنك التبرع بالدم حالياً. دورك عظيم في نشر ومشاركة نداءات الاستغاثة عبر واتساب لإنقاذ الأرواح.",
        untilDate: null,
      };
    } else {
      const isStillActive = !blRecord.endDate || blRecord.endDate >= today;
      if (isStillActive) {
        eligibility = {
          canDonate: false,
          status: "temporary_deferred",
          reason: blRecord.reason,
          notes: blRecord.notes ?? "فترة استبعاد مؤقتة حسب توجيهات الطبيب / المختبر.",
          message: `تأجيل مؤقت للتبرع حتى ${blRecord.endDate ? formatDate(blRecord.endDate) : "إشعار آخر"}. السبب: ${blRecord.reason}`,
          untilDate: blRecord.endDate ?? null,
        };
      }
    }
  } else if (nextDonationDate && nextDonationDate > today) {
    eligibility = {
      canDonate: false,
      status: "interval_waiting",
      reason: "فترة التعافي الدوري بين التبرعات (90 يوماً)",
      notes: "يُنصح بشرب السوائل والتغذية السليمة حتى يحين موعد تبرعك القادم.",
      message: `موعد تبرعك القادم متاح ابتداءً من ${formatDate(nextDonationDate)}`,
      untilDate: nextDonationDate,
    };
  }

  return {
    donorIds,
    lastDonationDate,
    nextDonationDate,
    eligibility,
  };
}

export function mobileUserResponse(
  user: typeof mobileUsers.$inferSelect,
  extra?: { lastDonation?: string | null; nextDonationDate?: string | null; eligibility?: DonorEligibilityResult }
) {
  return {
    id: String(user.id),
    name: user.name,
    phone: user.phone,
    city: user.city,
    bloodType: user.bloodType,
    lastDonation: extra?.lastDonation ?? null,
    nextDonationDate: extra?.nextDonationDate ?? null,
    eligibility: extra?.eligibility ?? {
      canDonate: true,
      status: "eligible",
      reason: null,
      notes: null,
      message: "أنت مؤهل للتبرع بالدم الآن",
      untilDate: null,
    },
  };
}

export function normalizeMobilePhone(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^09\d{8}$/.test(compact)) return `+249${compact.slice(1)}`;
  if (/^9\d{8}$/.test(compact)) return `+249${compact}`;
  if (/^01\d{8}$/.test(compact)) return `+249${compact.slice(1)}`;
  if (/^1\d{8}$/.test(compact)) return `+249${compact}`;
  return compact;
}

export function validMobilePhone(value: string) {
  return /^\+?[0-9]\d{7,14}$/.test(value);
}
