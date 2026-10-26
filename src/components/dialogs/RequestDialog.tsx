"use client";

import { useEffect, useState } from "react";
import { apiPatch, apiPost, ApiRequestError, useResource } from "@/lib/api";
import { BLOOD_COMPONENTS, BLOOD_TYPES, PRIORITY_OPTIONS, REQUEST_STATUSES } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import type { Patient } from "@/lib/types";
import { Button, DatePicker, Field, Modal, SelectInput, TextArea, TextInput } from "@/components/ui";

type RequestRow = {
  id: number;
  patientId: number | null;
  patientName: string;
  requester: string;
  bloodType: string;
  component: string;
  unitsRequested: number;
  priority: string;
  status: string;
  requestDate: string;
  notes: string | null;
};

type FormState = {
  patientId: string;
  patientName: string;
  requester: string;
  bloodType: string;
  component: string;
  unitsRequested: string;
  priority: string;
  status: string;
  requestDate: string;
  notes: string;
};

const empty = (): FormState => ({
  patientId: "",
  patientName: "",
  requester: "قسم الطوارئ",
  bloodType: "",
  component: "دم كامل",
  unitsRequested: "1",
  priority: "normal",
  status: "pending",
  requestDate: todayISO(),
  notes: "",
});

export default function RequestDialog({
  open,
  onClose,
  onSaved,
  request,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  request: RequestRow | null;
}) {
  const { data } = useResource<{ patients: Patient[] }>("/api/patients");
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (request) {
      setForm({
        patientId: request.patientId == null ? "" : String(request.patientId),
        patientName: request.patientName,
        requester: request.requester,
        bloodType: request.bloodType,
        component: request.component,
        unitsRequested: String(request.unitsRequested),
        priority: request.priority,
        status: request.status,
        requestDate: request.requestDate.slice(0, 10),
        notes: request.notes ?? "",
      });
    } else {
      setForm(empty());
    }
  }, [open, request]);

  const update = (key: keyof FormState) => (value: string) => setForm((p) => ({ ...p, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      if (request) await apiPatch(`/api/requests/${request.id}`, form);
      else await apiPost("/api/requests", form);
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiRequestError) setErrors(error.errors);
      else setErrors({ form: "تعذر حفظ الطلب" });
    } finally {
      setSaving(false);
    }
  };

  const patients = data?.patients ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={request ? "تعديل طلب دم" : "إنشاء طلب دم"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم المريض" required error={errors.patientName}>
          <TextInput value={form.patientName} onChange={update("patientName")} invalid={!!errors.patientName} />
        </Field>
        <Field label="اختيار مريض مسجّل (اختياري)">
          <SelectInput
            value={form.patientId}
            onChange={(v) => {
              const p = patients.find((x) => String(x.id) === v);
              setForm((prev) => p
                ? { ...prev, patientId: String(p.id), patientName: p.name, bloodType: p.bloodType }
                : { ...prev, patientId: "" });
            }}
            options={patients.map((p) => ({ value: String(p.id), label: `${p.name} — ${p.bloodType}` }))}
            placeholder="بحث من سجل المرضى"
          />
        </Field>
        <Field label="الجهة الطالبة" required error={errors.requester}>
          <TextInput value={form.requester} onChange={update("requester")} invalid={!!errors.requester} />
        </Field>
        <Field label="الفصيلة" required error={errors.bloodType}>
          <SelectInput value={form.bloodType} onChange={update("bloodType")} options={BLOOD_TYPES} invalid={!!errors.bloodType} />
        </Field>
        <Field label="المكوّن" required error={errors.component}>
          <SelectInput value={form.component} onChange={update("component")} options={BLOOD_COMPONENTS} invalid={!!errors.component} />
        </Field>
        <Field label="عدد الوحدات" required error={errors.unitsRequested}>
          <TextInput value={form.unitsRequested} onChange={update("unitsRequested")} type="number" invalid={!!errors.unitsRequested} />
        </Field>
        <Field label="الأولوية" required error={errors.priority}>
          <SelectInput value={form.priority} onChange={update("priority")} options={PRIORITY_OPTIONS} />
        </Field>
        {request ? (
          <Field label="الحالة" error={errors.status}>
            <SelectInput value={form.status} onChange={update("status")} options={REQUEST_STATUSES} />
          </Field>
        ) : null}
        <Field label="تاريخ الطلب" required error={errors.requestDate}>
          <DatePicker value={form.requestDate} onChange={update("requestDate")} invalid={!!errors.requestDate} />
        </Field>
        <Field label="ملاحظات" className="sm:col-span-2">
          <TextArea value={form.notes} onChange={update("notes")} />
        </Field>
      </div>
      {errors.form ? <p className="field-error">{errors.form}</p> : null}
    </Modal>
  );
}
