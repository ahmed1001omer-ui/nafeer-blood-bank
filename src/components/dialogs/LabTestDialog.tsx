"use client";

import { useEffect, useState } from "react";
import { apiPost, ApiRequestError } from "@/lib/api";
import {
  DEFERRAL_REASONS,
  FINAL_BAN_REASONS,
  LAB_DECISIONS,
  TEMPORARY_BAN_REASONS,
  TEST_RESULTS,
  DONOR_STATUS_LABELS,
  genderLabel,
} from "@/lib/constants";
import type { Donor } from "@/lib/types";
import {
  Badge,
  Button,
  DatePicker,
  Field,
  Modal,
  Notice,
  ReadOnlyRow,
  SelectInput,
  TextArea,
} from "@/components/ui";
import { formatDate, todayISO, addMonthsISO, addDaysISO } from "@/lib/format";

type FormState = {
  hiv: string;
  hepatitisB: string;
  hepatitisC: string;
  htlv: string;
  syphilis: string;
  malaria: string;
  decision: string;
  reason: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const negativeForm = (): FormState => ({
  hiv: "negative",
  hepatitisB: "negative",
  hepatitisC: "negative",
  htlv: "negative",
  syphilis: "negative",
  malaria: "negative",
  decision: "eligible",
  reason: "",
  startDate: "",
  endDate: "",
  notes: "",
});

const VIRUS_LABELS: { key: keyof FormState; label: string }[] = [
  { key: "hiv", label: "HIV / الإيدز" },
  { key: "hepatitisB", label: "التهاب الكبد الوبائي B" },
  { key: "hepatitisC", label: "التهاب الكبد الوبائي C" },
  { key: "htlv", label: "HTLV" },
  { key: "syphilis", label: "الزهري Syphilis" },
  { key: "malaria", label: "الملاريا" },
];

export default function LabTestDialog({
  open,
  onClose,
  onSaved,
  donor,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  donor: Donor | null;
}) {
  const [form, setForm] = useState<FormState>(negativeForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(negativeForm());
  }, [open, donor]);

  const VIRUS_TO_REASON: Record<string, string> = {
    hiv: "HIV / الإيدز",
    hepatitisB: "التهاب الكبد الوبائي B",
    hepatitisC: "التهاب الكبد الوبائي C",
    htlv: "HTLV",
    syphilis: "الزهري Syphilis",
    malaria: "الملاريا",
  };

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // عند وجود فيروس خطير يكون الحظر النهائي إلزاميًا
      if (["hiv", "hepatitisB", "hepatitisC", "htlv"].includes(key) && value === "positive") {
        next.decision = "final_banned";
        next.reason = VIRUS_TO_REASON[key] ?? next.reason;
        if (!next.startDate) next.startDate = todayISO();
        next.endDate = "";
      }
      if (["syphilis", "malaria"].includes(key) && value === "positive" && next.decision === "eligible") {
        next.decision = "temp_banned";
        next.reason = VIRUS_TO_REASON[key] ?? next.reason;
        if (!next.startDate) next.startDate = todayISO();
        if (!next.endDate) next.endDate = addMonthsISO(todayISO(), 6);
      }
      return next;
    });

  const decisionChanged = (value: string) =>
    setForm((prev) => {
      const next = { ...prev, decision: value };
      if (value === "eligible") {
        next.reason = "";
        next.startDate = "";
        next.endDate = "";
      } else {
        if (!next.startDate) next.startDate = todayISO();
        if (value === "final_banned") {
          next.endDate = "";
          if (!next.reason) next.reason = FINAL_BAN_REASONS[0];
        } else if (value === "temp_banned") {
          if (!next.endDate) next.endDate = addMonthsISO(todayISO(), 6);
          if (!next.reason) next.reason = TEMPORARY_BAN_REASONS[0];
        } else if (value === "deferred") {
          if (!next.endDate) next.endDate = addDaysISO(todayISO(), 30);
          if (!next.reason) next.reason = DEFERRAL_REASONS[0];
        }
      }
      return next;
    });

  const reasons =
    form.decision === "final_banned"
      ? FINAL_BAN_REASONS
      : form.decision === "temp_banned"
        ? TEMPORARY_BAN_REASONS
        : DEFERRAL_REASONS;

  const submit = async () => {
    if (!donor) return;
    setSaving(true);
    setErrors({});
    try {
      await apiPost("/api/lab", { donorId: donor.id, ...form });
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiRequestError) setErrors(error.errors);
      else setErrors({ form: "تعذر حفظ النتيجة" });
    } finally {
      setSaving(false);
    }
  };

  if (!donor) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`نتيجة اختبار الفيروسات — ${donor.name}`}
      description={`كود المتبرع: ${donor.code}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ النتيجة والقرار"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <section>
          <h4 className="mb-3 text-[14px] font-bold text-ink">بيانات المتبرع القادمة من الاستقبال</h4>
          <div className="rounded-[12px] bg-[var(--bg-elevated)] border border-[var(--border-line)] px-4 py-3">
            <div className="grid gap-x-8 sm:grid-cols-2">
              <div>
                <ReadOnlyRow label="كود المتبرع" value={donor.code} />
                <ReadOnlyRow label="الاسم" value={donor.name} />
                <ReadOnlyRow label="العمر" value={donor.age} />
                <ReadOnlyRow label="الجنس" value={genderLabel(donor.gender)} />
                <ReadOnlyRow label="الهاتف" value={donor.phone ?? "—"} />
                <ReadOnlyRow label="الرقم الوطني" value={donor.nationalId ?? "—"} />
              </div>
              <div>
                <ReadOnlyRow label="العنوان" value={donor.address ?? "—"} />
                <ReadOnlyRow label="نتيجة الفحص الأولي" value={donor.initialExam} />
                <ReadOnlyRow label="الفصيلة" value={donor.bloodType} />
                <ReadOnlyRow label="العلامات الحيوية" value={donor.vitalSigns ?? "—"} />
                <ReadOnlyRow label="الهيموجلوبين" value={donor.hemoglobin === null ? "—" : `${donor.hemoglobin} غ/دل`} />
                <ReadOnlyRow
                  label="حالة الأهلية"
                  value={
                    <Badge tone={donor.eligibility === "eligible" ? "success" : "warning"}>
                      {donor.eligibility === "eligible" ? "مؤهل" : "غير مؤهل"}
                    </Badge>
                  }
                />
                <ReadOnlyRow label="تاريخ التسجيل" value={formatDate(donor.registerDate)} />
              </div>
            </div>
            {donor.ineligibilityReason ? (
              <p className="mt-2 text-[12.5px] text-warning">سبب عدم الأهلية: {donor.ineligibilityReason}</p>
            ) : null}
          </div>
        </section>

        <section className="border-t border-[var(--border-line)] pt-5">
          <h4 className="mb-3 text-[14px] font-bold text-ink">نتيجة اختبار الفيروسات</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {VIRUS_LABELS.map((test) => (
              <Field key={test.key} label={test.label} required error={errors[test.key]}>
                <SelectInput
                  value={form[test.key] as string}
                  onChange={update(test.key)}
                  options={TEST_RESULTS}
                  invalid={!!errors[test.key]}
                />
              </Field>
            ))}
          </div>
        </section>

        <section className="border-t border-[var(--border-line)] pt-5">
          <h4 className="mb-3 text-[14px] font-bold text-ink">القرار النهائي</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="النتيجة النهائية"
              required
              error={errors.decision}
              hint={
                ["hiv", "hepatitisB", "hepatitisC", "htlv"].some(
                  (key) => form[key as keyof FormState] === "positive",
                )
                  ? "توجد نتيجة إيجابية لحظر نهائي — القرار إلزامي"
                  : undefined
              }
            >
              <SelectInput
                value={form.decision}
                onChange={decisionChanged}
                options={LAB_DECISIONS}
                invalid={!!errors.decision}
                disabled={["hiv", "hepatitisB", "hepatitisC", "htlv"].some(
                  (key) => form[key as keyof FormState] === "positive",
                )}
              />
            </Field>

            {form.decision !== "eligible" ? (
              <>
                <Field label="السبب" required error={errors.reason}>
                  <SelectInput
                    value={form.reason}
                    onChange={(value) => setForm((prev) => ({ ...prev, reason: value }))}
                    options={reasons}
                    invalid={!!errors.reason}
                  />
                </Field>
                <Field label="تاريخ بداية الحظر" required error={errors.startDate}>
                  <DatePicker
                    value={form.startDate}
                    onChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
                    invalid={!!errors.startDate}
                  />
                </Field>
                {form.decision !== "final_banned" ? (
                  <Field
                    label={form.decision === "deferred" ? "تاريخ السماح بالتبرع" : "تاريخ انتهاء الحظر"}
                    required
                    error={errors.endDate}
                  >
                    <DatePicker
                      value={form.endDate}
                      onChange={(value) => setForm((prev) => ({ ...prev, endDate: value }))}
                      invalid={!!errors.endDate}
                    />
                  </Field>
                ) : null}
              </>
            ) : null}

            <Field label="ملاحظات إضافية" error={errors.notes} className="sm:col-span-2">
              <TextArea
                value={form.notes}
                onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))}
                placeholder="اختياري"
              />
            </Field>
          </div>

          <div className="mt-4">
            {form.decision === "eligible" ? (
              <Notice tone="success">سيتم تحديث حالة المتبرع إلى: مؤهل للتبرع</Notice>
            ) : null}
            {form.decision === "final_banned" ? (
              <Notice tone="danger">
                سيتم نقل المتبرع تلقائيًا إلى القائمة السوداء — حظر نهائي ({DONOR_STATUS_LABELS.final_banned})
              </Notice>
            ) : null}
            {form.decision === "temp_banned" ? (
              <Notice tone="warning">سيتم نقل المتبرع تلقائيًا إلى قائمة الحظر المؤقت</Notice>
            ) : null}
            {form.decision === "deferred" ? (
              <Notice tone="warning">سيتم نقل المتبرع تلقائيًا إلى قائمة حالات التأجيل</Notice>
            ) : null}
          </div>
        </section>
        {errors.form ? <p className="field-error">{errors.form}</p> : null}
      </div>
    </Modal>
  );
}
