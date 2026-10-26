import { db } from "@/db";
import {
  bloodIssues,
  bloodRequests,
  bloodUnits,
  donations,
  donors,
  inventoryThresholds,
  labTests,
  patients,
} from "@/db/schema";
import { errorResponse, requirePermission } from "@/lib/server-guard";
import { BLOOD_TYPES } from "@/lib/constants";
import { daysUntil, isCurrentlyAvailableUnit, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("dashboard", "view");

    const [units, thresholds, donorRows, patientRows, requestRows, donationRows, issueRows, labRows] =
      await Promise.all([
        db.select().from(bloodUnits),
        db.select().from(inventoryThresholds),
        db.select().from(donors),
        db.select().from(patients),
        db.select().from(bloodRequests),
        db.select().from(donations),
        db.select().from(bloodIssues),
        db.select().from(labTests),
      ]);

    const available = units.filter(isCurrentlyAvailableUnit);
    const totalUnits = units.reduce((s, u) => s + u.quantity, 0);
    const availableUnits = available.reduce((s, u) => s + u.quantity, 0);

    const thresholdMap = new Map(thresholds.map((t) => [t.bloodType, t.minUnits]));

    // مخزون كل فصيلة
    const byType = BLOOD_TYPES.map((bt) => {
      const count = available.filter((u) => u.bloodType === bt).reduce((s, u) => s + u.quantity, 0);
      const min = thresholdMap.get(bt) ?? 5;
      let level: "available" | "low" | "critical";
      if (count === 0) level = "critical";
      else if (count < min) level = "low";
      else level = "available";
      return { bloodType: bt, count, min, level };
    });

    const lowStock = byType.filter((t) => t.level !== "available").length;

    // توزيع المخزون (Donut)
    const distribution = byType.filter((t) => t.count > 0).map((t) => ({ bloodType: t.bloodType, count: t.count }));

    // قريب الانتهاء
    const nearExpiry = available
      .filter((u) => daysUntil(u.expiryDate) >= 0 && daysUntil(u.expiryDate) <= 7)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
      .slice(0, 8)
      .map((u) => ({
        unitNumber: u.unitNumber,
        bloodType: u.bloodType,
        collectionDate: u.collectionDate,
        expiryDate: u.expiryDate,
        days: daysUntil(u.expiryDate),
      }));
    const nearExpiryCount = available.filter(
      (u) => daysUntil(u.expiryDate) >= 0 && daysUntil(u.expiryDate) <= 7,
    ).length;

    // اتجاه المخزون آخر 7 أيام (بناء تقديري من تواريخ السحب والصرف)
    const trend: { date: string; label: string; units: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayIso = d.toISOString().slice(0, 10);
      // الوحدات التي كانت موجودة في ذلك اليوم (تم سحبها قبله ولم تنتهِ)
      const count = units.filter(
        (u) => u.collectionDate <= dayIso && u.expiryDate >= dayIso,
      ).reduce((s, u) => s + u.quantity, 0);
      trend.push({ date: dayIso, label: `${d.getDate()}/${d.getMonth() + 1}`, units: count });
    }

    // الفصائل الأكثر طلبًا
    const demandMap = new Map<string, number>();
    for (const r of requestRows) {
      demandMap.set(r.bloodType, (demandMap.get(r.bloodType) ?? 0) + r.unitsRequested);
    }
    const topDemand = Array.from(demandMap.entries())
      .map(([bloodType, count]) => ({ bloodType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const today = todayISO();

    return Response.json({
      cards: {
        totalUnits,
        availableUnits,
        lowStock,
        donors: donorRows.length,
        patients: patientRows.length,
        requests: requestRows.length,
        donations: donationRows.length,
        issues: issueRows.length,
        labTests: labRows.length,
        nearExpiry: nearExpiryCount,
      },
      donorStats: {
        total: donorRows.length,
        newThisMonth: donorRows.filter((d) => d.registerDate.slice(0, 7) === today.slice(0, 7)).length,
        eligible: donorRows.filter((d) => d.status === "eligible").length,
        waitingLab: donorRows.filter((d) => d.stage === "waiting_lab").length,
        repeat: donorRows.filter((d) => d.donationCount > 1).length,
      },
      requestStats: {
        pending: requestRows.filter((r) => r.status === "pending").length,
        critical: requestRows.filter((r) => r.priority === "critical" && r.status !== "fulfilled").length,
        fulfilled: requestRows.filter((r) => r.status === "fulfilled").length,
      },
      byType,
      distribution,
      nearExpiry,
      trend,
      topDemand,
      recentDonations: donationRows
        .sort((a, b) => b.donationDate.localeCompare(a.donationDate))
        .slice(0, 6)
        .map((d) => ({
          donorName: d.donorName,
          bloodType: d.bloodType,
          donationDate: d.donationDate,
          quantityMl: d.quantityMl,
          status: d.status,
          handledBy: d.handledBy,
        })),
      recentRequests: requestRows
        .sort((a, b) => b.requestDate.localeCompare(a.requestDate))
        .slice(0, 6)
        .map((r) => ({
          requestNumber: r.requestNumber,
          patientName: r.patientName,
          requester: r.requester,
          bloodType: r.bloodType,
          unitsRequested: r.unitsRequested,
          priority: r.priority,
          status: r.status,
          requestDate: r.requestDate,
        })),
      system: {
        today,
        operationsToday:
          donationRows.filter((d) => d.donationDate === today).length +
          issueRows.filter((i) => i.issueDate === today).length +
          requestRows.filter((r) => r.requestDate === today).length,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
