import { db } from "@/db";
import { bloodRequests, bloodUnits, donors, inventoryThresholds } from "@/db/schema";
import { errorResponse, requirePermission } from "@/lib/server-guard";
import { can } from "@/lib/rbac";
import { daysUntil, isCurrentlyAvailableUnit } from "@/lib/format";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Notice = {
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
  href: string;
  severity: "critical" | "warning" | "info";
};

export async function GET() {
  try {
    const user = await requirePermission("notifications", "view");
    const canSeeInventory = can(user.permissions, "inventory", "view") || can(user.permissions, "units", "view");
    const canSeeRequests = can(user.permissions, "requests", "view");
    const canSeeLab = can(user.permissions, "lab", "view");

    const [units, thresholds, requests, waitingDonors] = await Promise.all([
      canSeeInventory ? db.select().from(bloodUnits) : Promise.resolve([]),
      canSeeInventory ? db.select().from(inventoryThresholds) : Promise.resolve([]),
      canSeeRequests ? db.select().from(bloodRequests).where(eq(bloodRequests.status, "pending")) : Promise.resolve([]),
      canSeeLab ? db.select().from(donors).where(eq(donors.stage, "waiting_lab")) : Promise.resolve([]),
    ]);

    const items: Notice[] = [];

    // مخزون منخفض / حرج لكل فصيلة
    const availByType = new Map<string, number>();
    for (const unit of units) {
      if (isCurrentlyAvailableUnit(unit)) {
        availByType.set(unit.bloodType, (availByType.get(unit.bloodType) ?? 0) + unit.quantity);
      }
    }
    for (const threshold of canSeeInventory ? thresholds : []) {
      const available = availByType.get(threshold.bloodType) ?? 0;
      if (available === 0) {
        items.push({
          title: `نفاد مخزون ${threshold.bloodType}`,
          description: "لا توجد وحدات متاحة من هذه الفصيلة",
          titleEn: `${threshold.bloodType} Stock Depleted`,
          descriptionEn: "No available units for this blood type",
          href: "/inventory/units",
          severity: "critical",
        });
      } else if (available < threshold.minUnits) {
        items.push({
          title: `انخفاض مخزون ${threshold.bloodType}`,
          description: `${available} وحدة متاحة (الحد الأدنى ${threshold.minUnits})`,
          titleEn: `Low Stock for ${threshold.bloodType}`,
          descriptionEn: `${available} unit(s) available (Minimum ${threshold.minUnits})`,
          href: "/inventory/units",
          severity: "warning",
        });
      }
    }

    // طلبات عاجلة/حرجة
    const urgentRequests = canSeeRequests ? requests.filter((r) => r.priority === "critical" || r.priority === "urgent") : [];
    if (urgentRequests.length > 0) {
      items.push({
        title: `${urgentRequests.length} طلب دم عاجل`,
        description: "طلبات بأولوية عالية قيد الانتظار",
        titleEn: `${urgentRequests.length} Urgent Blood Request(s)`,
        descriptionEn: "High priority requests pending fulfillment",
        href: "/requests",
        severity: "critical",
      });
    }

    // وحدات قريبة من الانتهاء
    const nearExpiry = canSeeInventory ? units.filter(
      (u) => u.status === "available" && daysUntil(u.expiryDate) >= 0 && daysUntil(u.expiryDate) <= 7,
    ) : [];
    if (nearExpiry.length > 0) {
      items.push({
        title: `${nearExpiry.length} وحدة قريبة من الانتهاء`,
        description: "خلال 7 أيام أو أقل",
        titleEn: `${nearExpiry.length} Unit(s) Near Expiry`,
        descriptionEn: "Expiring within 7 days or less",
        href: "/inventory/units",
        severity: "warning",
      });
    }

    // وحدات منتهية لم تُحدّث
    const expired = canSeeInventory ? units.filter((u) => {
      const days = daysUntil(u.expiryDate);
      return u.status === "available" && (!Number.isFinite(days) || days < 0);
    }) : [];
    if (expired.length > 0) {
      items.push({
        title: `${expired.length} وحدة منتهية الصلاحية`,
        description: "تحتاج إلى تحديث الحالة",
        titleEn: `${expired.length} Expired Blood Unit(s)`,
        descriptionEn: "Requires status update",
        href: "/inventory/units",
        severity: "critical",
      });
    }

    // متبرعون بانتظار الفحص
    if (canSeeLab && waitingDonors.length > 0) {
      items.push({
        title: `${waitingDonors.length} متبرع بانتظار فحص المختبر`,
        description: "بحاجة إلى إدخال نتيجة الفيروسات",
        titleEn: `${waitingDonors.length} Donor(s) Pending Lab Check`,
        descriptionEn: "Viral test results input required",
        href: "/lab/waiting",
        severity: "info",
      });
    }

    return Response.json({ count: items.length, items });
  } catch (error) {
    return errorResponse(error);
  }
}
