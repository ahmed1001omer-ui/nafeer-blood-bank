"use client";

import { useMemo, useState } from "react";
import EmployeeDialog from "@/components/dialogs/EmployeeDialog";
import { Badge, Button, Card, EmptyState, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { EMPLOYEE_ROLES, EMPLOYEE_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { apiPatch, useResource } from "@/lib/api";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";
import type { Employee } from "@/lib/types";

export default function EmployeesPage() {
  const { t, lang } = useLanguage();
  const { data, loading, refresh } = useResource<{ employees: Employee[] }>("/api/employees");
  const canAccess = useCan();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const employees = useMemo(() => data?.employees ?? [], [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((row) => {
      if (query && !row.name.toLowerCase().includes(query) && !row.role.toLowerCase().includes(query)) {
        return false;
      }
      if (role && row.role !== role) return false;
      if (status && row.status !== status) return false;
      return true;
    });
  }, [employees, search, role, status]);

  const toggleActive = async (row: Employee) => {
    setBusyId(row.id);
    try {
      await apiPatch(`/api/employees/${row.id}`, { status: row.status === "active" ? "inactive" : "active" });
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const statusOptions = EMPLOYEE_STATUSES.map((s) => ({
    value: s.value,
    label: s.value === "active" ? t("active") : t("inactive"),
  }));

  return (
    <div>
      <PageHeader
        title={t("employees")}
        description={t("manageEmployees")}
        action={
          canAccess("employees", "create") ? (
            <Button
              onClick={() => {
                setSelected(null);
                setDialogOpen(true);
              }}
            >
              {t("addEmployee")}
            </Button>
          ) : null
        }
      />

      <Card padding="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="min-w-[220px] flex-1">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder={t("searchEmployeePlaceholder")}
            />
          </div>
          <div className="w-[190px]">
            <SelectInput
              value={role}
              onChange={setRole}
              options={EMPLOYEE_ROLES}
              placeholder={t("allRoles")}
            />
          </div>
          <div className="w-[160px]">
            <SelectInput
              value={status}
              onChange={setStatus}
              options={statusOptions}
              placeholder={t("allStatuses")}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearch("");
              setRole("");
              setStatus("");
            }}
          >
            {t("reset")}
          </Button>
        </div>

        {loading ? (
          <EmptyState title={t("loading")} />
        ) : employees.length === 0 ? (
          <EmptyState
            title={t("noEmployees")}
            description={t("noEmployeesHint")}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t("noData")}
            description={lang === "en" ? "Try changing search or filters" : "جرّب تغيير البحث أو عوامل التصفية"}
          />
        ) : (
          <div className="table-wrap border-t border-[var(--border-line)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("employeeName")}</th>
                  <th>{t("jobTitle")}</th>
                  <th>{t("hireDate")}</th>
                  <th>{t("status")}</th>
                  <th>{t("phone")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.name}</td>
                    <td>{row.role}</td>
                    <td>{formatDate(row.hireDate)}</td>
                    <td>
                      <Badge tone={row.status === "active" ? "success" : "neutral"}>
                        {row.status === "active" ? t("active") : t("inactive")}
                      </Badge>
                    </td>
                    <td>{row.phone ?? "—"}</td>
                    <td>
                      {canAccess("employees", "update") ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelected(row);
                              setDialogOpen(true);
                            }}
                          >
                            {t("edit")}
                          </Button>
                          <Button
                            variant={row.status === "active" ? "danger" : "success"}
                            size="sm"
                            disabled={busyId === row.id}
                            onClick={() => toggleActive(row)}
                          >
                            {row.status === "active" ? t("deactivate") : t("activate")}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EmployeeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
        employee={selected}
      />
    </div>
  );
}
