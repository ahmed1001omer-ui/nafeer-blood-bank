"use client";

import Link from "next/link";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { useResource } from "@/lib/api";
import { useLanguage } from "@/lib/i18n-context";

type Notice = {
  title: string;
  description: string;
  titleEn?: string;
  descriptionEn?: string;
  href: string;
  severity: string;
};

const tone: Record<string, string> = { critical: "danger", warning: "warning", info: "info" };

export default function NotificationsClient() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useResource<{ count: number; items: Notice[] }>("/api/notifications");
  const items = data?.items ?? [];

  const sevLabel: Record<string, string> = {
    critical: lang === "en" ? "Critical" : "حرج",
    warning: lang === "en" ? "Warning" : "تحذير",
    info: lang === "en" ? "Info" : "معلومة",
  };

  return (
    <div className="animate-rise">
      <PageHeader
        title={t("notifications")}
        description={lang === "en" ? "Stock, request, and lab test alerts calculated from system data" : "تنبيهات المخزون والطلبات والفحوصات محسوبة من بيانات النظام"}
      />
      {loading ? (
        <Card><EmptyState title={t("loading")} /></Card>
      ) : error ? (
        <Card>
          <EmptyState title={t("errorLoading")} />
          <div className="text-center"><Button onClick={refresh}>{t("retry")}</Button></div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title={lang === "en" ? "No active notifications" : "لا توجد تنبيهات"}
            description={lang === "en" ? "All indicators are within normal thresholds" : "كل المؤشرات ضمن الحدود الطبيعية"}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item, i) => {
            const displayTitle = lang === "en" && item.titleEn ? item.titleEn : item.title;
            const displayDesc = lang === "en" && item.descriptionEn ? item.descriptionEn : item.description;
            return (
              <Link key={i} href={item.href}>
                <Card className="transition-shadow hover:shadow-[0_6px_20px_rgba(16,24,40,0.08)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-bold text-ink">{displayTitle}</p>
                      <p className="mt-1 text-[12.5px] text-muted">{displayDesc}</p>
                    </div>
                    <Badge tone={tone[item.severity] ?? "neutral"}>{sevLabel[item.severity] ?? item.severity}</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
