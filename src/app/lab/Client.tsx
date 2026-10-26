"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, EmptyState, PageHeader, StatCard, TextInput } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/api";
import { useLanguage } from "@/lib/i18n-context";
import { useCan } from "@/lib/session-context";
import type { BlacklistEntry, Donor, LabTest } from "@/lib/types";

export default function LabDashboardPage() {
  const { lang } = useLanguage();
  const canAccess = useCan();
  const { data: donorsData, loading: donorsLoading, refresh: refreshDonors } = useResource<{ donors: Donor[] }>("/api/donors");
  const { data: labData, loading: labLoading, refresh: refreshLab } = useResource<{ labTests: LabTest[] }>("/api/lab");
  const { data: blacklistData, loading: blacklistLoading, refresh: refreshBlacklist } = useResource<{ entries: BlacklistEntry[] }>("/api/blacklist");

  const [search, setSearch] = useState("");

  const donors = useMemo(() => donorsData?.donors ?? [], [donorsData]);
  const labTests = useMemo(() => labData?.labTests ?? [], [labData]);
  const blacklistEntries = useMemo(() => blacklistData?.entries ?? [], [blacklistData]);

  const waitingCount = donors.filter((d) => d.stage === "waiting_lab").length;
  const completedTodayCount = donors.filter((d) => d.stage === "completed").length;
  const permanentBanCount = blacklistEntries.filter((b) => b.type === "final").length;
  const tempDeferralCount = blacklistEntries.filter((b) => b.type !== "final").length;

  const filteredTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labTests.slice(0, 50);
    return labTests.filter(
      (t) =>
        (t.donorName ?? "").toLowerCase().includes(q) ||
        (t.donorCode ?? "").toLowerCase().includes(q) ||
        (t.testedBy ?? "").toLowerCase().includes(q) ||
        (t.decision ?? "").toLowerCase().includes(q)
    );
  }, [labTests, search]);

  const refreshAll = () => {
    refreshDonors();
    refreshLab();
    refreshBlacklist();
  };

  const decisionBadge = (decision: string) => {
    switch (decision) {
      case "eligible":
        return <Badge tone="success">{lang === "en" ? "Eligible" : "مؤهل للتبرع"}</Badge>;
      case "final_banned":
        return <Badge tone="danger">{lang === "en" ? "Permanent Ban" : "حظر نهائي"}</Badge>;
      case "temp_banned":
        return <Badge tone="warning">{lang === "en" ? "Temporary Ban" : "حظر مؤقت"}</Badge>;
      case "deferred":
        return <Badge tone="warning">{lang === "en" ? "Deferred" : "مؤجل"}</Badge>;
      default:
        return <Badge tone="neutral">{decision}</Badge>;
    }
  };

  const virusBadge = (val: string, label: string) => {
    if (val === "positive") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300">
          {label}: +
        </span>
      );
    }
    if (val === "indeterminate") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
          {label}: ?
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
        {label}: -
      </span>
    );
  };

  const isLoading = donorsLoading || labLoading || blacklistLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title={lang === "en" ? "Laboratory & Viral Screening Department" : "قسم المختبر والفحوصات الطبية"}
        description={
          lang === "en"
            ? "Screening waiting list, virus test records, and donor eligibility management"
            : "إدارة الفحوصات الفيروسية للمتبرعين، وسجلات الأهلية، والقوائم السوداء"
        }
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={refreshAll}>
              {lang === "en" ? "Refresh" : "تحديث البيانات"}
            </Button>
            <Link href="/lab/waiting" className="btn btn-primary">
              {lang === "en" ? "Pending Screening" : "قائمة الانتظار للفحص"}
              {waitingCount > 0 ? ` (${waitingCount})` : ""}
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={lang === "en" ? "Pending Lab Screening" : "بانتظار فحص المختبر"}
          value={waitingCount}
          hint={lang === "en" ? "Waiting for viral screening" : "متبرعون مؤهلون بانتظار الفحص"}
          accent={waitingCount > 0}
        />
        <StatCard
          label={lang === "en" ? "Screenings Done Today" : "فحوصات مكتملة اليوم"}
          value={completedTodayCount}
          hint={lang === "en" ? "Completed donations" : "تم الفحص وسحب الدم"}
        />
        <StatCard
          label={lang === "en" ? "Permanent Bans" : "الحظر النهائي"}
          value={permanentBanCount}
          hint={lang === "en" ? "Permanent blacklist entries" : "محظورون نهائياً من التبرع"}
        />
        <StatCard
          label={lang === "en" ? "Temporary & Deferrals" : "الحظر المؤقت والتأجيل"}
          value={tempDeferralCount}
          hint={lang === "en" ? "Active medical deferrals" : "حالات مؤقتة بانتظار الشفاء"}
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading text-lg font-bold text-ink">
                {lang === "en" ? "Viral Screening Queue" : "قائمة فحص الفيروسات"}
              </h3>
              <Badge tone={waitingCount > 0 ? "warning" : "neutral"}>
                {waitingCount} {lang === "en" ? "Waiting" : "بانتظار الفحص"}
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {lang === "en"
                ? "Record viral exam results (HIV, Hepatitis B/C, Syphilis, Malaria) and assign eligibility."
                : "تسجيل نتائج فحص الفيروسات والأمراض المعدية وإصدار قرارات الأهلية للمتبرعين الجدد."}
            </p>
          </div>
          <Link href="/lab/waiting" className="btn btn-primary w-full text-center">
            {lang === "en" ? "Open Waiting List" : "فتح قائمة الانتظار"}
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading text-lg font-bold text-ink">
                {lang === "en" ? "Blacklist Registry" : "سجل الحظر والقائمة السوداء"}
              </h3>
              <Badge tone="danger">
                {permanentBanCount} {lang === "en" ? "Banned" : "حظر نهائي"}
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {lang === "en"
                ? "Review donors permanently prohibited from donating blood due to transmissible infections."
                : "استعراض سجل المتبرعين الممنوعين نهائيًا من التبرع حماية لسلامة المرضى ومخزون الدم."}
            </p>
          </div>
          <Link href="/lab/blacklist?tab=final" className="btn btn-secondary w-full text-center">
            {lang === "en" ? "View Blacklist" : "عرض القائمة السوداء"}
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading text-lg font-bold text-ink">
                {lang === "en" ? "Deferral & Temporary Bans" : "حالات التأجيل والحظر المؤقت"}
              </h3>
              <Badge tone="warning">
                {tempDeferralCount} {lang === "en" ? "Deferred" : "حالة مؤقتة"}
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {lang === "en"
                ? "Follow up on temporary exclusions, malaria, medications, and low hemoglobin cases."
                : "متابعة الحالات المؤجلة بسبب الأنيميا، الملاريا، الأدوية، وحساب تواريخ انتهاء الحظر."}
            </p>
          </div>
          <Link href="/lab/blacklist?tab=temporary" className="btn btn-secondary w-full text-center">
            {lang === "en" ? "View Deferrals" : "عرض حالات التأجيل"}
          </Link>
        </Card>
      </div>

      {/* Lab Tests History Table */}
      <Card padding="p-0">
        <div className="p-4 border-b border-[var(--border-line)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-base font-bold text-ink">
              {lang === "en" ? "Recent Laboratory Test Records" : "سجل الفحوصات المخبرية الأخيرة"}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {lang === "en"
                ? "Live audit trail of all virus screenings conducted in the laboratory"
                : "سجل العمليات والفحوصات الفيروسية التي تمت معالجتها في المختبر"}
            </p>
          </div>
          <div className="min-w-[240px]">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder={lang === "en" ? "Search code, donor, or decision" : "بحث بالكود أو الاسم أو القرار"}
            />
          </div>
        </div>

        {isLoading ? (
          <EmptyState title={lang === "en" ? "Loading records..." : "جارٍ تحميل السجلات..."} />
        ) : filteredTests.length === 0 ? (
          <EmptyState
            title={lang === "en" ? "No laboratory tests recorded yet" : "لا توجد فحوصات مخبرية مسجلة حتى الآن"}
            description={
              lang === "en"
                ? "When tests are completed in the waiting list, they will appear here."
                : "عند إتمام فحص المتبرعين من قائمة الانتظار، ستظهر سجلات الفحص والقرارات هنا مباشرة."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "Donor Code" : "كود المتبرع"}</th>
                  <th>{lang === "en" ? "Donor Name" : "اسم المتبرع"}</th>
                  <th>{lang === "en" ? "Screening Tests" : "نتائج الفحوصات"}</th>
                  <th>{lang === "en" ? "Final Decision" : "القرار النهائي"}</th>
                  <th>{lang === "en" ? "Reason / Notes" : "السبب / ملاحظات"}</th>
                  <th>{lang === "en" ? "Tested By" : "الفاحص"}</th>
                  <th>{lang === "en" ? "Date" : "تاريخ الفحص"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.donorCode}</td>
                    <td>{row.donorName}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {virusBadge(row.hiv, "HIV")}
                        {virusBadge(row.hepatitisB, "HBV")}
                        {virusBadge(row.hepatitisC, "HCV")}
                        {virusBadge(row.syphilis, "Syphilis")}
                        {virusBadge(row.malaria, "Malaria")}
                      </div>
                    </td>
                    <td>{decisionBadge(row.decision)}</td>
                    <td className="max-w-[200px] truncate" title={row.reason || row.notes || "—"}>
                      {row.reason || row.notes || "—"}
                    </td>
                    <td className="text-xs text-[var(--text-muted)]">{row.testedBy || "—"}</td>
                    <td>{formatDate(row.startDate || (row.testedAt ? new Date(row.testedAt).toISOString() : null))}</td>
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
