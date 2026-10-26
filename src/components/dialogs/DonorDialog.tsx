"use client";

import { useEffect, useState } from "react";
import { apiPatch, apiPost, ApiRequestError } from "@/lib/api";
import {
  BLOOD_TYPES,
  GENDERS,
  INITIAL_EXAM_RESULTS,
} from "@/lib/constants";
import { todayISO } from "@/lib/format";
import type { Donor } from "@/lib/types";
import { Button, DatePicker, Field, Modal, Notice, SelectInput, TextInput } from "@/components/ui";
import { useLanguage } from "@/lib/i18n-context";

type FormState = {
  code: string;
  name: string;
  age: string;
  gender: string;
  phone: string;
  nationalId: string;
  address: string;
  initialExam: string;
  bloodType: string;
  vitalSigns: string;
  hemoglobin: string;
  eligibility: string;
  ineligibilityReason: string;
  registerDate: string;
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  age: "",
  gender: "male",
  phone: "",
  nationalId: "",
  address: "",
  initialExam: "مطابق للشروط",
  bloodType: "O+",
  vitalSigns: "",
  hemoglobin: "",
  eligibility: "eligible",
  ineligibilityReason: "",
  registerDate: todayISO(),
});

function normalizeGender(g: string | null | undefined): string {
  if (!g) return "male";
  const lower = g.trim().toLowerCase();
  if (lower === "male" || lower === "m" || lower === "ذكر") return "male";
  if (lower === "female" || lower === "f" || lower === "أنثى") return "female";
  return g;
}

