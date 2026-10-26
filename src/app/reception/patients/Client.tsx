"use client";

import { useMemo, useState } from "react";
import PatientDialog from "@/components/dialogs/PatientDialog";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { BLOOD_TYPES, GENDERS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { apiDelete, useResource } from "@/lib/api";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";
import type { Patient } from "@/lib/types";

export default function PatientsPage() {
  const { t, lang } = useLanguage();
  const { data, loading, refresh } = useResource<{ patients: Patient[] }>("/api/patients");
  const canAccess = useCan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [search, setSearch] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [gender, setGender] = useState("");
  const [date, setDate] = useState("");

  const getGenderLabel = (g: string) => {
    if (g === "male" || g === "M" || g === "ذكر") return t("male");
    if (g === "female" || g === "F" || g === "أنثى") return t("female");
    return g;
  };

  const patients = useMemo(() => data?.patients ?? [], [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return patients.filter((row) => {
      if (query && !row.name.toLowerCase().includes(query) && !row.bloodType.toLowerCase().includes(query)) {
        return false;
      }
      if (bloodType && row.bloodType !== bloodType) return false;
      if (gender && row.gender !== gender) return false;
      if (date && row.recordDate.slice(0, 10) !== date) return false;
      return true;
    });
  }, [patients, search, bloodType, gender, date]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiDelete(`/api/patients/${deleteTarget.id}`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : (lang === "en" ? "Failed to delete patient" : "تعذر حذف المريض"));
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = Boolean(search || bloodType || gender || date);

  return (
    <div>
      <PageHeader
        title={t("patients")}
        description={
          lang === "en"
            ? "Patients registered through the reception department"
            : "المرضى الذين تم تسجيلهم من خلال قسم الاستقبال"
        }
        action={
          canAccess("patients", "create") ? (
            <Button
              onClick={() => {
                setSelected(null);
                setDialogOpen(true);
              }}
            >
              {t("addPatient")}
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
              placeholder={lang === "en" ? "Search patient name or blood type" : "بحث باسم المريض أو فصيلة الدم"}
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
          <div className="w-[140px]">
            <SelectInput
              value={gender}
              onChange={setGender}
              options={GENDERS.map((g) => ({
                value: g.value,
                label: getGenderLabel(g.value),
              }))}
              placeholder={t("gender")}
            />
          </div>
          <div className="w-[150px]">
            <TextInput value={date} onChange={setDate} type="date" placeholder={t("date")} />
          </div>
          {hasFilters ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setBloodType("");
                setGender("");
                setDate("");
              }}
            >
              {t("reset")}
            </Button>
          ) : null}
        </div>

        {loading ? (
          <EmptyState title={t("loading")} />
        ) : patients.length === 0 ? (
          <EmptyState
            title={lang === "en" ? "No patients registered" : "لا يوجد مرضى مسجلون"}
            description={
              lang === "en"
                ? "Click Add Patient to register the first patient"
                : "اضغط على إضافة مريض لتسجيل أول مريض في النظام"
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
                  <th>{t("name")}</th>
                  <th>{t("age")}</th>
                  <th>{t("gender")}</th>
                  <th>{t("bloodType")}</th>
                  <th>{lang === "en" ? "Hospital / Org" : "المستشفى / الجهة"}</th>
                  <th>{t("phone")}</th>
                  <th>{lang === "en" ? "National ID" : "الرقم الوطني"}</th>
                  <th>{t("date")}</th>
                  {canAccess("patients", "update") || canAccess("patients", "delete") ? <th>{t("actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.name}</td>
                    <td>{row.age}</td>
                    <td>{getGenderLabel(row.gender)}</td>
                    <td>
                      <Badge tone="danger">{row.bloodType}</Badge>
                    </td>
                    <td>{row.hospital}</td>
                    <td>{row.phone ?? "—"}</td>
                    <td>{row.nationalId ?? "—"}</td>
                    <td>{formatDate(row.recordDate)}</td>
                    {canAccess("patients", "update") || canAccess("patients", "delete") ? (
                      <td>
                        <div className="flex items-center gap-2">
                          {canAccess("patients", "update") && (
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
                          {canAccess("patients", "delete") && (
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

      <PatientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
        patient={selected}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(""); }}
        title={lang === "en" ? "Delete Patient" : "حذف مريض"}
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
              ? `Are you sure you want to delete patient record for "${deleteTarget?.name}"?`
              : `هل أنت تأكد من رغبتك في حذف سجل المريض "${deleteTarget?.name}"؟`}
          </p>
        </div>
      </Modal>
    </div>
  );
}
