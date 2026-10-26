"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, Notice, PageHeader, SectionTitle } from "@/components/ui";
import { BLOOD_TYPES, BLOOD_COMPONENTS, rhLabel, unitStatusLabel } from "@/lib/constants";
import { daysUntil, formatDate, isCurrentlyAvailableUnit } from "@/lib/format";
import { useResource } from "@/lib/api";
import { useLanguage } from "@/lib/i18n-context";
import type { BloodUnit } from "@/lib/types";

const toneForStatus = (status: string) => {
  if (status === "available") return "success";
  if (status === "reserved") return "info";
  if (status === "quarantine") return "warning";
  if (status === "dispensed") return "neutral";
  return "danger";
};

export default function ReceptionInventoryPage() {
  const { t, lang } = useLanguage();
  const { data, loading } = useResource<{ units: BloodUnit[] }>("/api/units");
  const units = useMemo(
    () => (data?.units ?? []).filter(isCurrentlyAvailableUnit),
    [data],
  );

  const summary = BLOOD_TYPES.map((type) => {
    const typeUnits = units.filter((unit) => unit.bloodType === type);
    return {
      type,
      units: typeUnits.length,
      quantity: typeUnits.reduce((sum, unit) => sum + unit.quantity, 0),
    };
  });

  return (
    <div>
      <PageHeader
        title={t("inventory")}
        description={
          lang === "en"
            ? "View available blood stock for reception staff — management is done in Stock Units page"
            : "عرض فقط لما هو متاح حاليًا في المخزون — الإدارة تتم من صفحة مخزون الدم للإدارة"
        }
      />

      <Notice tone="info">
        {lang === "en"
          ? "This page is for reception staff to check available blood types. To request an unavailable type, create an announcement."
          : "هذه الصفحة لموظف الاستقبال لمعرفة الفصائل المتوفرة. لطلب فصيلة غير متوفرة استخدم صفحة إنشاء منشور."}
      </Notice>

      <Card className="mt-4">
        <SectionTitle
          title={lang === "en" ? "Available by Blood Type" : "المتوفر حسب الفصيلة"}
          subtitle={lang === "en" ? "Currently available units count" : "عدد الوحدات المتاحة الآن"}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((row) => (
            <div key={row.type} className="rounded-[12px] bg-[var(--bg-elevated)] border border-[var(--border-line)] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-ink">{row.type}</span>
                <Badge tone={row.quantity > 0 ? "success" : "danger"}>
                  {row.quantity > 0 ? t("available") : (lang === "en" ? "Unavailable" : "غير متوفر")}
                </Badge>
              </div>
              <p className="mt-1.5 text-[12.5px] text-muted">
                {row.quantity} {lang === "en" ? "units" : "وحدة"} — {row.units} {lang === "en" ? "unit IDs" : "رقم وحدة"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4" padding="p-0">
        <div className="p-5">
          <SectionTitle
            title={lang === "en" ? "Available Units" : "الوحدات المتاحة"}
            subtitle={lang === "en" ? "Sorted by expiry date — soonest expiring first" : "مرتبة حسب تاريخ الانتهاء — الأقرب انتهاءً أولًا"}
          />
        </div>
        {loading ? (
          <EmptyState title={t("loading")} />
        ) : units.length === 0 ? (
          <EmptyState
            title={lang === "en" ? "No available blood units" : "لا توجد وحدات متوفرة"}
            description={lang === "en" ? "You can create a blood shortage post to notify donors" : "يمكنك إنشاء منشور احتياج دم لإبلاغ المتبرعين"}
          />
        ) : (
          <div className="table-wrap border-t border-[var(--border-line)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("unitNumber")}</th>
                  <th>{t("bloodType")}</th>
                  <th>Rh</th>
                  <th>{lang === "en" ? "Component" : "المكوّن"}</th>
                  <th>{t("status")}</th>
                  <th>{t("quantity")}</th>
                  <th>{lang === "en" ? "Collection Date" : "تاريخ السحب"}</th>
                  <th>{t("expiryDate")}</th>
                  <th>{lang === "en" ? "Storage Location" : "موقع التخزين"}</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => {
                  const remaining = daysUntil(unit.expiryDate);
                  return (
                    <tr key={unit.id}>
                      <td className="font-semibold">{unit.unitNumber}</td>
                      <td>
                        <Badge tone="danger">{unit.bloodType}</Badge>
                      </td>
                      <td>{rhLabel(unit.rh)}</td>
                      <td>{unit.component}</td>
                      <td>
                        <Badge tone={toneForStatus(unit.status)}>{unitStatusLabel(unit.status)}</Badge>
                      </td>
                      <td>{unit.quantity}</td>
                      <td>{formatDate(unit.collectionDate)}</td>
                      <td>
                        <span className={remaining <= 7 ? "font-semibold text-critical" : ""}>
                          {formatDate(unit.expiryDate)}
                        </span>
                      </td>
                      <td>{unit.storageLocation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 surface px-5 py-4">
        <div>
          <p className="text-[14px] font-semibold text-ink">
            {lang === "en" ? "Didn't find the required blood type?" : "لم تجد الفصيلة المطلوبة؟"}
          </p>
          <p className="text-[12.5px] text-muted">
            {lang === "en" ? "Available components for request: " : "المكوّنات المتاحة للطلب: "}{BLOOD_COMPONENTS.join("، ")}
          </p>
        </div>
        <Link href="/reception/posts" className="btn btn-primary">
          {t("createPost")}
        </Link>
      </div>
    </div>
  );
}
