"use client";

import Link from "next/link";
import { useResource } from "@/lib/api";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  SectionTitle,
  StatCard,
} from "@/components/ui";
import { AreaChart, DonutChart, StockBar } from "@/components/charts";
import { formatDate } from "@/lib/format";
import { donationStatusLabel, priorityLabel, requestStatusLabel } from "@/lib/constants";

type Dashboard = {
  cards: Record<string, number>;
  donorStats: { total: number; newThisMonth: number; eligible: number; waitingLab: number; repeat: number };
  requestStats: { pending: number; critical: number; fulfilled: number };
  byType: { bloodType: string; count: number; min: number; level: string }[];
  distribution: { bloodType: string; count: number }[];
  nearExpiry: { unitNumber: string; bloodType: string; collectionDate: string; expiryDate: string; days: number }[];
  trend: { label: string; units: number }[];
  topDemand: { bloodType: string; count: number }[];
  recentDonations: { donorName: string; bloodType: string; donationDate: string; quantityMl: number; status: string; handledBy: string | null }[];
  recentRequests: { requestNumber: string; patientName: string; requester: string; bloodType: string; unitsRequested: number; priority: string; status: string; requestDate: string }[];
  system: { today: string; operationsToday: number };
};

const priorityTone: Record<string, string> = { critical: "danger", urgent: "warning", normal: "info" };
const donationTone: Record<string, string> = { completed: "success", under_review: "warning", rejected: "danger" };

