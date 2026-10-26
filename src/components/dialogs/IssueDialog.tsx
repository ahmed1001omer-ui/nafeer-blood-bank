"use client";

import { useEffect, useMemo, useState } from "react";
import { apiPost, ApiRequestError, useResource } from "@/lib/api";
import { rhLabel } from "@/lib/constants";
import { daysUntil, todayISO } from "@/lib/format";
import type { BloodUnit } from "@/lib/types";
import { Button, DatePicker, Field, Modal, Notice, SelectInput, TextArea, TextInput } from "@/components/ui";

type RequestRow = { id: number; requestNumber: string; patientName: string; bloodType: string; status: string };

export default function IssueDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: unitsData } = useResource<{ units: BloodUnit[] }>("/api/units");
  const { data: reqData } = useResource<{ requests: RequestRow[] }>("/api/requests");
  const [requestId, setRequestId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRequestId("");
    setUnitId("");
    setPatientName("");
    setIssueDate(todayISO());
    setNotes("");
    setErrors({});
  }, [open]);

  // فقط الوحدات الصالحة للصرف
  const units = useMemo(
    () =>
      (unitsData?.units ?? []).filter(
        (u) => (u.status === "available" || u.status === "reserved") && daysUntil(u.expiryDate) >= 0,
      ),
    [unitsData],
  );
  const requests = (reqData?.requests ?? []).filter((r) => r.status !== "fulfilled" && r.status !== "cancelled");
  const selectedUnit = units.find((u) => String(u.id) === unitId);

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      await apiPost("/api/issues", {
        unitId: Number(unitId),
        requestId: requestId ? Number(requestId) : null,
        patientName,
        issueDate,
        notes,
      });
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrors(error.errors);
        if (Object.keys(error.errors).length === 0) setErrors({ form: error.message });
      } else setErrors({ form: "تعذر صرف الوحدة" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title="صرف وحدة دم"
      description="صرف وحدة دم لمريض أو مقابل طلب"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} disabled={saving || !unitId || !patientName}>{saving ? "جارٍ الصرف..." : "صرف الوحدة"}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="مقابل طلب (اختياري)" className="sm:col-span-2">
          <SelectInput
            value={requestId}
            onChange={(v) => {
              setRequestId(v);
              const r = requests.find((x) => String(x.id) === v);
              if (r) setPatientName(r.patientName);
            }}
            options={requests.map((r) => ({ value: String(r.id), label: `${r.requestNumber} — ${r.patientName} (${r.bloodType})` }))}
            placeholder="بدون ربط بطلب"
          />
        </Field>
        <Field label="وحدة الدم" required error={errors.unitId} className="sm:col-span-2">
          <SelectInput
            value={unitId}
            onChange={setUnitId}
            options={units.map((u) => ({
              value: String(u.id),
              label: `${u.unitNumber} — ${u.bloodType}${rhLabel(u.rh)} — ${u.component}`,
            }))}
            placeholder="اختر وحدة صالحة"
          />
        </Field>
        <Field label="اسم المريض" required error={errors.patientName}>
          <TextInput value={patientName} onChange={setPatientName} invalid={!!errors.patientName} />
        </Field>
        <Field label="تاريخ الصرف" required error={errors.issueDate}>
          <DatePicker value={issueDate} onChange={setIssueDate} invalid={!!errors.issueDate} />
        </Field>
        <Field label="ملاحظات" className="sm:col-span-2">
          <TextArea value={notes} onChange={setNotes} />
        </Field>
      </div>
      {selectedUnit ? (
        <div className="mt-3">
          <Notice tone="info">
            الوحدة {selectedUnit.unitNumber} — تنتهي بعد {daysUntil(selectedUnit.expiryDate)} يوم — الموقع: {selectedUnit.storageLocation}
          </Notice>
        </div>
      ) : null}
      {errors.form ? <div className="mt-3"><Notice tone="danger">{errors.form}</Notice></div> : null}
    </Modal>
  );
}