export default function DonorDialog({
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
  const { t, lang } = useLanguage();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const ELIGIBILITY_OPTIONS = [
    { value: "eligible", label: lang === "en" ? "Eligible" : "مؤهل" },
    { value: "not_eligible", label: lang === "en" ? "Not Eligible" : "غير مؤهل" },
  ];

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (donor) {
      setForm({
        code: donor.code,
        name: donor.name,
        age: donor.age ? String(donor.age) : "",
        gender: normalizeGender(donor.gender),
        phone: donor.phone ?? "",
        nationalId: donor.nationalId ?? "",
        address: donor.address ?? "",
        initialExam: donor.initialExam || "مطابق للشروط",
        bloodType: donor.bloodType || "O+",
        vitalSigns: donor.vitalSigns ?? "",
        hemoglobin: donor.hemoglobin === null ? "" : String(donor.hemoglobin),
        eligibility: donor.eligibility || "eligible",
        ineligibilityReason: donor.ineligibilityReason ?? "",
        registerDate: donor.registerDate ? donor.registerDate.slice(0, 10) : todayISO(),
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, donor]);

  const update = (key: keyof FormState) => (value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "initialExam") {
        if (value === "مطابق للشروط") {
          next.eligibility = "eligible";
          next.ineligibilityReason = "";
        } else if (value === "غير مطابق للشروط" || value === "يحتاج إعادة الفحص") {
          next.eligibility = "not_eligible";
        }
      }
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    setErrors({});

    const clientErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      clientErrors.name = lang === "en" ? "Donor name is required" : "اسم المتبرع مطلوب";
    }
    const ageNum = Number(form.age);
    if (!form.age.trim() || !Number.isFinite(ageNum) || ageNum <= 0) {
      clientErrors.age = lang === "en" ? "Age is required and must be a valid number" : "العمر مطلوب ويجب أن يكون رقمًا صحيحًا";
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...form,
        code: form.code.trim() || `DNR-${Math.floor(1000 + Math.random() * 9000)}`,
        initialExam: form.initialExam || "مطابق للشروط",
        eligibility: form.eligibility || "eligible",
        bloodType: form.bloodType || "O+",
        gender: form.gender || "male",
        registerDate: form.registerDate || todayISO(),
      };
      if (donor) {
        await apiPatch(`/api/donors/${donor.id}`, payload);
      } else {
        await apiPost("/api/donors", payload);
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

  const hemoglobinValue = Number(form.hemoglobin);
  const genderOptions = GENDERS.map((g) => ({
    value: g.value,
    label: g.value === "male" ? t("male") : t("female"),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={donor ? (lang === "en" ? "Edit Donor Data" : "تعديل بيانات المتبرع") : t("addDonor")}
      description={
        donor
          ? (lang === "en" ? "Edit any field individually then save" : "يمكنك تعديل أي حقل على حدة ثم الحفظ")
          : (lang === "en" ? "Register new donor by reception staff" : "تسجيل متبرع جديد بواسطة موظف الاستقبال")
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
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-brand" />
            <h4 className="text-[14px] font-bold text-ink">{lang === "en" ? "Personal Details" : "البيانات الشخصية"}</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={lang === "en" ? "Donor Code" : "كود المتبرع"}
              error={errors.code}
              hint={lang === "en" ? "Unique ID (optional, auto-generated if left empty)" : "كود فريد لا يتكرر (اختياري، يولد تلقائياً إذا تُرِك فارغاً)"}
            >
              <TextInput value={form.code} onChange={update("code")} invalid={!!errors.code} placeholder={lang === "en" ? "e.g. 99-3365 (or leave empty)" : "مثال: 99-3365 (أو اتركه فارغاً)"} />
            </Field>
            <Field
              label={lang === "en" ? "Registration Date" : "تاريخ تسجيل المتبرع"}
              required
              error={errors.registerDate}
              hint={lang === "en" ? "Date of donor visit" : "تاريخ مراجعة المتبرع وبداية الفحص"}
            >
              <DatePicker value={form.registerDate} onChange={update("registerDate")} invalid={!!errors.registerDate} />
            </Field>
            <Field label={lang === "en" ? "Donor Name" : "اسم المتبرع"} required error={errors.name}>
              <TextInput value={form.name} onChange={update("name")} invalid={!!errors.name} placeholder={lang === "en" ? "Full Name" : "الاسم الكامل"} />
            </Field>
            <Field label={t("age")} required error={errors.age}>
              <TextInput value={form.age} onChange={update("age")} type="number" invalid={!!errors.age} placeholder={lang === "en" ? "Enter age" : "أدخل العمر"} />
            </Field>
            <Field label={t("gender")} required error={errors.gender}>
              <SelectInput value={form.gender} onChange={update("gender")} options={genderOptions} invalid={!!errors.gender} placeholder={lang === "en" ? "Select Gender" : "اختر الجنس"} />
            </Field>
            <Field label={t("phone")} error={errors.phone}>
              <TextInput value={form.phone} onChange={update("phone")} type="tel" placeholder={lang === "en" ? "Optional" : "اختياري"} />
            </Field>
            <Field label={lang === "en" ? "National ID" : "الرقم الوطني"} error={errors.nationalId}>
              <TextInput value={form.nationalId} onChange={update("nationalId")} placeholder={lang === "en" ? "Optional" : "اختياري"} />
            </Field>
            <Field label={lang === "en" ? "Address" : "العنوان"} error={errors.address} className="sm:col-span-2">
              <TextInput value={form.address} onChange={update("address")} placeholder={lang === "en" ? "Optional" : "اختياري"} />
            </Field>
          </div>
        </section>

        <section className="border-t border-[var(--border-line)] pt-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-brand" />
            <h4 className="text-[14px] font-bold text-ink">{lang === "en" ? "Medical Details" : "البيانات الطبية"}</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={lang === "en" ? "Initial Exam Result" : "نتيجة الفحص الأولي"}
              error={errors.initialExam}
              hint={lang === "en" ? "Defaults to compliant" : "افتراضياً: مطابق للشروط"}
            >
              <SelectInput
                value={form.initialExam}
                onChange={update("initialExam")}
                options={INITIAL_EXAM_RESULTS}
                invalid={!!errors.initialExam}
              />
            </Field>
            <Field
              label={t("bloodType")}
              error={errors.bloodType}
              hint={lang === "en" ? "Defaults to O+ if not tested yet" : "افتراضياً: O+ إن لم تُفحص بعد"}
            >
              <SelectInput
                value={form.bloodType}
                onChange={update("bloodType")}
                options={BLOOD_TYPES}
                invalid={!!errors.bloodType}
              />
            </Field>
            <Field label={lang === "en" ? "Vital Signs" : "العلامات الحيوية"} error={errors.vitalSigns} hint={lang === "en" ? "e.g. BP 120/80 — Pulse 78" : "مثال: الضغط 120/80 — النبض 78"}>
              <TextInput value={form.vitalSigns} onChange={update("vitalSigns")} placeholder={lang === "en" ? "Optional" : "اختياري"} />
            </Field>
            <Field
              label={lang === "en" ? "Hemoglobin" : "الهيموجلوبين"}
              error={errors.hemoglobin}
              hint={
                Number.isFinite(hemoglobinValue) && form.hemoglobin !== "" && hemoglobinValue < 12.5
                  ? (lang === "en" ? "Below 12.5 g/dL — Registered as deferral in lab" : "أقل من 12.5 — تُسجل كحالة تأجيل في المختبر")
                  : (lang === "en" ? "g/dL" : "غ/دل")
              }
            >
              <TextInput value={form.hemoglobin} onChange={update("hemoglobin")} type="number" placeholder={lang === "en" ? "e.g. 13.4" : "مثال: 13.4"} />
            </Field>
            <Field label={lang === "en" ? "Eligibility Status" : "حالة الأهلية للتبرع"} error={errors.eligibility}>
              <SelectInput
                value={form.eligibility}
                onChange={update("eligibility")}
                options={ELIGIBILITY_OPTIONS}
                invalid={!!errors.eligibility}
              />
            </Field>
            {form.eligibility === "not_eligible" ? (
              <Field label={lang === "en" ? "Ineligibility Reason" : "سبب عدم الأهلية"} required error={errors.ineligibilityReason}>
                <TextInput
                  value={form.ineligibilityReason}
                  onChange={update("ineligibilityReason")}
                  invalid={!!errors.ineligibilityReason}
                />
              </Field>
            ) : null}
          </div>
        </section>

        {form.eligibility === "eligible" ? (
          <Notice tone="success">
            {lang === "en"
              ? "Eligible donor will be registered as pending viral test results and automatically transferred to the lab page."
              : "المتبرع المؤهل سيُسجل بحالة: مؤهل — بانتظار نتيجة فحص الفيروسات، وستنتقل بياناته تلقائيًا إلى صفحة المختبر."}
          </Notice>
        ) : null}
        {form.eligibility === "not_eligible" ? (
          <Notice tone="warning">
            {lang === "en"
              ? "Ineligible donor will not proceed to donation stage, and reason will be saved in their file."
              : "المتبرع غير المؤهل لن ينتقل إلى مرحلة التبرع، وسيتم تسجيل سبب عدم الأهلية في سجله."}
          </Notice>
        ) : null}
        {errors.form ? <p className="field-error">{errors.form}</p> : null}
      </div>
    </Modal>
  );
}
