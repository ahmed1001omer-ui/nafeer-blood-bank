"use client";

import { useEffect, useState } from "react";
import { apiPost, ApiRequestError } from "@/lib/api";
import { BLOOD_COMPONENTS, BLOOD_TYPES, HOSPITAL_NAME, URGENCY_OPTIONS } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { Button, DatePicker, Field, Modal, SelectInput, TextArea, TextInput } from "@/components/ui";

type FormState = {
  bloodType: string;
  component: string;
  unitsNeeded: string;
  hospital: string;
  phone: string;
  urgency: string;
  publishDate: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  bloodType: "",
  component: "",
  unitsNeeded: "1",
  hospital: HOSPITAL_NAME,
  phone: "",
  urgency: "normal",
  publishDate: todayISO(),
  notes: "",
});

export default function PostDialog({
  open,
  onClose,
  onSaved,
  presetBloodType,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  presetBloodType?: string;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm({ ...emptyForm(), bloodType: presetBloodType ?? "" });
  }, [open, presetBloodType]);

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      await apiPost("/api/posts", form);
      onSaved();
      onClose();
    } catch (error) {
      const errorMsg =
        error instanceof ApiRequestError
          ? error.message || "تعذر حفظ المنشور"
          : error instanceof Error
          ? error.message
          : "فقدان الاتصال بالشبكة أو الخادم";

      if (error instanceof ApiRequestError) {
        setErrors({
          form: errorMsg,
          ...error.errors,
        });
      } else {
        setErrors({ form: errorMsg });
      }

      // إظهار رسالة التنبيه فورياً عند محاولة النشر دون إنترنت
      window.dispatchEvent(
        new CustomEvent("app:error", {
          detail: { message: errorMsg, forceShow: true },
        })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title="إنشاء منشور احتياج دم"
      description="يتم نشر هذا الاحتياج فورياً للمتبرعين عبر تطبيق الهاتف الذكي مع إمكانية المشاركة عبر واتساب"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "جارٍ النشر..." : "نشر الاحتياج"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="فصيلة الدم المطلوبة" required error={errors.bloodType}>
          <SelectInput
            value={form.bloodType}
            onChange={update("bloodType")}
            options={BLOOD_TYPES}
            invalid={!!errors.bloodType}
          />
        </Field>
        <Field label="نوع مكوّن الدم" required error={errors.component}>
          <SelectInput
            value={form.component}
            onChange={update("component")}
            options={BLOOD_COMPONENTS}
            invalid={!!errors.component}
          />
        </Field>
        <Field label="عدد الوحدات المطلوبة" required error={errors.unitsNeeded}>
          <TextInput
            value={form.unitsNeeded}
            onChange={update("unitsNeeded")}
            type="number"
            invalid={!!errors.unitsNeeded}
          />
        </Field>
        <Field label="درجة الاستعجال" error={errors.urgency}>
          <SelectInput value={form.urgency} onChange={update("urgency")} options={URGENCY_OPTIONS} />
        </Field>
        <Field label="المستشفى / الجهة" required error={errors.hospital}>
          <TextInput value={form.hospital} onChange={update("hospital")} invalid={!!errors.hospital} />
        </Field>
        <Field label="رقم الهاتف" error={errors.phone}>
          <TextInput value={form.phone} onChange={update("phone")} type="tel" placeholder="اختياري" />
        </Field>
        <Field label="تاريخ النشر" required error={errors.publishDate}>
          <DatePicker value={form.publishDate} onChange={update("publishDate")} invalid={!!errors.publishDate} />
        </Field>
        <Field label="ملاحظات" error={errors.notes} className="sm:col-span-2">
          <TextArea value={form.notes} onChange={update("notes")} placeholder="اختياري" />
        </Field>
      </div>
      {errors.form ? <p className="field-error">{errors.form}</p> : null}
    </Modal>
  );
}
