"use client";

import { useEffect, useState } from "react";
import { apiPatch, apiPost, ApiRequestError } from "@/lib/api";
import { BLOOD_COMPONENTS, BLOOD_TYPES, RH_TYPES, UNIT_STATUSES } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import type { BloodUnit } from "@/lib/types";
import { Button, DatePicker, Field, Modal, SelectInput, TextInput } from "@/components/ui";

type FormState = {
  unitNumber: string;
  bloodType: string;
  rh: string;
  component: string;
  status: string;
  collectionDate: string;
  expiryDate: string;
  quantity: string;
  storageLocation: string;
  sourceCode: string;
};

const emptyForm = (): FormState => ({
  unitNumber: "",
  bloodType: "",
  rh: "",
  component: "",
  status: "available",
  collectionDate: todayISO(),
  expiryDate: "",
  quantity: "1",
  storageLocation: "",
  sourceCode: "",
});

export default function UnitDialog({
  open,
  onClose,
  onSaved,
  unit,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  unit: BloodUnit | null;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (unit) {
      setForm({
        unitNumber: unit.unitNumber,
        bloodType: unit.bloodType,
        rh: unit.rh,
        component: unit.component,
        status: unit.status,
        collectionDate: unit.collectionDate.slice(0, 10),
        expiryDate: unit.expiryDate.slice(0, 10),
        quantity: String(unit.quantity),
        storageLocation: unit.storageLocation,
        sourceCode: unit.sourceCode ?? "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, unit]);

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      if (unit) {
        await apiPatch(`/api/units/${unit.id}`, form);
      } else {
        await apiPost("/api/units", form);
      }
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiRequestError) setErrors(error.errors);
      else setErrors({ form: "تعذر حفظ بيانات الوحدة" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={unit ? "تعديل وحدة دم" : "إضافة وحدة دم"}
      description="بيانات الوحدة داخل مخزون الدم"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رقم الوحدة" required error={errors.unitNumber}>
          <TextInput value={form.unitNumber} onChange={update("unitNumber")} invalid={!!errors.unitNumber} placeholder="مثال: U-2026-001" />
        </Field>
        <Field label="مصدر الوحدة / رقم التبرع" error={errors.sourceCode}>
          <TextInput value={form.sourceCode} onChange={update("sourceCode")} placeholder="كود المتبرع — اختياري" />
        </Field>
        <Field label="فصيلة الدم" required error={errors.bloodType}>
          <SelectInput value={form.bloodType} onChange={update("bloodType")} options={BLOOD_TYPES} invalid={!!errors.bloodType} />
        </Field>
        <Field label="Rh" required error={errors.rh}>
          <SelectInput value={form.rh} onChange={update("rh")} options={RH_TYPES} invalid={!!errors.rh} />
        </Field>
        <Field label="نوع مكوّن الدم" required error={errors.component}>
          <SelectInput value={form.component} onChange={update("component")} options={BLOOD_COMPONENTS} invalid={!!errors.component} />
        </Field>
        <Field label="الحالة" required error={errors.status}>
          <SelectInput value={form.status} onChange={update("status")} options={UNIT_STATUSES} invalid={!!errors.status} />
        </Field>
        <Field label="تاريخ السحب" required error={errors.collectionDate}>
          <DatePicker value={form.collectionDate} onChange={update("collectionDate")} invalid={!!errors.collectionDate} />
        </Field>
        <Field label="تاريخ الانتهاء" required error={errors.expiryDate}>
          <DatePicker value={form.expiryDate} onChange={update("expiryDate")} invalid={!!errors.expiryDate} />
        </Field>
        <Field label="الكمية / عدد الوحدات" required error={errors.quantity}>
          <TextInput value={form.quantity} onChange={update("quantity")} type="number" invalid={!!errors.quantity} />
        </Field>
        <Field label="موقع التخزين" required error={errors.storageLocation}>
          <TextInput value={form.storageLocation} onChange={update("storageLocation")} invalid={!!errors.storageLocation} placeholder="مثال: ثلاجة A — رف 2" />
        </Field>
      </div>
      {errors.form ? <p className="field-error">{errors.form}</p> : null}
    </Modal>
  );
}
