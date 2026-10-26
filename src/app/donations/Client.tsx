"use client";

import { useMemo, useState } from "react";
import DonationDialog from "@/components/dialogs/DonationDialog";
import { Badge, Button, Card, EmptyState, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { BLOOD_TYPES, DONATION_STATUSES, donationStatusLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/api";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";

type DonationRow = {
  id: number;
  donorCode: string;
  donorName: string;
  bloodType: string;
  quantityMl: number;
  donationDate: string;
  status: string;
  handledBy: string | null;
};

const tone: Record<string, string> = { completed: "success", under_review: "warning", rejected: "danger" };

export default function DonationsClient() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useResource<{ donations: DonationRow[] }>("/api/donations");
  const canAccess = useCan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [status, setStatus] = useState("");

  const donations = useMemo(() => data?.donations ?? [], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return donations.filter((d: DonationRow) => {
      if (bloodType && d.bloodType !== bloodType) return false;
      if (status && d.status !== status) return false;
      if (!q) return true;
      return d.donorName.toLowerCase().includes(q) || d.donorCode.toLowerCase().includes(q);
    });
  }, [donations, search, bloodType, status]);

  return (
    <div className="animate-rise">
      <PageHeader
        title={t("donations")}
        description={lang === "en" ? "Blood donation operations record" : "سجل عمليات التبرع بالدم"}
        action={
          canAccess("donations", "create") ? (
            <Button onClick={() => setDialogOpen(true)}>
              {lang === "en" ? "Register Donation" : "تسجيل تبرع"}
            </Button>
          ) : null
        }
      />
      <Card padding="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="min-w-[200px] flex-1">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder={lang === "en" ? "Search name or code" : "بحث بالاسم أو الكود"}
            />
          </div>
          <div className="w-[130px]">
            <SelectInput value={bloodType} onChange={setBloodType} options={BLOOD_TYPES} placeholder={t("bloodType")} />
          </div>
          <div className="w-[150px]">
            <SelectInput value={status} onChange={setStatus} options={DONATION_STATUSES} placeholder={t("status")} />
          </div>
        </div>
        {loading ? (
          <EmptyState title={t("loading")} />
        ) : error ? (
          <div className="p-6 text-center">
            <EmptyState title={t("errorLoading")} />
            <Button onClick={refresh}>{t("retry")}</Button>
          </div>
        ) : donations.length === 0 ? (
          <EmptyState
            title={lang === "en" ? "No donations recorded" : "لا توجد تبرعات"}
            description={lang === "en" ? "Register a new donation for an eligible donor" : "سجّل تبرعًا جديدًا لمتبرع مؤهل"}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title={t("noData")} />
        ) : (
          <div className="table-wrap border-t border-line">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "Donor Code" : "كود المتبرع"}</th>
                  <th>{t("name")}</th>
                  <th>{t("bloodType")}</th>
                  <th>{t("quantity")}</th>
                  <th>{t("status")}</th>
                  <th>{t("date")}</th>
                  <th>{lang === "en" ? "Handled By" : "المسؤول"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: DonationRow) => (
                  <tr key={d.id}>
                    <td className="font-semibold">{d.donorCode}</td>
                    <td>{d.donorName}</td>
                    <td><Badge tone="danger">{d.bloodType}</Badge></td>
                    <td>{d.quantityMl} {lang === "en" ? "ml" : "مل"}</td>
                    <td><Badge tone={tone[d.status] ?? "neutral"}>{donationStatusLabel(d.status)}</Badge></td>
                    <td>{formatDate(d.donationDate)}</td>
                    <td>{d.handledBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <DonationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={refresh} />
    </div>
  );
}