export default function DashboardClient() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useResource<Dashboard>("/api/dashboard");
  const canAccess = useCan();

  const levelBadge: Record<string, { tone: string; label: string }> = {
    available: { tone: "success", label: t("available") },
    low: { tone: "warning", label: t("low") },
    critical: { tone: "danger", label: t("critical") },
  };

  const QUICK = [
    { label: t("addDonor"), href: "/reception/donors", resource: "donors", action: "create" },
    { label: t("addPatient"), href: "/reception/patients", resource: "patients", action: "create" },
    { label: t("addUnit"), href: "/inventory/units", resource: "units", action: "create" },
    { label: t("createRequest"), href: "/requests", resource: "requests", action: "create" },
    { label: t("issueUnit"), href: "/inventory/issues", resource: "issues", action: "create" },
    { label: t("createReport"), href: "/reports", resource: "reports", action: "view" },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader title={t("dashboard")} description={t("hospitalName")} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title={t("dashboard")} description={t("hospitalName")} />
        <Card>
          <EmptyState title={t("errorLoading")} description={error ?? undefined} />
          <div className="text-center">
            <button className="btn btn-primary" onClick={refresh}>
              {t("retry")}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const quick = QUICK.filter((q) => canAccess(q.resource, q.action));

  return (
    <div className="animate-rise">
      <PageHeader
        title={t("dashboard")}
        description={
          lang === "en"
            ? `${t("hospitalName")} — Blood Bank Data Analysis`
            : `${t("hospitalName")} — تحليل بيانات بنك الدم`
        }
        action={
          <Badge tone="info">
            {lang === "en"
              ? `Today's Operations: ${data.system.operationsToday}`
              : `عمليات اليوم: ${data.system.operationsToday}`}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("totalUnits")}
          value={data.cards.totalUnits}
          hint={lang === "en" ? `Available: ${data.cards.availableUnits}` : `متاحة: ${data.cards.availableUnits}`}
          accent
        />
        <StatCard
          label={t("lowStock")}
          value={data.cards.lowStock}
          hint={lang === "en" ? "Types below minimum limit" : "فصائل تحت الحد الأدنى"}
        />
        <StatCard
          label={t("donors")}
          value={data.cards.donors}
          hint={lang === "en" ? `Pending Lab: ${data.donorStats.waitingLab}` : `بانتظار المختبر: ${data.donorStats.waitingLab}`}
        />
        <StatCard label={t("patients")} value={data.cards.patients} />
        <StatCard
          label={t("requests")}
          value={data.cards.requests}
          hint={lang === "en" ? `Pending: ${data.requestStats.pending}` : `قيد الانتظار: ${data.requestStats.pending}`}
        />
        <StatCard label={t("donations")} value={data.cards.donations} />
        <StatCard label={t("issues")} value={data.cards.issues} />
        <StatCard
          label={t("nearExpiryUnits")}
          value={data.cards.nearExpiry}
          hint={lang === "en" ? "Within 7 days" : "خلال 7 أيام"}
          accent={data.cards.nearExpiry > 0}
        />
      </div>

      {quick.length > 0 ? (
        <Card className="mt-5">
          <SectionTitle title={t("quickActions")} />
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <Link key={q.href} href={q.href} className="btn btn-secondary">
                {q.label}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            title={t("stockTrend")}
            subtitle={lang === "en" ? "Available units over time" : "عدد الوحدات المتوفرة عبر الأيام"}
          />
          <AreaChart data={data.trend} />
        </Card>
        <Card>
          <SectionTitle
            title={t("bloodTypeDistribution")}
            subtitle={lang === "en" ? "Available stock by blood type" : "المخزون المتاح حسب الفصيلة"}
          />
          <DonutChart data={data.distribution} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle
            title={t("bloodTypeStock")}
            subtitle={lang === "en" ? "Level of each type vs minimum required" : "مستوى كل فصيلة مقابل الحد الأدنى المطلوب"}
          />
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {data.byType.map((tItem) => (
              <div key={tItem.bloodType}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="font-bold text-ink">{tItem.bloodType}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted">
                      {tItem.count} / {lang === "en" ? "Min" : "الحد"} {tItem.min}
                    </span>
                    <Badge tone={levelBadge[tItem.level]?.tone ?? "neutral"}>
                      {levelBadge[tItem.level]?.label ?? tItem.level}
                    </Badge>
                  </span>
                </div>
                <StockBar value={tItem.count} min={tItem.min} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title={t("donorIndicators")} />
          <div className="space-y-3">
            <IndicatorRow label={lang === "en" ? "Total Donors" : "إجمالي المتبرعين"} value={data.donorStats.total} />
            <IndicatorRow label={lang === "en" ? "New This Month" : "جدد هذا الشهر"} value={data.donorStats.newThisMonth} />
            <IndicatorRow label={lang === "en" ? "Repeat Donors" : "متبرعون متكررون"} value={data.donorStats.repeat} />
            <IndicatorRow label={lang === "en" ? "Eligible Donors" : "مؤهلون للتبرع"} value={data.donorStats.eligible} />
            <IndicatorRow label={lang === "en" ? "Pending Lab" : "بانتظار المختبر"} value={data.donorStats.waitingLab} />
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <SectionTitle title={t("topDemandedTypes")} />
            {data.topDemand.length === 0 ? (
              <p className="text-[13px] text-muted">{lang === "en" ? "No requests" : "لا توجد طلبات"}</p>
            ) : (
              <div className="space-y-2">
                {data.topDemand.map((d) => (
                  <div key={d.bloodType} className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-ink">{d.bloodType}</span>
                    <span className="text-muted">
                      {d.count} {lang === "en" ? "units requested" : "وحدة مطلوبة"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card padding="p-0">
          <div className="p-5">
            <SectionTitle title={t("recentDonations")} />
          </div>
          {data.recentDonations.length === 0 ? (
            <EmptyState title={lang === "en" ? "No donations recorded" : "لا توجد تبرعات"} />
          ) : (
            <div className="table-wrap border-t border-line">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("donor")}</th>
                    <th>{t("bloodType")}</th>
                    <th>{t("date")}</th>
                    <th>{t("quantity")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentDonations.map((d, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{d.donorName}</td>
                      <td><Badge tone="danger">{d.bloodType}</Badge></td>
                      <td>{formatDate(d.donationDate)}</td>
                      <td>{d.quantityMl} {lang === "en" ? "ml" : "مل"}</td>
                      <td><Badge tone={donationTone[d.status] ?? "neutral"}>{donationStatusLabel(d.status)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padding="p-0">
          <div className="p-5">
            <SectionTitle title={t("recentRequests")} />
          </div>
          {data.recentRequests.length === 0 ? (
            <EmptyState title={lang === "en" ? "No requests recorded" : "لا توجد طلبات"} />
          ) : (
            <div className="table-wrap border-t border-line">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("requestNumber")}</th>
                    <th>{t("patient")}</th>
                    <th>{t("bloodType")}</th>
                    <th>{t("priority")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRequests.map((r) => (
                    <tr key={r.requestNumber}>
                      <td className="font-semibold">{r.requestNumber}</td>
                      <td>{r.patientName}</td>
                      <td><Badge tone="danger">{r.bloodType}</Badge></td>
                      <td><Badge tone={priorityTone[r.priority] ?? "neutral"}>{priorityLabel(r.priority)}</Badge></td>
                      <td>{requestStatusLabel(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4" padding="p-0">
        <div className="p-5">
          <SectionTitle
            title={t("nearExpiryUnits")}
            subtitle={lang === "en" ? "Soonest expiring units first" : "الأقرب انتهاءً أولًا"}
          />
        </div>
        {data.nearExpiry.length === 0 ? (
          <EmptyState title={lang === "en" ? "No units near expiry" : "لا توجد وحدات قريبة من الانتهاء"} />
        ) : (
          <div className="table-wrap border-t border-line">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("unitNumber")}</th>
                  <th>{t("bloodType")}</th>
                  <th>{t("collectionDate")}</th>
                  <th>{t("expiryDate")}</th>
                  <th>{t("remainingDays")}</th>
                </tr>
              </thead>
              <tbody>
                {data.nearExpiry.map((u) => (
                  <tr key={u.unitNumber}>
                    <td className="font-semibold">{u.unitNumber}</td>
                    <td><Badge tone="danger">{u.bloodType}</Badge></td>
                    <td>{formatDate(u.collectionDate)}</td>
                    <td className="font-semibold text-critical">{formatDate(u.expiryDate)}</td>
                    <td>{u.days} {lang === "en" ? "days" : "يوم"}</td>
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

function IndicatorRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}
