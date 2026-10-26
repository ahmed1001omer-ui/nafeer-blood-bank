"use client";

import { useMemo, useState } from "react";
import IssueDialog from "@/components/dialogs/IssueDialog";
import { Badge, Button, Card, EmptyState, PageHeader, TextInput } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/api";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";

type IssueRow = {
  id: number;
  requestNumber: string | null;
  unitNumber: string;
  bloodType: string;
  component: string;
  patientName: string;
  issueDate: string;
  issuedBy: string | null;
};

export default function IssuesClient() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useResource<{ issues: IssueRow[] }>("/api/issues");
  const canAccess = useCan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const issues = useMemo(() => data?.issues ?? [], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter((i) => i.unitNumber.toLowerCase().includes(q) || i.patientName.toLowerCase().includes(q) || (i.requestNumber ?? "").toLowerCase().includes(q));
  }, [issues, search]);

  return (
    <div className="animate-rise">
      <PageHeader
        title={t("issues")}
        description={lang === "en" ? "Blood unit issuance log" : "سجل عمليات صرف وحدات الدم"}
        action={
          canAccess("issues", "create") ? (
            <Button onClick={() => setDialogOpen(true)}>{t("issueUnit")}</Button>
          ) : null
        }
      />
      <Card padding="p-0">
        <div className="p-4">
          <TextInput
            value={search}
            onChange={setSearch}
            placeholder={lang === "en" ? "Search unit number, patient, or request" : "بحث برقم الوحدة أو المريض أو الطلب"}
          />
        </div>
        {loading ? (
          <EmptyState title={t("loading")} />
        ) : error ? (
          <div className="p-6 text-center">
            <EmptyState title={t("errorLoading")} />
            <Button onClick={refresh}>{t("retry")}</Button>
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            title={lang === "en" ? "No blood unit issuances" : "لا توجد عمليات صرف"}
            description={lang === "en" ? "Issue the first blood unit using the Issue Unit button" : "اصرف أول وحدة دم من زر صرف وحدة"}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title={t("noData")} />
        ) : (
          <div className="table-wrap border-t border-line">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("unitNumber")}</th>
                  <th>{t("bloodType")}</th>
                  <th>{lang === "en" ? "Component" : "المكوّن"}</th>
                  <th>{t("patient")}</th>
                  <th>{t("requestNumber")}</th>
                  <th>{lang === "en" ? "Issue Date" : "تاريخ الصرف"}</th>
                  <th>{lang === "en" ? "Issued By" : "الموظف"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td className="font-semibold">{i.unitNumber}</td>
                    <td><Badge tone="danger">{i.bloodType}</Badge></td>
                    <td>{i.component}</td>
                    <td>{i.patientName}</td>
                    <td>{i.requestNumber ?? "—"}</td>
                    <td>{formatDate(i.issueDate)}</td>
                    <td>{i.issuedBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <IssueDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={refresh} />
    </div>
  );
}
