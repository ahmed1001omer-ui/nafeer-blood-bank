import { db } from "@/db";
import { bloodUnits, donors, employees, patients } from "@/db/schema";
import { DONOR_STATUS_LABELS, rhLabel, unitStatusLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";

import { requireSession, errorResponse } from "@/lib/server-guard";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const query = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
    if (query.length < 2) {
      return Response.json({ results: [] });
    }

  const [patientRows, donorRows, employeeRows, unitRows] = await Promise.all([
    can(user.permissions, "patients", "view") ? db.select().from(patients) : Promise.resolve([]),
    can(user.permissions, "donors", "view") ? db.select().from(donors) : Promise.resolve([]),
    can(user.permissions, "employees", "view") ? db.select().from(employees) : Promise.resolve([]),
    can(user.permissions, "units", "view") ? db.select().from(bloodUnits) : Promise.resolve([]),
  ]);

  type Hit = { type: string; label: string; meta: string; href: string };
  const results: Hit[] = [];

  for (const row of patientRows) {
    if (row.name.toLowerCase().includes(query) || row.bloodType.toLowerCase().includes(query)) {
      results.push({
        type: "مريض",
        label: row.name,
        meta: `${row.bloodType} — ${formatDate(row.recordDate)}`,
        href: "/reception/patients",
      });
    }
  }

  for (const row of donorRows) {
    if (
      row.name.toLowerCase().includes(query) ||
      row.code.toLowerCase().includes(query) ||
      row.bloodType.toLowerCase().includes(query)
    ) {
      results.push({
        type: "متبرع",
        label: row.name,
        meta: `${row.code} — ${DONOR_STATUS_LABELS[row.status] ?? row.status}`,
        href: row.stage === "waiting_lab" ? "/lab/waiting" : "/reception/donors",
      });
    }
  }

  for (const row of employeeRows) {
    if (row.name.toLowerCase().includes(query) || row.role.toLowerCase().includes(query)) {
      results.push({
        type: "موظف",
        label: row.name,
        meta: `${row.role} — ${formatDate(row.hireDate)}`,
        href: "/employees",
      });
    }
  }

  for (const row of unitRows) {
    if (row.unitNumber.toLowerCase().includes(query) || row.bloodType.toLowerCase().includes(query)) {
      results.push({
        type: "وحدة دم",
        label: `${row.bloodType} ${row.unitNumber}`,
        meta: `${unitStatusLabel(row.status)} — ${rhLabel(row.rh)}`,
        href: "/inventory/units",
      });
    }
  }

    return Response.json({ results: results.slice(0, 8) });
  } catch (error) {
    return errorResponse(error);
  }
}
