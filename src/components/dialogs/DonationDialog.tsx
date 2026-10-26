"use client";

import { useEffect, useState } from "react";
import { apiPost, ApiRequestError, useResource } from "@/lib/api";
import { DONATION_STATUSES } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import type { Donor } from "@/lib/types";
import { Button, DatePicker, Field, Modal, SelectInput, TextArea, TextInput } from "@/components/ui";

export default function DonationDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data } = useResource<{ donors: Donor[] }>("/api/donors");
  const [donorId, setDonorId] = useState("");
  const [quantityMl, setQuantityMl] = useState("450");
  const [donationDate, setDonationDate] = useState(todayISO());
  const [status, setStatus] = useState("under_review");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDonorId("");
    setQuantityMl("450");
    setDonationDate(todayISO());
    setStatus("under_review");
    setNotes("");
    setErrors({});
  }, [open]);

  const donors = (data?.donors ?? []).filter((d) => d.eligibility === "eligible");

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      await apiPost("/api/donations", { donorId: Number(donorId), quantityMl, donationDate, status, notes });
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrors(error.errors);
        if (Object.keys(error.errors).length === 0) setErrors({ form: error.message });
      } else setErrors({ form: "تعذر حفظ التبرع" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title="تسجيل تبرع"
      description="سجّل عملية تبرع لمتبرع مؤهل"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} disabled={saving || !donorId}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المتبرع" required error={errors.donorId} className="sm:col-span-2">
          <SelectInput
            value={donorId}
            onChange={setDonorId}
            options={donors.map((d) => ({ value: String(d.id), label: `${d.code} — ${d.name} (${d.bloodType})` }))}
            placeholder="اختر متبرعًا مؤهلًا"
          />
        </Field>
        <Field label="الكمية (مل)" required error={errors.quantityMl}>
          <TextInput value={quantityMl} onChange={setQuantityMl} type="number" invalid={!!errors.quantityMl} />
        </Field>
        <Field label="تاريخ التبرع" required error={errors.donationDate}>
          <DatePicker value={donationDate} onChange={setDonationDate} invalid={!!errors.donationDate} />
        </Field>
        <Field label="الحالة" required error={errors.status}>
          <SelectInput value={status} onChange={setStatus} options={DONATION_STATUSES} />
        </Field>
        <Field label="ملاحظات" className="sm:col-span-2">
          <TextArea value={notes} onChange={setNotes} />
        </Field>
      </div>
      {errors.form ? <p className="field-error">{errors.form}</p> : null}
    </Modal>
  );
}
