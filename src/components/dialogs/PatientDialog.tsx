"use client";

import { useEffect, useState } from "react";
import { apiPatch, apiPost, ApiRequestError } from "@/lib/api";
import { BLOOD_TYPES, GENDERS, HOSPITAL_NAME } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import type { Patient } from "@/lib/types";
import { Button, DatePicker, Field, Modal, SelectInput, TextInput } from "@/components/ui";
import { useLanguage } from "@/lib/i18n-context";

type FormState = {
  name: string;
  age: string;
  nationalId: string;
  phone: string;
  bloodType: string;
  hospital: string;
  gender: string;
  recordDate: string;
};

const emptyForm = (): FormState => ({
  name: "",
  age: "",
  nationalId: "",
  phone: "",
  bloodType: "",
  hospital: HOSPITAL_NAME,
  gender: "",
  recordDate: todayISO(),
});

function normalizeGender(g: string | null | undefined): string {
  if (!g) return "";
  const lower = g.trim().toLowerCase();
  if (lower === "male" || lower === "m" || lower === "ذكر") return "male";
  if (lower === "female" || lower === "f" || lower === "أنثى") return "female";
  return g;
}

export default function PatientDialog({
  open,
  onClose,
  onSaved,
  patient,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  patient: Patient | null;
}) {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (patient) {
      setForm({
        name: patient.name,
        age: patient.age ? String(patient.age) : "",
        nationalId: patient.nationalId ?? "",
        phone: patient.phone ?? "",
        bloodType: patient.bloodType,
        hospital: patient.hospital,
        gender: normalizeGender(patient.gender),
        recordDate: patient.recordDate ? patient.recordDate.slice(0, 10) : todayISO(),
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, patient]);

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      if (patient) {
        await apiPatch(`/api/patients/${patient.id}`, form);
      } else {
        await apiPost("/api/patients", form);
      }
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiRequestError) setErrors(error.errors);
      else setErrors({ form: lang === "en" ? "Failed to save data" : "تعذر حفظ البيانات" });
    } finally {
      setSaving(false);
    }
  };

  const genderOptions = GENDERS.map((g) => ({
    value: g.value,
    label: g.value === "male" ? t("male") : t("female"),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={patient ? (lang === "en" ? "Edit Patient Data" : "تعديل بيانات المريض") : t("addPatient")}
      description={
        lang === "en"
          ? "Enter patient details registered through the reception department"
          : "أدخل بيانات المريض المسجل من خلال قسم الاستقبال"
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? (lang === "en" ? "Saving..." : "جارٍ الحفظ...") : t("save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={lang === "en" ? "Patient Name" : "اسم المريض"} required error={errors.name}>
          <TextInput
            value={form.name}
            onChange={update("name")}
            invalid={!!errors.name}
            placeholder={lang === "en" ? "Full Name" : "الاسم الكامل"}
          />
        </Field>
        <Field
          label={lang === "en" ? "Admission / Record Date" : "تاريخ تسجيل الحالة"}
          required
          error={errors.recordDate}
          hint={lang === "en" ? "Date of hospital entry" : "تاريخ دخول المريض وتسجيل الملف"}
        >
          <DatePicker value={form.recordDate} onChange={update("recordDate")} invalid={!!errors.recordDate} />
        </Field>
        <Field label={t("age")} required error={errors.age}>
          <TextInput
            value={form.age}
            onChange={update("age")}
            invalid={!!errors.age}
            type="number"
            placeholder={lang === "en" ? "Enter age" : "أدخل العمر"}
          />
        </Field>
        <Field label={t("gender")} required error={errors.gender}>
          <SelectInput
            value={form.gender}
            onChange={update("gender")}
            options={genderOptions}
            invalid={!!errors.gender}
            placeholder={lang === "en" ? "Select Gender" : "اختر الجنس"}
          />
        </Field>
        <Field label={t("bloodType")} required error={errors.bloodType}>
          <SelectInput
            value={form.bloodType}
            onChange={update("bloodType")}
            options={BLOOD_TYPES}
            invalid={!!errors.bloodType}
            placeholder={lang === "en" ? "Select Blood Type" : "اختر الفصيلة"}
          />
        </Field>
        <Field label={t("phone")} error={errors.phone}>
          <TextInput
            value={form.phone}
            onChange={update("phone")}
            type="tel"
            placeholder={lang === "en" ? "Optional" : "اختياري"}
          />
        </Field>
        <Field label={lang === "en" ? "National ID" : "الرقم الوطني"} error={errors.nationalId}>
          <TextInput
            value={form.nationalId}
            onChange={update("nationalId")}
            placeholder={lang === "en" ? "Optional" : "اختياري"}
          />
        </Field>
        <Field label={lang === "en" ? "Hospital / Entity" : "اسم المستشفى أو الجهة"} required error={errors.hospital}>
          <TextInput value={form.hospital} onChange={update("hospital")} invalid={!!errors.hospital} />
        </Field>
      </div>
      {errors.form ? <p className="field-error">{errors.form}</p> : null}
    </Modal>
  );
}
