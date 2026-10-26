"use client";

import { useEffect, useState } from "react";
import { apiPatch, apiPost, ApiRequestError } from "@/lib/api";
import { EMPLOYEE_ROLES, EMPLOYEE_STATUSES } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import type { Employee } from "@/lib/types";
import { Button, DatePicker, Field, Modal, SelectInput, TextInput } from "@/components/ui";
import { useLanguage } from "@/lib/i18n-context";

type FormState = {
  name: string;
  role: string;
  hireDate: string;
  status: string;
  phone: string;
};

const emptyForm = (): FormState => ({
  name: "",
  role: "",
  hireDate: todayISO(),
  status: "active",
  phone: "",
});

export default function EmployeeDialog({
  open,
  onClose,
  onSaved,
  employee,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  employee: Employee | null;
}) {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (employee) {
      setForm({
        name: employee.name,
        role: employee.role,
        hireDate: employee.hireDate.slice(0, 10),
        status: employee.status,
        phone: employee.phone ?? "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, employee]);

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      if (employee) {
        await apiPatch(`/api/employees/${employee.id}`, form);
      } else {
        await apiPost("/api/employees", form);
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

  const statusOptions = EMPLOYEE_STATUSES.map((s) => ({
    value: s.value,
    label: s.value === "active" ? t("active") : t("inactive"),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={employee ? (lang === "en" ? "Edit Employee Data" : "تعديل بيانات الموظف") : t("addEmployee")}
      description={
        employee
          ? (lang === "en" ? "Edit employee details then save" : "عدّل بيانات الموظف ثم احفظ")
          : (lang === "en" ? "Register a new employee in the system" : "سجل موظفًا جديدًا في النظام")
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
        <Field label={t("employeeName")} required error={errors.name}>
          <TextInput
            value={form.name}
            onChange={update("name")}
            invalid={!!errors.name}
            placeholder={lang === "en" ? "Full Name" : "الاسم الكامل"}
          />
        </Field>
        <Field label={t("jobTitle")} required error={errors.role}>
          <SelectInput
            value={form.role}
            onChange={update("role")}
            options={EMPLOYEE_ROLES}
            invalid={!!errors.role}
            placeholder={lang === "en" ? "Select Job Title" : "اختر الوظيفة"}
          />
        </Field>
        <Field label={t("hireDate")} required error={errors.hireDate}>
          <DatePicker value={form.hireDate} onChange={update("hireDate")} invalid={!!errors.hireDate} />
        </Field>
        <Field label={t("status")} error={errors.status}>
          <SelectInput value={form.status} onChange={update("status")} options={statusOptions} />
        </Field>
        <Field label={t("phone")} error={errors.phone}>
          <TextInput
            value={form.phone}
            onChange={update("phone")}
            type="tel"
            placeholder={lang === "en" ? "Optional" : "اختياري"}
          />
        </Field>
      </div>
      {errors.form ? <p className="field-error">{errors.form}</p> : null}
    </Modal>
  );
}
