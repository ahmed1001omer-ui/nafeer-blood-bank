"use client";

import { Fragment, useMemo, useState } from "react";
import LabTestDialog from "@/components/dialogs/LabTestDialog";
import DonorDialog from "@/components/dialogs/DonorDialog";
import { Badge, Button, Card, EmptyState, Notice, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { BLOOD_TYPES, DONOR_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useResource } from "@/lib/api";
import { useLanguage } from "@/lib/i18n-context";
import { useCan } from "@/lib/session-context";
import type { Donor } from "@/lib/types";

export default function LabWaitingPage() {
  const { t, lang } = useLanguage();
  const canAccess = useCan();
  const { data, loading, refresh } = useResource<{ donors: Donor[] }>("/api/donors");
  const [labTarget, setLabTarget] = useState<Donor | null>(null);
  const [donorDialogOpen, setDonorDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const donors = useMemo(() => data?.donors ?? [], [data]);

  const waiting = useMemo(() => {
    const query = search.trim().toLowerCase();
    return donors.filter((row) => {
      if (row.stage !== "waiting_lab") return false;
      if (bloodType && row.bloodType !== bloodType) return false;
      if (!query) return true;
      return (
        (row.name ?? "").toLowerCase().includes(query) ||
        (row.code ?? "").toLowerCase().includes(query) ||
        (row.nationalId ?? "").toLowerCase().includes(query)
      );
    });
  }, [donors, search, bloodType]);

  const completedToday = donors.filter((row) => row.stage === "completed").length;

  return (
    <div>
      <PageHeader
        title={t("waitingLab")}
        description={lang === "en" ? "Donors data received from reception — no re-entry needed" : "بيانات المتبرعين القادمة من الاستقبال — لا حاجة لإعادة إدخالها"}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={refresh}>
              {lang === "en" ? "Refresh" : "تحديث القائمة"}
            </Button>
            {canAccess("donors", "create") ? (
              <Button onClick={() => setDonorDialogOpen(true)}>
                {lang === "en" ? "+ Direct Donor Registration" : "+ تسجيل متبرع مباشر للمختبر"}
              </Button>
            ) : null}
          </div>
        }
      />

      <Notice tone="info">
        {lang === "en"
          ? `Donors checked today: ${completedToday} — Eligible donors from reception automatically appear here.`
          : `عدد المتبرعين الذين تم إتمام فحصهم: ${completedToday} — المتبرع المؤهل من الاستقبال يظهر هنا تلقائيًا.`}
      </Notice>

      <Card className="mt-4" padding="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="min-w-[220px] flex-1">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder={lang === "en" ? "Search name, code, or National ID" : "بحث بالاسم أو الكود أو الرقم الوطني"}
            />
          </div>
          <div className="w-[160px]">
            <SelectInput
              value={bloodType}
              onChange={setBloodType}
              options={BLOOD_TYPES}
              placeholder={lang === "en" ? "All blood types" : "كل الفصائل"}
            />
          </div>
          {search || bloodType ? (
            <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setBloodType(""); }}>
              {t("reset")}
            </Button>
          ) : null}
        </div>

        {loading ? (
          <EmptyState title={t("loading")} />
        ) : waiting.length === 0 ? (
          <div className="p-8 text-center">
            <EmptyState
              title={lang === "en" ? "No donors pending lab check" : "لا يوجد متبرعون بانتظار الفحص حاليًا"}
              description={
                lang === "en"
                  ? "Eligible donors registered in reception or responding to urgent posts will appear here automatically."
                  : "المتبرعون المؤهلون المسجلون في الاستقبال أو المستجيبون للمنشورات سيظهرون هنا تلقائيًا فور وصولهم."
              }
            />
            {canAccess("donors", "create") ? (
              <div className="mt-4">
                <Button onClick={() => setDonorDialogOpen(true)}>
                  {lang === "en" ? "+ Register New Donor for Screening" : "+ تسجيل متبرع جديد للفحص"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="table-wrap border-t border-[var(--border-line)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "Donor Code" : "كود المتبرع"}</th>
                  <th>{t("name")}</th>
                  <th>{t("age")}</th>
                  <th>{t("gender")}</th>
                  <th>{t("bloodType")}</th>
                  <th>{lang === "en" ? "Hemoglobin" : "الهيموجلوبين"}</th>
                  <th>{lang === "en" ? "Initial Exam Result" : "نتيجة الفحص الأولي"}</th>
                  <th>{lang === "en" ? "Eligibility" : "حالة الأهلية"}</th>
                  <th>{lang === "en" ? "Registration Date" : "تاريخ التسجيل"}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((row) => (
                  <Fragment key={row.id}>
                    <tr>
                      <td className="font-semibold">{row.code}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span>{row.name}</span>
                          {(row.vitalSigns?.includes("تطبيق") || row.vitalSigns?.includes("منشور") || row.vitalSigns?.includes("متبرع عبر")) && (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                              title={lang === "en" ? "Donor via Blood Post Announcement" : "متبرع قادم عبر منشور إعلان احتياج"}
                            >
                              {lang === "en" ? "Via Post" : "متبرع عبر منشور"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{row.age}</td>
                      <td>{["M", "male", "ذكر"].includes(row.gender) ? t("male") : ["F", "female", "أنثى"].includes(row.gender) ? t("female") : row.gender}</td>
                      <td>
                        <Badge tone="danger">{row.bloodType}</Badge>
                      </td>
                      <td>{row.hemoglobin === null ? "—" : `${row.hemoglobin} ${lang === "en" ? "g/dL" : "غ/دل"}`}</td>
                      <td>{row.initialExam}</td>
                      <td>
                        <Badge tone="success">{lang === "en" ? "Eligible" : "مؤهل"}</Badge>
                      </td>
                      <td>{formatDate(row.registerDate)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                          >
                            {expanded === row.id
                              ? lang === "en" ? "Hide Details" : "إخفاء البيانات"
                              : lang === "en" ? "View Details" : "عرض البيانات"}
                          </Button>
                          <Button size="sm" onClick={() => setLabTarget(row)}>
                            {lang === "en" ? "Viral Test Results" : "نتيجة الفيروسات"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expanded === row.id ? (
                      <tr>
                        <td colSpan={10} className="bg-[var(--bg-elevated)]">
                          <div className="grid gap-x-10 gap-y-1 py-1 sm:grid-cols-2 lg:grid-cols-3">
                            <p className="text-[13px]">
                              <span className="text-muted">{t("phone")}: </span>
                              {row.phone ?? "—"}
                            </p>
                            <p className="text-[13px]">
                              <span className="text-muted">{lang === "en" ? "National ID: " : "الرقم الوطني: "}</span>
                              {row.nationalId ?? "—"}
                            </p>
                            <p className="text-[13px]">
                              <span className="text-muted">{lang === "en" ? "Address: " : "العنوان: "}</span>
                              {row.address ?? "—"}
                            </p>
                            <p className="text-[13px]">
                              <span className="text-muted">{lang === "en" ? "Vital Signs: " : "العلامات الحيوية: "}</span>
                              {row.vitalSigns ?? "—"}
                            </p>
                            <p className="text-[13px]">
                              <span className="text-muted">{lang === "en" ? "Current Status: " : "الحالة الحالية: "}</span>
                              {DONOR_STATUS_LABELS[row.status] ?? row.status}
                            </p>
                            <p className="text-[13px]">
                              <span className="text-muted">{lang === "en" ? "Ineligibility Reason: " : "سبب عدم الأهلية: "}</span>
                              {row.ineligibilityReason ?? "—"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <LabTestDialog
        open={labTarget !== null}
        onClose={() => setLabTarget(null)}
        onSaved={refresh}
        donor={labTarget}
      />

      <DonorDialog
        open={donorDialogOpen}
        onClose={() => setDonorDialogOpen(false)}
        onSaved={refresh}
        donor={null}
      />
    </div>
  );
}
