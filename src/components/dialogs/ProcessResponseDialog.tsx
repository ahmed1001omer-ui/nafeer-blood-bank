"use client";

import { useEffect, useState } from "react";
import { apiPost, ApiRequestError } from "@/lib/api";
import { todayISO } from "@/lib/format";
import { Button, DatePicker, Field, Modal, SelectInput, TextArea, TextInput } from "@/components/ui";
import type { PostResponseItem } from "@/app/reception/posts/Client";

export default function ProcessResponseDialog({
  open,
  response,
  onClose,
  onSaved,
}: {
  open: boolean;
  response: PostResponseItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [outcome, setOutcome] = useState<"donated" | "ineligible">("donated");

  // Donated fields
  const [quantityMl, setQuantityMl] = useState("450");
  const [donationDate, setDonationDate] = useState(todayISO());
  const [hemoglobin, setHemoglobin] = useState("13.5");
  const [vitalSigns, setVitalSigns] = useState("ضغط الدم: 120/80 — النبض: 72");
  const [donateNotes, setDonateNotes] = useState("");

  // Ineligible / Blacklist fields
  const [blacklistType, setBlacklistType] = useState<"temporary" | "final" | "deferral">("temporary");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [blacklistNotes, setBlacklistNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOutcome("donated");
    setQuantityMl("450");
    setDonationDate(todayISO());
    setHemoglobin("13.5");
    setVitalSigns("ضغط الدم: 120/80 — النبض: 72");
    setDonateNotes("");
    setBlacklistType("temporary");
    setReason("");
    setStartDate(todayISO());
    setEndDate("");
    setBlacklistNotes("");
    setError(null);
  }, [open, response]);

  if (!response) return null;

  const handleSubmit = async () => {
    setError(null);
    if (outcome === "ineligible" && !reason.trim()) {
      setError("يرجى كتابة سبب عدم الأهلية أو سبب إضافة المتبرع إلى القائمة السوداء");
      return;
    }

    setSaving(true);
    try {
      const payload = outcome === "donated"
        ? {
            outcome: "donated",
            donorName: response.donorName,
            donorPhone: response.donorPhone,
            bloodType: response.bloodType,
            quantityMl: Number(quantityMl) || 450,
            donationDate,
            hemoglobin: hemoglobin ? Number(hemoglobin) : undefined,
            vitalSigns,
            notes: donateNotes,
          }
        : {
            outcome: "ineligible",
            donorName: response.donorName,
            donorPhone: response.donorPhone,
            bloodType: response.bloodType,
            blacklistType,
            reason: reason.trim(),
            startDate,
            endDate: endDate.trim() || undefined,
            notes: blacklistNotes,
          };

      const res = await apiPost<{ success: boolean; message: string }>(
        `/api/posts/responses/${response.id}/process`,
        payload
      );
      onSaved(res.message || "تمت معالجة الاستجابة بنجاح");
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message || Object.values(err.errors)[0] || "تعذر معالجة الاستجابة");
      } else {
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="فحص أهلية المتبرع واعتماد التبرع"
      description="تسجيل نتيجة فحص المتبرع المستجيب لإعلان الاحتياج — إما اعتماد تبرعه وحفظه في سجل التبرعات، أو استبعاده وإضافته للقائمة السوداء."
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant={outcome === "donated" ? "primary" : "danger"}
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving
              ? "جاري الحفظ..."
              : outcome === "donated"
              ? "اعتماد التبرع وحفظ السجل"
              : "إضافة للقائمة السوداء وتحديث الحالة"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Donor & Post Summary Card */}
        <div className="rounded-xl border border-[var(--border-line)] bg-[var(--surface-muted)] p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-[var(--muted-foreground)]">اسم المتبرع:</span>
              <div className="font-bold text-[var(--foreground)]">{response.donorName}</div>
            </div>
            <div>
              <span className="text-xs text-[var(--muted-foreground)]">رقم الهاتف:</span>
              <div className="font-mono font-medium">{response.donorPhone}</div>
            </div>
            <div>
              <span className="text-xs text-[var(--muted-foreground)]">فصيلة الدم:</span>
              <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                {response.bloodType}
              </span>
            </div>
            <div>
              <span className="text-xs text-[var(--muted-foreground)]">المستشفى / الإعلان:</span>
              <div className="text-xs font-medium text-[var(--foreground)]">
                {response.hospital || "المستشفى الرئيسي"} — {response.postComponent || "دم كامل"}
              </div>
            </div>
          </div>
        </div>

        {/* Outcome Selection Radio Tabs */}
        <div>
          <label className="mb-2 block text-xs font-bold text-[var(--foreground)]">
            نتيجة فحص الأهلية الأولية:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOutcome("donated")}
              className={`flex items-center gap-3 rounded-xl border p-3 text-right transition-all ${
                outcome === "donated"
                  ? "border-emerald-500 bg-emerald-50/50 shadow-sm dark:bg-emerald-950/30"
                  : "border-[var(--border-line)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                outcome === "donated" ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-600"
              }`}>
                مؤهل
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--foreground)]">مؤهل للتبرع</div>
                <div className="text-xs text-[var(--muted-foreground)]">تم استلام الدم وحفظ سجل التبرع</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOutcome("ineligible")}
              className={`flex items-center gap-3 rounded-xl border p-3 text-right transition-all ${
                outcome === "ineligible"
                  ? "border-rose-500 bg-rose-50/50 shadow-sm dark:bg-rose-950/30"
                  : "border-[var(--border-line)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                outcome === "ineligible" ? "bg-rose-600 text-white" : "bg-neutral-200 text-neutral-600"
              }`}>
                حظر
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--foreground)]">غير مؤهل (قائمة سوداء)</div>
                <div className="text-xs text-[var(--muted-foreground)]">حظر أو تأجيل حسب النظام</div>
              </div>
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {/* Form fields based on outcome */}
        {outcome === "donated" ? (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 dark:border-emerald-900">
            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              بيانات عملية التبرع والفحص الأولي:
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="كمية الدم المتبرع بها (مل)">
                <TextInput value={quantityMl} onChange={setQuantityMl} placeholder="450" />
              </Field>
              <Field label="تاريخ التبرع">
                <DatePicker value={donationDate} onChange={setDonationDate} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="نسبة الهيموجلوبين (g/dl)">
                <TextInput value={hemoglobin} onChange={setHemoglobin} placeholder="مثلاً: 13.5" />
              </Field>
              <Field label="العلامات الحيوية (الضغط / النبض)">
                <TextInput value={vitalSigns} onChange={setVitalSigns} placeholder="120/80 - نبض 72" />
              </Field>
            </div>
            <Field label="ملاحظات فني الاستقبال">
              <TextArea
                rows={2}
                value={donateNotes}
                onChange={setDonateNotes}
                placeholder="أي ملاحظات حول الوريد أو الاستجابة..."
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/20 p-4 dark:border-rose-900">
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
              إجراء الحظر أو التأجيل في القائمة السوداء:
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="نوع الاستبعاد / الحظر">
                <SelectInput
                  value={blacklistType}
                  onChange={(v) => setBlacklistType(v as "temporary" | "final" | "deferral")}
                  options={[
                    { value: "temporary", label: "حظر مؤقت (Temporary)" },
                    { value: "final", label: "حظر نهائي دائم (Permanent)" },
                    { value: "deferral", label: "تأجيل مؤقت لحالة صحية (Deferral)" },
                  ]}
                />
              </Field>
              <Field label="تاريخ البداية">
                <DatePicker value={startDate} onChange={setStartDate} />
              </Field>
            </div>

            {blacklistType !== "final" ? (
              <Field label="تاريخ نهاية الحظر / فك التأجيل (اختياري)">
                <DatePicker value={endDate} onChange={setEndDate} placeholder="تاريخ انتهاء الحظر" />
              </Field>
            ) : null}

            <Field label="سبب عدم الأهلية / سبب الحظر (مطلوب)" required>
              <TextInput
                value={reason}
                onChange={setReason}
                placeholder="مثلاً: نقص هيموجلوبين شديد، ضغط دم غير ملائم، سفر حديث..."
              />
            </Field>

            <Field label="ملاحظات الاستبعاد">
              <TextArea
                rows={2}
                value={blacklistNotes}
                onChange={setBlacklistNotes}
                placeholder="توجيهات للمتبرع عند مراجعته لاحقاً..."
              />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
