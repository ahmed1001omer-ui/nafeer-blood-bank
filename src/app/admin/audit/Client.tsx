"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { resourceLabel } from "@/lib/rbac";
import { useResource } from "@/lib/api";
import { useLanguage } from "@/lib/i18n-context";

type LogRow = {
  id: number;
  username: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  page: string | null;
  changes: { field: string; from: unknown; to: unknown }[] | null;
  ip: string | null;
  createdAt: string;
};

const actionTone: Record<string, string> = {
  login: "info",
  logout: "neutral",
  create: "success",
  update: "warning",
  delete: "danger",
  issue: "info",
  approve: "success",
};

export default function AuditClient() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useResource<{ logs: LogRow[] }>("/api/audit");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");

  const actionLabels: Record<string, string> = {
    login: lang === "en" ? "Sign In" : "تسجيل دخول",
    logout: lang === "en" ? "Sign Out" : "تسجيل خروج",
    create: lang === "en" ? "Create" : "إضافة",
    update: lang === "en" ? "Update" : "تعديل",
    delete: lang === "en" ? "Delete" : "حذف",
    issue: lang === "en" ? "Issue" : "صرف",
    approve: lang === "en" ? "Approve" : "اعتماد",
  };

  const logs = useMemo(() => data?.logs ?? [], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (action && l.action !== action) return false;
      if (!q) return true;
      return (l.username ?? "").toLowerCase().includes(q) || l.entity.toLowerCase().includes(q) || (l.page ?? "").toLowerCase().includes(q);
    });
  }, [logs, search, action]);

  function fmt(dt: string) {
    const d = new Date(dt);
    return d.toLocaleString(lang === "en" ? "en-US" : "ar", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title={t("auditLogs")}
        description={lang === "en" ? "Track all sensitive system operations and audit trails" : "تتبّع كل العمليات الحساسة في النظام"}
      />
      <Card padding="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="min-w-[220px] flex-1">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder={lang === "en" ? "Search user, entity, or page" : "بحث بالمستخدم أو النوع أو الصفحة"}
            />
          </div>
          <div className="w-[170px]">
            <SelectInput
              value={action}
              onChange={setAction}
              options={Object.entries(actionLabels).map(([v, l]) => ({ value: v, label: l }))}
              placeholder={lang === "en" ? "All Operations" : "كل العمليات"}
            />
          </div>
        </div>
        {loading ? (
          <EmptyState title={t("loading")} />
        ) : error ? (
          <div className="p-6 text-center"><EmptyState title={t("errorLoading")} /><Button onClick={refresh}>{t("retry")}</Button></div>
        ) : filtered.length === 0 ? (
          <EmptyState title={t("noData")} />
        ) : (
          <div className="table-wrap border-t border-line">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "User" : "المستخدم"}</th>
                  <th>{lang === "en" ? "Action" : "العملية"}</th>
                  <th>{lang === "en" ? "Resource" : "العنصر"}</th>
                  <th>{lang === "en" ? "Record ID" : "السجل"}</th>
                  <th>{lang === "en" ? "Changes" : "التغييرات"}</th>
                  <th>{lang === "en" ? "Page" : "الصفحة"}</th>
                  <th>IP</th>
                  <th>{t("date")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td className="font-semibold">{l.username ?? "—"}</td>
                    <td><Badge tone={actionTone[l.action] ?? "neutral"}>{actionLabels[l.action] ?? l.action}</Badge></td>
                    <td>{resourceLabel(l.entity)}</td>
                    <td>{l.entityId ?? "—"}</td>
                    <td className="max-w-[280px] whitespace-normal">
                      {l.changes && l.changes.length > 0 ? (
                        <div className="space-y-0.5">
                          {l.changes.map((c, i) => (
                            <p key={i} className="text-[12px] text-muted">
                              <span className="font-semibold text-ink">{c.field}</span>: {String(c.from ?? "—")} ← {String(c.to ?? "—")}
                            </p>
                          ))}
                        </div>
                      ) : "—"}
                    </td>
                    <td>{l.page ?? "—"}</td>
                    <td>{l.ip ?? "—"}</td>
                    <td>{fmt(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
