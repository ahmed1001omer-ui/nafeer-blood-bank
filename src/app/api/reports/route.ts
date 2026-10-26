import { db } from "@/db";
import {
  bloodIssues,
  bloodUnits,
  donations,
  donors,
  labTests,
  patients,
} from "@/db/schema";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { daysUntil } from "@/lib/format";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number>;

const inRange = (date: string, from: string, to: string) => {
  const d = date.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

export async function GET(request: Request) {
  try {
    await requirePermission("reports", "view");
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "inventory";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const bloodType = url.searchParams.get("bloodType") ?? "";

    let columns: { key: string; label: string }[] = [];
    let rows: Row[] = [];

    if (type === "inventory") {
      columns = [
        { key: "unitNumber", label: "رقم الوحدة" },
        { key: "bloodType", label: "الفصيلة" },
        { key: "component", label: "المكوّن" },
        { key: "status", label: "الحالة" },
        { key: "expiryDate", label: "تاريخ الانتهاء" },
        { key: "storageLocation", label: "الموقع" },
      ];
      const units = await db.select().from(bloodUnits);
      rows = units
        .filter((u) => (!bloodType || u.bloodType === bloodType) && inRange(u.collectionDate, from, to))
        .map((u) => ({ id: u.id, unitNumber: u.unitNumber, bloodType: u.bloodType, component: u.component, status: u.status, expiryDate: u.expiryDate, storageLocation: u.storageLocation }));
    } else if (type === "donors") {
      columns = [
        { key: "code", label: "الكود" },
        { key: "name", label: "الاسم" },
        { key: "bloodType", label: "الفصيلة" },
        { key: "status", label: "الحالة" },
        { key: "registerDate", label: "تاريخ التسجيل" },
      ];
      const rowsData = await db.select().from(donors);
      rows = rowsData
        .filter((d) => (!bloodType || d.bloodType === bloodType) && inRange(d.registerDate, from, to))
        .map((d) => ({ id: d.id, code: d.code, name: d.name, bloodType: d.bloodType, status: d.status, registerDate: d.registerDate }));
    } else if (type === "patients") {
      columns = [
        { key: "name", label: "الاسم" },
        { key: "bloodType", label: "الفصيلة" },
        { key: "hospital", label: "الجهة" },
        { key: "recordDate", label: "التاريخ" },
      ];
      const rowsData = await db.select().from(patients);
      rows = rowsData
        .filter((p) => (!bloodType || p.bloodType === bloodType) && inRange(p.recordDate, from, to))
        .map((p) => ({ id: p.id, name: p.name, bloodType: p.bloodType, hospital: p.hospital, recordDate: p.recordDate }));
    } else if (type === "donations") {
      columns = [
        { key: "donorName", label: "المتبرع" },
        { key: "bloodType", label: "الفصيلة" },
        { key: "quantityMl", label: "الكمية" },
        { key: "status", label: "الحالة" },
        { key: "donationDate", label: "التاريخ" },
      ];
      const rowsData = await db.select().from(donations);
      rows = rowsData
        .filter((d) => (!bloodType || d.bloodType === bloodType) && inRange(d.donationDate, from, to))
        .map((d) => ({ id: d.id, donorName: d.donorName, bloodType: d.bloodType, quantityMl: d.quantityMl, status: d.status, donationDate: d.donationDate }));
    } else if (type === "issues") {
      columns = [
        { key: "unitNumber", label: "رقم الوحدة" },
        { key: "bloodType", label: "الفصيلة" },
        { key: "patientName", label: "المريض" },
        { key: "issueDate", label: "تاريخ الصرف" },
        { key: "issuedBy", label: "الموظف" },
      ];
      const rowsData = await db.select().from(bloodIssues);
      rows = rowsData
        .filter((i) => (!bloodType || i.bloodType === bloodType) && inRange(i.issueDate, from, to))
        .map((i) => ({ id: i.id, unitNumber: i.unitNumber, bloodType: i.bloodType, patientName: i.patientName, issueDate: i.issueDate, issuedBy: i.issuedBy ?? "—" }));
    } else if (type === "lab") {
      columns = [
        { key: "donorName", label: "المتبرع" },
        { key: "decision", label: "القرار" },
        { key: "testedBy", label: "المختبِر" },
      ];
      const rowsData = await db.select().from(labTests);
      rows = rowsData.map((l) => ({ id: l.id, donorName: l.donorName, decision: l.decision, testedBy: l.testedBy ?? "—" }));
    } else if (type === "expired") {
      columns = [
        { key: "unitNumber", label: "رقم الوحدة" },
        { key: "bloodType", label: "الفصيلة" },
        { key: "expiryDate", label: "تاريخ الانتهاء" },
        { key: "days", label: "الأيام المتبقية" },
      ];
      const units = await db.select().from(bloodUnits);
      rows = units
        .filter((u) => (!bloodType || u.bloodType === bloodType) && daysUntil(u.expiryDate) <= 7)
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
        .map((u) => ({ id: u.id, unitNumber: u.unitNumber, bloodType: u.bloodType, expiryDate: u.expiryDate, days: daysUntil(u.expiryDate) }));
    }

    return Response.json({ columns, rows, total: rows.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("reports", "delete").catch(() => requirePermission("units", "delete"));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const type = String(body.type ?? "inventory");
    const all = Boolean(body.all);
    const ids = Array.isArray(body.ids) ? (body.ids as number[]).map(Number).filter(Number.isFinite) : [];
    const id = Number(body.id);
    const targetIds = ids.length > 0 ? ids : (Number.isFinite(id) ? [id] : []);

    if (type === "inventory" || type === "expired") {
      if (all) {
        await db.delete(bloodUnits);
        await writeAudit({ user, action: "delete", entity: "units", entityId: 0, page: "/reports", changes: [{ field: "units", from: "all", to: "deleted" }], ip: clientIp(request) });
      } else if (targetIds.length > 0) {
        await db.delete(bloodUnits).where(inArray(bloodUnits.id, targetIds));
        await writeAudit({ user, action: "delete", entity: "units", entityId: targetIds[0], page: "/reports", changes: [{ field: "units", from: targetIds.join(","), to: "deleted" }], ip: clientIp(request) });
      }
    } else if (type === "donors") {
      if (all) {
        await db.delete(donors);
        await writeAudit({ user, action: "delete", entity: "donors", entityId: 0, page: "/reports", changes: [{ field: "donors", from: "all", to: "deleted" }], ip: clientIp(request) });
      } else if (targetIds.length > 0) {
        await db.delete(donors).where(inArray(donors.id, targetIds));
        await writeAudit({ user, action: "delete", entity: "donors", entityId: targetIds[0], page: "/reports", changes: [{ field: "donors", from: targetIds.join(","), to: "deleted" }], ip: clientIp(request) });
      }
    } else if (type === "patients") {
      if (all) {
        await db.delete(patients);
      } else if (targetIds.length > 0) {
        await db.delete(patients).where(inArray(patients.id, targetIds));
      }
    } else if (type === "donations") {
      if (all) {
        await db.delete(donations);
      } else if (targetIds.length > 0) {
        await db.delete(donations).where(inArray(donations.id, targetIds));
      }
    } else if (type === "issues") {
      if (all) {
        await db.delete(bloodIssues);
      } else if (targetIds.length > 0) {
        await db.delete(bloodIssues).where(inArray(bloodIssues.id, targetIds));
      }
    } else if (type === "lab") {
      if (all) {
        await db.delete(labTests);
      } else if (targetIds.length > 0) {
        await db.delete(labTests).where(inArray(labTests.id, targetIds));
      }
    }

    return Response.json({ success: true, count: all ? "all" : targetIds.length });
  } catch (error) {
    return errorResponse(error);
  }
}
