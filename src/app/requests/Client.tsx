"use client";

import { useMemo, useState } from "react";
import RequestDialog from "@/components/dialogs/RequestDialog";
import { Badge, Button, Card, EmptyState, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { BLOOD_TYPES, PRIORITY_OPTIONS, REQUEST_STATUSES, priorityLabel, requestStatusLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/api";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";

type RequestRow = {
  id: number;
  patientId: number | null;
  requestNumber: string;
  patientName: string;
  requester: string;
  bloodType: string;
  component: string;
  unitsRequested: number;
  unitsFulfilled: number;
  priority: string;
  status: string;
  requestDate: string;
  notes: string | null;
};

const priorityTone: Record<string, string> = { critical: "danger", urgent: "warning", normal: "info" };
const statusTone: Record<string, string> = { pending: "warning", partial: "info", fulfilled: "success", cancelled: "neutral" };

export default function RequestsClient() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useResource<{ requests: RequestRow[] }>("/api/requests");
  const canAccess = useCan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [search, setSearch] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");

  const requests = useMemo(() => data?.requests ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (bloodType && r.bloodType !== bloodType) return false;
      if (priority && r.priority !== priority) return false;
      if (status && r.status !== status) return false;
      if (!q) return true;
      return r.patientName.toLowerCase().includes(q) || r.requestNumber.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q);
    });
  }, [requests, search, bloodType, priority, status]);

  return (
    <div className="animate-rise">
      <PageHeader
        title={t("requests")}
        description={lang === "en" ? "Manage blood unit requests from departments" : "إدارة طلبات وحدات الدم من الأقسام"}
        action={
          canAccess("requests", "create") ? (
            <Button onClick={() => { setSelected(null); setDialogOpen(true); }}>{t("createRequest")}</Button>
          ) : null
        }
      />

      <Card padding="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="min-w-[200px] flex-1">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder={lang === "en" ? "Search request no., patient, or entity" : "بحث برقم الطلب أو المريض أو الجهة"}
            />
          </div>
          <div className="w-[130px]">
            <SelectInput value={bloodType} onChange={setBloodType} options={BLOOD_TYPES} placeholder={t("bloodType")} />
          </div>
          <div className="w-[140px]">
            <SelectInput value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} placeholder={t("priority")} />
          </div>
          <div className="w-[150px]">
            <SelectInput value={status} onChange={setStatus} options={REQUEST_STATUSES} placeholder={t("status")} />
          </div>
        </div>

        {loading ? (
          <EmptyState title={t("loading")} />
        ) : error ? (
          <div className="p-6 text-center">
            <EmptyState title={t("errorLoading")} />
            <Button onClick={refresh}>{t("retry")}</Button>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            title={lang === "en" ? "No blood requests" : "لا توجد طلبات"}
            description={lang === "en" ? "Click Create Request to record the first blood request" : "اضغط على إنشاء طلب لتسجيل أول طلب دم"}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title={t("noData")} />
        ) : (
          <div className="table-wrap border-t border-line">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("requestNumber")}</th>
                  <th>{t("patient")}</th>
                  <th>{lang === "en" ? "Requester" : "الجهة"}</th>
                  <th>{t("bloodType")}</th>
                  <th>{lang === "en" ? "Component" : "المكوّن"}</th>
                  <th>{lang === "en" ? "Units (Fulfilled/Requested)" : "الوحدات"}</th>
                  <th>{t("priority")}</th>
                  <th>{t("status")}</th>
                  <th>{t("date")}</th>
                  {canAccess("requests", "update") ? <th>{t("actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.requestNumber}</td>
                    <td>{r.patientName}</td>
                    <td>{r.requester}</td>
                    <td><Badge tone="danger">{r.bloodType}</Badge></td>
                    <td>{r.component}</td>
                    <td>{r.unitsFulfilled}/{r.unitsRequested}</td>
                    <td><Badge tone={priorityTone[r.priority] ?? "neutral"}>{priorityLabel(r.priority)}</Badge></td>
                    <td><Badge tone={statusTone[r.status] ?? "neutral"}>{requestStatusLabel(r.status)}</Badge></td>
                    <td>{formatDate(r.requestDate)}</td>
                    {canAccess("requests", "update") ? (
                      <td>
                        <Button variant="secondary" size="sm" onClick={() => { setSelected(r); setDialogOpen(true); }}>
                          {t("edit")}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <RequestDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={refresh} request={selected} />
    </div>
  );
}
