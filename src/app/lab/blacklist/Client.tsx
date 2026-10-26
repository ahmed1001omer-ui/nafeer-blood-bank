"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Tabs, TextInput } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { apiDelete, useResource } from "@/lib/api";
import { useLanguage } from "@/lib/i18n-context";
import { useCan } from "@/lib/session-context";
import BlacklistDialog from "@/components/dialogs/BlacklistDialog";
import type { BlacklistEntry } from "@/lib/types";

function BlacklistView() {
  const { t, lang } = useLanguage();
  const canAccess = useCan();
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") ?? "final";
  const { data, loading, refresh } = useResource<{ entries: BlacklistEntry[] }>("/api/blacklist");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlacklistEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const TABS = [
    { value: "final", label: lang === "en" ? "Permanent Banned" : "الحظر النهائي" },
    { value: "temporary", label: lang === "en" ? "Temporary Banned" : "الحظر المؤقت" },
    { value: "deferral", label: lang === "en" ? "Deferred Cases" : "حالات التأجيل" },
  ];

  const typeLabel: Record<string, string> = {
    final: lang === "en" ? "Permanently Banned" : "محظور من التبرع نهائيًا",
    temporary: lang === "en" ? "Temporarily Banned" : "محظور مؤقتًا",
    deferral: lang === "en" ? "Deferred" : "مؤجل",
  };

  const entries = useMemo(() => data?.entries ?? [], [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((row) => {
      if (row.type !== tab) return false;
      if (date && (row.startDate ?? "").slice(0, 10) !== date) return false;
      if (!query) return true;
      return (
        (row.donorName ?? "").toLowerCase().includes(query) ||
        (row.donorCode ?? "").toLowerCase().includes(query) ||
        (row.reason ?? "").toLowerCase().includes(query)
      );
    });
  }, [entries, tab, search, date]);

  const counts = {
    final: entries.filter((row) => row.type === "final").length,
    temporary: entries.filter((row) => row.type === "temporary").length,
    deferral: entries.filter((row) => row.type === "deferral").length,
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/blacklist?id=${deleteTarget.id}`);
      setDeleteTarget(null);
      await refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("blacklist")}
        description={lang === "en" ? "Blacklist and deferral records from lab test results" : "بيانات الحظر والحظر المؤقت وحالات التأجيل القادمة من نتائج فحوصات المختبر"}
        action={
          canAccess("blacklist", "create") ? (
            <Button onClick={() => setDialogOpen(true)}>
              {lang === "en" ? "+ Add to Blacklist / Deferral" : "+ إضافة حظر / تأجيل يدوي"}
            </Button>
          ) : null
        }
      />

      <div className="mb-4">
        <Tabs
          items={TABS.map((item) => ({ ...item, count: counts[item.value as keyof typeof counts] }))}
          active={tab}
          onChange={(value) => router.push(`/lab/blacklist?tab=${value}`)}
        />
      </div>

      <Card padding="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="min-w-[220px] flex-1">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder={lang === "en" ? "Search name, code, or reason" : "بحث بالاسم أو الكود أو السبب"}
            />
          </div>
          <div className="w-[160px]">
            <TextInput value={date} onChange={setDate} type="date" />
          </div>
          {search || date ? (
            <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setDate(""); }}>
              {t("reset")}
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={refresh}>
            {lang === "en" ? "Refresh" : "تحديث القائمة"}
          </Button>
        </div>

        {loading ? (
          <EmptyState title={t("loading")} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t("noData")}
            description={
              tab === "final"
                ? lang === "en" ? "No permanent bans recorded" : "لا يوجد حظر نهائي مسجل"
                : tab === "temporary"
                  ? lang === "en" ? "No temporary bans recorded" : "لا يوجد حظر مؤقت مسجل"
                  : lang === "en" ? "No deferred cases recorded" : "لا توجد حالات تأجيل مسجلة"
            }
          />
        ) : tab === "final" ? (
          <div className="table-wrap border-t border-[var(--border-line)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "Donor Code" : "كود المتبرع"}</th>
                  <th>{lang === "en" ? "Donor Name" : "اسم المتبرع"}</th>
                  <th>{lang === "en" ? "Ban Reason" : "سبب الحظر"}</th>
                  <th>{lang === "en" ? "Ban Date" : "تاريخ الحظر"}</th>
                  <th>{t("status")}</th>
                  <th>{t("notes")}</th>
                  {canAccess("blacklist", "delete") ? <th>{t("actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.donorCode}</td>
                    <td>{row.donorName}</td>
                    <td>{row.reason}</td>
                    <td>{formatDate(row.startDate)}</td>
                    <td>
                      <Badge tone="danger">{typeLabel[row.type]}</Badge>
                    </td>
                    <td>{row.notes ?? "—"}</td>
                    {canAccess("blacklist", "delete") ? (
                      <td>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTarget(row)}
                        >
                          {lang === "en" ? "Lift Ban" : "رفع الحظر"}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap border-t border-[var(--border-line)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "Donor Code" : "كود المتبرع"}</th>
                  <th>{lang === "en" ? "Donor Name" : "اسم المتبرع"}</th>
                  <th>{tab === "deferral" ? (lang === "en" ? "Deferral Reason" : "سبب التأجيل") : (lang === "en" ? "Ban Reason" : "سبب الحظر")}</th>
                  <th>{lang === "en" ? "Start Date" : "تاريخ البداية"}</th>
                  <th>{tab === "deferral" ? (lang === "en" ? "Eligible Date" : "تاريخ السماح بالتبرع") : (lang === "en" ? "Expiry Date" : "تاريخ انتهاء الحظر")}</th>
                  <th>{lang === "en" ? "Current Status" : "الحالة الحالية"}</th>
                  <th>{t("notes")}</th>
                  {canAccess("blacklist", "delete") ? <th>{t("actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.donorCode}</td>
                    <td>{row.donorName}</td>
                    <td>{row.reason}</td>
                    <td>{formatDate(row.startDate)}</td>
                    <td>{formatDate(row.endDate)}</td>
                    <td>
                      {row.activeStatus === "expired" ? (
                        <Badge tone="success">{lang === "en" ? "Ban Expired" : "انتهت فترة الحظر"}</Badge>
                      ) : (
                        <Badge tone={tab === "deferral" ? "warning" : "info"}>{typeLabel[row.type]}</Badge>
                      )}
                    </td>
                    <td>{row.notes ?? "—"}</td>
                    {canAccess("blacklist", "delete") ? (
                      <td>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTarget(row)}
                        >
                          {lang === "en" ? "Lift / Remove" : "رفع / حذف"}
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

      <BlacklistDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
        initialType={tab as "final" | "temporary" | "deferral"}
      />

      {deleteTarget ? (
        <Modal
          open={true}
          onClose={() => setDeleteTarget(null)}
          title={lang === "en" ? "Lift Ban / Delete Record" : "تأكيد رفع الحظر / حذف السجل"}
          description={lang === "en" ? "Are you sure you want to lift this restriction?" : `هل أنت متأكد من رغبتك برفع الحظر عن المتبرع "${deleteTarget.donorName}"؟`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                {t("cancel")}
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? (lang === "en" ? "Lifting..." : "جارٍ الرفع...") : lang === "en" ? "Yes, Lift Ban" : "نعم، رفع الحظر"}
              </Button>
            </>
          }
        >
          <div className="space-y-2 text-sm text-[var(--text-muted)]">
            <p>
              <strong className="text-ink">{lang === "en" ? "Donor: " : "المتبرع: "}</strong>
              {deleteTarget.donorName} ({deleteTarget.donorCode})
            </p>
            <p>
              <strong className="text-ink">{lang === "en" ? "Reason: " : "السبب المسجل: "}</strong>
              {deleteTarget.reason}
            </p>
            <p className="text-warning text-xs mt-2">
              {lang === "en"
                ? "This will remove the restriction from the donor's record and restore their donation eligibility."
                : "سيؤدي هذا الإجراء إلى إزالة الحظر عن المتبرع وإعادته إلى قائمة المتبرعين المؤهلين في النظام."}
            </p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default function BlacklistPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<EmptyState title={t("loading")} />}>
      <BlacklistView />
    </Suspense>
  );
}
