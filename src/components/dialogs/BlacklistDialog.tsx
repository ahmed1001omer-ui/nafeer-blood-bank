"use client";

import { useEffect, useState } from "react";
import { apiPost, ApiRequestError } from "@/lib/api";
import {
  DEFERRAL_REASONS,
  FINAL_BAN_REASONS,
  TEMPORARY_BAN_REASONS,
} from "@/lib/constants";
import { addDaysISO, addMonthsISO, todayISO } from "@/lib/format";
import { Button, DatePicker, Field, Modal, SelectInput, TextArea, TextInput } from "@/components/ui";
import { useLanguage } from "@/lib/i18n-context";

type FormState = {
  type: "final" | "temporary" | "deferral";
  donorCode: string;
  donorName: string;
  reason: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export default function BlacklistDialog({
  open,
  onClose,
  onSaved,
  initialType = "final",
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialType?: "final" | "temporary" | "deferral";
}) {
  const { lang, t } = useLanguage();
  const [form, setForm] = useState<FormState>({
    type: initialType,
    donorCode: "",
    donorName: "",
    reason: "",
    startDate: todayISO(),
    endDate: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    const defReason =
      initialType === "final"
        ? FINAL_BAN_REASONS[0]
        : initialType === "temporary"
          ? TEMPORARY_BAN_REASONS[0]
          : DEFERRAL_REASONS[0];

    const defEnd =
      initialType === "temporary"
        ? addMonthsISO(todayISO(), 6)
        : initialType === "deferral"
          ? addDaysISO(todayISO(), 30)
          : "";

    setForm({
      type: initialType,
      donorCode: "",
      donorName: "",
      reason: defReason,
      startDate: todayISO(),
      endDate: defEnd,
      notes: "",
    });
  }, [open, initialType]);

  const handleTypeChange = (typeVal: string) => {
    const nextType = typeVal as "final" | "temporary" | "deferral";
    const nextReason =
      nextType === "final"
        ? FINAL_BAN_REASONS[0]
        : nextType === "temporary"
          ? TEMPORARY_BAN_REASONS[0]
          : DEFERRAL_REASONS[0];

    const nextEnd =
      nextType === "temporary"
        ? addMonthsISO(todayISO(), 6)
        : nextType === "deferral"
          ? addDaysISO(todayISO(), 30)
          : "";

    setForm((prev) => ({
      ...prev,
      type: nextType,
      reason: nextReason,
      endDate: nextEnd,
    }));
  };

  const reasonsList =
    form.type === "final"
      ? FINAL_BAN_REASONS
      : form.type === "temporary"
        ? TEMPORARY_BAN_REASONS
        : DEFERRAL_REASONS;

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      await apiPost("/api/blacklist", form);
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiRequestError) setErrors(error.errors);
      else setErrors({ form: lang === "en" ? "Failed to save blacklist entry" : "تعذر حفظ بيانات الحظر" });
    } finally {
      setSaving(false);
    }
  };

  const TYPE_OPTIONS = [
    { value: "final", label: lang === "en" ? "Permanent Ban" : "حظر نهائي" },
    { value: "temporary", label: lang === "en" ? "Temporary Ban" : "حظر مؤقت" },
    { value: "deferral", label: lang === "en" ? "Deferral" : "تأجيل تبرع" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lang === "en" ? "Add to Blacklist / Deferral" : "إضافة إلى القائمة السوداء / التأجيل"}
      description={lang === "en" ? "Manually record a donor ban or deferral" : "تسجيل حظر أو تأجيل لمتبرع بشكل يدوي"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="danger" onClick={submit} disabled={saving}>
            {saving ? (lang === "en" ? "Saving..." : "جارٍ الحفظ...") : lang === "en" ? "Confirm & Ban" : "تأكيد وإدراج بالحظر"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={lang === "en" ? "Ban Type" : "نوع الحظر أو الإجراء"} required error={errors.type}>
          <SelectInput
            value={form.type}
            onChange={handleTypeChange}
            options={TYPE_OPTIONS}
            invalid={!!errors.type}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={lang === "en" ? "Donor Name" : "اسم المتبرع"} required error={errors.donorName}>
            <TextInput
              value={form.donorName}
              onChange={(val) => setForm((p) => ({ ...p, donorName: val }))}
              placeholder={lang === "en" ? "Full name" : "الاسم ثلاثي أو رباعي"}
              invalid={!!errors.donorName}
            />
          </Field>

          <Field
            label={lang === "en" ? "Donor Code (optional)" : "كود المتبرع (اختياري)"}
            error={errors.donorCode}
            hint={lang === "en" ? "Auto-generated if left empty" : "يولد تلقائياً إذا تُرِك فارغاً"}
          >
            <TextInput
              value={form.donorCode}
              onChange={(val) => setForm((p) => ({ ...p, donorCode: val }))}
              placeholder="DNR-xxxx"
              invalid={!!errors.donorCode}
            />
          </Field>
        </div>

        <Field label={lang === "en" ? "Reason" : "السبب"} required error={errors.reason}>
          <SelectInput
            value={form.reason}
            onChange={(val) => setForm((p) => ({ ...p, reason: val }))}
            options={reasonsList}
            invalid={!!errors.reason}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={lang === "en" ? "Start Date" : "تاريخ البداية"} required error={errors.startDate}>
            <DatePicker
              value={form.startDate}
              onChange={(val) => setForm((p) => ({ ...p, startDate: val }))}
              invalid={!!errors.startDate}
            />
          </Field>

          {form.type !== "final" ? (
            <Field
              label={form.type === "deferral" ? (lang === "en" ? "Eligible Date" : "تاريخ السماح بالتبرع") : (lang === "en" ? "Expiry Date" : "تاريخ انتهاء الحظر")}
              required
              error={errors.endDate}
            >
              <DatePicker
                value={form.endDate}
                onChange={(val) => setForm((p) => ({ ...p, endDate: val }))}
                invalid={!!errors.endDate}
              />
            </Field>
          ) : null}
        </div>

        <Field label={lang === "en" ? "Additional Notes" : "ملاحظات إضافية"} error={errors.notes}>
          <TextArea
            value={form.notes}
            onChange={(val) => setForm((p) => ({ ...p, notes: val }))}
            placeholder={lang === "en" ? "Optional details or clinical reports" : "تفاصيل التقرير الطبي أو أسباب الحظر (اختياري)"}
          />
        </Field>

        {errors.form ? <p className="field-error">{errors.form}</p> : null}
      </div>
    </Modal>
  );
}
