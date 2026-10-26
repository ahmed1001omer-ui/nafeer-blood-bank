"use client";

import { useEffect, useState } from "react";
import { apiPost, ApiRequestError } from "@/lib/api";
import { rhLabel, unitStatusLabel } from "@/lib/constants";
import { daysUntil, todayISO } from "@/lib/format";
import type { BloodUnit } from "@/lib/types";
import { Button, DatePicker, Field, Modal, Notice, SelectInput, TextArea, TextInput } from "@/components/ui";

const TYPES = [
  { value: "transfer", label: "نقل بين مواقع التخزين" },
  { value: "discard", label: "إتلاف الوحدة" },
];

export default function MovementDialog({
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
  const [type, setType] = useState("transfer");
  const [toLocation, setToLocation] = useState("");
  const [reason, setReason] = useState("");
  const [movementDate, setMovementDate] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType("transfer");
    setToLocation("");
    setReason("");
    setMovementDate(todayISO());
    setErrors({});
  }, [open]);

  const submit = async () => {
    if (!unit) return;
    setSaving(true);
    setErrors({});
    try {
      await apiPost("/api/movements", { unitId: unit.id, type, toLocation, reason, movementDate });
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrors(error.errors);
        if (Object.keys(error.errors).length === 0) setErrors({ form: error.message });
      } else setErrors({ form: "تعذر تنفيذ الحركة" });
    } finally {
      setSaving(false);
    }
  };

  if (!unit) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-lg"
      title={`حركة على الوحدة ${unit.unitNumber}`}
      description={`${unit.bloodType}${rhLabel(unit.rh)} — ${unitStatusLabel(unit.status)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button variant={type === "discard" ? "danger" : "primary"} onClick={submit} disabled={saving}>
            {saving ? "جارٍ التنفيذ..." : type === "discard" ? "إتلاف" : "نقل"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="نوع الحركة" required>
          <SelectInput value={type} onChange={setType} options={TYPES} />
        </Field>
        {type === "transfer" ? (
          <Field label="الموقع الجديد" required error={errors.toLocation} hint={`الموقع الحالي: ${unit.storageLocation}`}>
            <TextInput value={toLocation} onChange={setToLocation} invalid={!!errors.toLocation} placeholder="مثال: ثلاجة B — رف 3" />
          </Field>
        ) : null}
        <Field label="تاريخ الحركة" required error={errors.movementDate}>
          <DatePicker value={movementDate} onChange={setMovementDate} invalid={!!errors.movementDate} />
        </Field>
        <Field label="السبب / ملاحظات" error={errors.reason}>
          <TextArea value={reason} onChange={setReason} placeholder="اختياري" />
        </Field>
        {type === "discard" ? (
          <Notice tone="warning">
            سيتم تغيير حالة الوحدة إلى مرفوض/متلف. الوحدة تنتهي بعد {daysUntil(unit.expiryDate)} يوم.
          </Notice>
        ) : null}
        {errors.form ? <Notice tone="danger">{errors.form}</Notice> : null}
      </div>
    </Modal>
  );
}
