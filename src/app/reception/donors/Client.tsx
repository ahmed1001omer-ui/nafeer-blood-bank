"use client";

import { useMemo, useState } from "react";
import DonorDialog from "@/components/dialogs/DonorDialog";
import { apiDelete, apiPatch, useResource } from "@/lib/api";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { BLOOD_TYPES, DONOR_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";
import type { Donor } from "@/lib/types";

const statusTone = (status: string) => {
  if (status === "waiting_lab") return "info";
  if (status === "eligible") return "success";
  if (status === "final_banned") return "danger";
  if (status === "temp_banned" || status === "deferred") return "warning";
  return "neutral";
};

export default function DonorsPage() {
  const { t, lang } = useLanguage();
  const { data, loading, refresh } = useResource<{ donors: Donor[] }>("/api/donors");
  const canAccess = useCan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Donor | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Donor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [search, setSearch] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const getGenderLabel = (g: string) => {
    if (g === "male" || g === "M" || g === "ذكر") return t("male");
    if (g === "female" || g === "F" || g === "أنثى") return t("female");
    return g;
  };

  const STATUS_FILTERS = [
    { value: "waiting_lab", label: lang === "en" ? "Pending Lab Check" : "بانتظار فحص المختبر" },
    { value: "eligible", label: lang === "en" ? "Eligible for Donation" : "مؤهل للتبرع" },
    { value: "temp_banned", label: lang === "en" ? "Temporarily Banned" : "محظور مؤقتًا" },
    { value: "final_banned", label: lang === "en" ? "Permanently Banned" : "محظور نهائيًا" },
    { value: "deferred", label: lang === "en" ? "Deferred" : "مؤجل" },
    { value: "reception_rejected", label: lang === "en" ? "Not Eligible" : "غير مؤهل" },
  ];

  const donors = useMemo(() => data?.donors ?? [], [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return donors.filter((row) => {
      if (
        query &&
        !row.name.toLowerCase().includes(query) &&
        !row.code.toLowerCase().includes(query) &&
        !row.bloodType.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (bloodType && row.bloodType !== bloodType) return false;
      if (status && row.status !== status) return false;
      return true;
    });
  }, [donors, search, bloodType, status]);

  const sendToLab = async (donor: Donor) => {
    setBusyId(donor.id);
    try {
      await apiPatch(`/api/donors/${donor.id}`, { eligibility: "eligible" });
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiDelete(`/api/donors/${deleteTarget.id}`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : (lang === "en" ? "Failed to delete donor" : "تعذر حذف المتبرع"));
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = Boolean(search || bloodType || status);

  return (
    <div>
      <PageHeader
        title={t("donors")}
        description={
          lang === "en"
            ? "Donors registered through the reception staff"
            : "المتبرعون الذين تم تسجيلهم بواسطة موظف الاستقبال"
        }
        action={
          canAccess("donors", "create") ? (
            <Button
              onClick={() => {
                setSelected(null);
                setDialogOpen(true);
              }}
            >
              {t("addDonor")}
            </Button>
          ) : null
        }
      />

      <Card padding="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="min-w-[220px] flex-1">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder={lang === "en" ? "Search name, code, or blood type" : "بحث بالاسم أو الكود أو الفصيلة"}
            />
          </div>
          <div className="w-[150px]">
            <SelectInput
              value={bloodType}
              onChange={setBloodType}
              options={BLOOD_TYPES}
              placeholder={lang === "en" ? "All blood types" : "كل الفصائل"}
            />
          </div>
          <div className="w-[210px]">
            <SelectInput
              value={status}
              onChange={setStatus}
              options={STATUS_FILTERS}
              placeholder={lang === "en" ? "All statuses" : "كل الحالات"}
            />
          </div>
          {hasFilters ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setBloodType("");
                setStatus("");
              }}
            >
              {t("reset")}
            </Button>
          ) : null}
        </div>

        {loading ? (
          <EmptyState title={t("loading")} />
        ) : donors.length === 0 ? (
          <EmptyState
            title={lang === "en" ? "No donors registered" : "لا يوجد متبرعون مسجلون"}
            description={
              lang === "en"
                ? "Click Add Donor to register the first donor"
                : "اضغط على إضافة متبرع لتسجيل أول متبرع في النظام"
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t("noData")}
            description={lang === "en" ? "Try changing search or filters" : "جرّب تغيير البحث أو عوامل التصفية"}
          />
        ) : (
          <div className="table-wrap border-t border-[var(--border-line)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "Donor Code" : "كود المتبرع"}</th>
                  <th>{t("name")}</th>
                  <th>{t("age")}</th>
                  <th>{t("gender")}</th>
                  <th>{t("phone")}</th>
                  <th>{t("bloodType")}</th>
                  <th>{lang === "en" ? "Hemoglobin" : "الهيموجلوبين"}</th>
                  <th>{lang === "en" ? "Eligibility" : "حالة الأهلية"}</th>
                  <th>{t("status")}</th>
                  <th>{lang === "en" ? "Registration Date" : "تاريخ التسجيل"}</th>
                  {canAccess("donors", "update") || canAccess("donors", "delete") ? <th>{t("actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
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
                    <td>{getGenderLabel(row.gender)}</td>
                    <td>{row.phone ?? "—"}</td>
                    <td>
                      <Badge tone="danger">{row.bloodType}</Badge>
                    </td>
                    <td>{row.hemoglobin === null ? "—" : row.hemoglobin}</td>
                    <td>
                      <Badge tone={row.eligibility === "eligible" ? "success" : "warning"}>
                        {row.eligibility === "eligible"
                          ? lang === "en" ? "Eligible" : "مؤهل"
                          : lang === "en" ? "Ineligible" : "غير مؤهل"}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={statusTone(row.status)}>
                        {DONOR_STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </td>
                    <td>{formatDate(row.registerDate)}</td>
                    {canAccess("donors", "update") || canAccess("donors", "delete") ? (
                      <td>
                        <div className="flex items-center gap-2">
                          {canAccess("donors", "update") && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelected(row);
                                setDialogOpen(true);
                              }}
                            >
                              {t("edit")}
                            </Button>
                          )}
                          {canAccess("donors", "update") && row.eligibility === "eligible" && row.stage === "reception" && (
                            <Button size="sm" disabled={busyId === row.id} onClick={() => sendToLab(row)}>
                              {lang === "en" ? "Send to Lab" : "إرسال للمختبر"}
                            </Button>
                          )}
                          {canAccess("donors", "delete") && (
                            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(row)}>
                              {t("delete")}
                            </Button>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DonorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
        donor={selected}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(""); }}
        title={lang === "en" ? "Delete Donor" : "حذف متبرع"}
        description={lang === "en" ? "This action cannot be undone" : "هذا الإجراء لا يمكن التراجع عنه"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? (lang === "en" ? "Deleting..." : "جاري الحذف...") : t("delete")}
            </Button>
          </>
        }
      >
        <div className="py-2">
          {deleteError && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-ink">
            {lang === "en"
              ? `Are you sure you want to delete donor record for "${deleteTarget?.name}" (${deleteTarget?.code})?`
              : `هل أنت تأكد من رغبتك في حذف سجل المتبرع "${deleteTarget?.name}" (${deleteTarget?.code})؟`}
          </p>
        </div>
      </Modal>
    </div>
  );
}
