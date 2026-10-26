"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet } from "@/lib/api";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, SelectInput } from "@/components/ui";
import { BLOOD_TYPES } from "@/lib/constants";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";

type Report = {
  columns: { key: string; label: string }[];
  rows: (Record<string, string | number> & { id?: number })[];
  total: number;
};

export default function ReportsClient() {
  const { t, lang } = useLanguage();
  const canAccess = useCan();
  const isRtl = lang !== "en";

  const [type, setType] = useState("inventory");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Deletion modals
  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);
  const [confirmDeleteSelectedOpen, setConfirmDeleteSelectedOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const REPORT_TYPES = [
    { value: "inventory", label: isRtl ? "تقرير المخزون" : "Inventory Report" },
    { value: "donors", label: isRtl ? "تقرير المتبرعين" : "Donors Report" },
    { value: "patients", label: isRtl ? "تقرير المرضى" : "Patients Report" },
    { value: "donations", label: isRtl ? "تقرير التبرعات" : "Donations Report" },
    { value: "issues", label: isRtl ? "تقرير صرف الدم" : "Issuance Report" },
    { value: "lab", label: isRtl ? "تقرير الفحوصات" : "Lab Tests Report" },
    { value: "expired", label: isRtl ? "الوحدات المنتهية/القريبة" : "Expired / Near Expiry Units" },
  ];

  const load = async () => {
    setLoading(true);
    setError(null);
    setSelectedIds([]);
    try {
      const params = new URLSearchParams({ type });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (bloodType) params.set("bloodType", bloodType);
      const result = await apiGet<Report>(`/api/reports?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && data) {
      const allIds = data.rows
        .map((r) => Number(r.id))
        .filter((id) => Number.isFinite(id) && id > 0);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 1. Delete all records for inventory / current report
  const handleClearAll = async () => {
    setDeleting(true);
    setActionNotice(null);
    try {
      await apiDelete("/api/reports", { type, all: true });
      setConfirmClearAllOpen(false);
      setActionNotice(
        isRtl
          ? `تم حذف كافة سجلات ${REPORT_TYPES.find((r) => r.value === type)?.label ?? "التقرير"} بنجاح`
          : "All records cleared successfully"
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear records");
    } finally {
      setDeleting(false);
    }
  };

  // 2. Delete selected records (Bulk delete)
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    setActionNotice(null);
    try {
      await apiDelete("/api/reports", { type, ids: selectedIds });
      setConfirmDeleteSelectedOpen(false);
      setActionNotice(
        isRtl
          ? `تم حذف ${selectedIds.length} سجل بنجاح`
          : `Deleted ${selectedIds.length} records successfully`
      );
      setSelectedIds([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected");
    } finally {
      setDeleting(false);
    }
  };

  // 3. Delete single record
  const handleDeleteSingle = async () => {
    if (!singleDeleteTarget) return;
    setDeleting(true);
    setActionNotice(null);
    try {
      await apiDelete("/api/reports", { type, id: singleDeleteTarget.id });
      setSingleDeleteTarget(null);
      setActionNotice(isRtl ? "تم حذف السجل بنجاح" : "Record deleted successfully");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  };

  // Export to Formatted Excel (.xls) with full CSS styling and RTL/LTR direction
  const exportFormattedExcel = () => {
    if (!data || data.rows.length === 0) return;
    const reportName = REPORT_TYPES.find((r) => r.value === type)?.label ?? type;
    const currentTimestamp = new Date().toLocaleString(isRtl ? "ar-SA" : "en-US");
    const activeFilters =
      [
        from ? (isRtl ? `من: ${from}` : `From: ${from}`) : null,
        to ? (isRtl ? `إلى: ${to}` : `To: ${to}`) : null,
        bloodType ? (isRtl ? `الفصيلة: ${bloodType}` : `Blood Type: ${bloodType}`) : null,
      ]
        .filter(Boolean)
        .join(" | ") || (isRtl ? "كافة السجلات" : "All records");

    const ths = data.columns
      .map(
        (c) =>
          `<th style="background-color:#990000;color:#ffffff;font-size:11pt;font-weight:bold;padding:10px 14px;border:1px solid #770000;text-align:${isRtl ? "right" : "left"};">${c.label}</th>`
      )
      .join("");

    const trs = data.rows
      .map((r, idx) => {
        const bg = idx % 2 === 0 ? "#ffffff" : "#fbfbfb";
        const tds = data.columns
          .map(
            (c) =>
              `<td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:10.5pt;color:#1e293b;background-color:${bg};text-align:${isRtl ? "right" : "left"};mso-number-format:'\\@';">${String(r[c.key] ?? "—")}</td>`
          )
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");

    const colCount = Math.max(data.columns.length, 1);

    const template = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${reportName}</x:Name>
          <x:WorksheetOptions>
            ${isRtl ? "<x:DisplayRightToLeft/>" : ""}
            <x:Print>
              <x:ValidPrinterInfo/>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; direction: ${isRtl ? "rtl" : "ltr"}; }
    .header-title { font-size: 16pt; font-weight: bold; color: #990000; text-align: ${isRtl ? "right" : "left"}; padding: 12px; }
    .header-meta { font-size: 10pt; color: #64748b; text-align: ${isRtl ? "right" : "left"}; padding: 4px 12px 14px 12px; }
  </style>
</head>
<body dir="${isRtl ? "rtl" : "ltr"}">
  <table>
    <tr><td colspan="${colCount}" class="header-title">${reportName} - نظام إدارة بنك الدم</td></tr>
    <tr><td colspan="${colCount}" class="header-meta">${isRtl ? "تاريخ التصدير" : "Export Date"}: ${currentTimestamp} | ${isRtl ? "الفلاتر" : "Filters"}: ${activeFilters} | ${isRtl ? "إجمالي السجلات" : "Total"}: ${data.total}</td></tr>
    <tr><td colspan="${colCount}"></td></tr>
    <thead>
      <tr>${ths}</tr>
    </thead>
    <tbody>
      ${trs}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob(["\uFEFF" + template], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasDeletePermission = canAccess("reports", "delete") || canAccess("units", "delete");
  const isInventoryRelated = type === "inventory" || type === "expired";
  const allCurrentIdsSelected =
    Boolean(data && data.rows.length > 0) &&
    data!.rows.every((r) => r.id && selectedIds.includes(Number(r.id)));

  return (
    <div className="animate-rise">
      <PageHeader
        title={t("reports")}
        description={lang === "en" ? "Generate, filter, and export system data reports" : "إنشاء وتصفية وتصدير التقارير من بيانات النظام"}
        action={
          hasDeletePermission ? (
            <Button
              variant="danger"
              onClick={() => setConfirmClearAllOpen(true)}
              disabled={loading || !data || data.rows.length === 0}
            >
              {isInventoryRelated ? (isRtl ? "حذف كل سجلات المخزون" : "Delete All Stock Records") : (isRtl ? "حذف كافة سجلات هذا التقرير" : "Clear All Report Records")}
            </Button>
          ) : null
        }
      />

      {actionNotice ? (
        <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm flex items-center justify-between">
          <span>{actionNotice}</span>
          <button type="button" onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold" aria-label="إغلاق">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ) : null}

      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label={lang === "en" ? "Report Type" : "نوع التقرير"}>
            <SelectInput value={type} onChange={setType} options={REPORT_TYPES} />
          </Field>
          <Field label={lang === "en" ? "From Date" : "من تاريخ"}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field-input" />
          </Field>
          <Field label={lang === "en" ? "To Date" : "إلى تاريخ"}>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field-input" />
          </Field>
          <Field label={t("bloodType")}>
            <SelectInput value={bloodType} onChange={setBloodType} options={BLOOD_TYPES} placeholder={lang === "en" ? "All blood types" : "كل الفصائل"} />
          </Field>
          <div className="flex items-end gap-2">
            <Button onClick={load} className="flex-1">
              {lang === "en" ? "Apply" : "تطبيق"}
            </Button>
            {canAccess("reports", "export") ? (
              <Button
                variant="secondary"
                onClick={exportFormattedExcel}
                disabled={!data || data.rows.length === 0}
                title={isRtl ? "تصدير التقارير إلى ملف إكسل منسق" : "Export reports to formatted Excel file"}
              >
                {isRtl ? "تصدير التقارير" : "Export Reports"}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card padding="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--border-line)]">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-bold text-ink">
              {REPORT_TYPES.find((r) => r.value === type)?.label}
            </h2>
            {data ? (
              <Badge tone="info">
                {lang === "en" ? `Results: ${data.total}` : `النتائج: ${data.total}`}
              </Badge>
            ) : null}
          </div>

          {/* Action toolbar for bulk operations */}
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && hasDeletePermission ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDeleteSelectedOpen(true)}
              >
                {isRtl ? `حذف المحدد (${selectedIds.length})` : `Delete Selected (${selectedIds.length})`}
              </Button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <EmptyState title={lang === "en" ? "Generating Report..." : "جارٍ إنشاء التقرير"} />
        ) : error ? (
          <div className="p-6 text-center">
            <EmptyState title={t("errorLoading")} />
            <Button onClick={load}>{t("retry")}</Button>
          </div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState title={t("noData")} description={lang === "en" ? "Try changing filters" : "جرّب تغيير عوامل التصفية"} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {hasDeletePermission ? (
                    <th className="w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allCurrentIdsSelected}
                        onChange={handleSelectAll}
                        aria-label={isRtl ? "تحديد الكل" : "Select all"}
                        className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
                      />
                    </th>
                  ) : null}
                  {data.columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  {hasDeletePermission ? (
                    <th className="w-24 text-center">{isRtl ? "إجراء" : "Action"}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => {
                  const rowId = r.id ? Number(r.id) : undefined;
                  const isChecked = rowId ? selectedIds.includes(rowId) : false;
                  return (
                    <tr key={r.id ?? i} className={isChecked ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                      {hasDeletePermission ? (
                        <td className="text-center">
                          {rowId ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(rowId)}
                              aria-label={`Select row ${rowId}`}
                              className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
                            />
                          ) : null}
                        </td>
                      ) : null}
                      {data.columns.map((c) => (
                        <td key={c.key}>{String(r[c.key] ?? "—")}</td>
                      ))}
                      {hasDeletePermission ? (
                        <td className="text-center">
                          {rowId ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                const rowLabel = String(r.unitNumber ?? r.code ?? r.name ?? r.donorName ?? `#${rowId}`);
                                setSingleDeleteTarget({ id: rowId, label: rowLabel });
                              }}
                              title={isRtl ? "حذف هذا السجل" : "Delete this record"}
                            >
                              {isRtl ? "حذف" : "Delete"}
                            </Button>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirmation Modal 1: Clear All Records */}
      <Modal
        open={confirmClearAllOpen}
        onClose={() => setConfirmClearAllOpen(false)}
        title={isRtl ? "تأكيد حذف كافة السجلات" : "Confirm Clear All Records"}
        description={
          isInventoryRelated
            ? (isRtl ? "تحذير: سيتم مسح كافة سجلات المخزون المعروضة نهائياً من قاعدة البيانات. هل تريد المتابعة؟" : "Warning: All stock records will be permanently deleted.")
            : (isRtl ? `تحذير: سيتم حذف كافة سجلات ${REPORT_TYPES.find((r) => r.value === type)?.label} نهائياً. هل تريد المتابعة؟` : "Warning: All matching records in this report will be deleted.")
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClearAllOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={handleClearAll} disabled={deleting}>
              {deleting ? (isRtl ? "جارٍ الحذف..." : "Deleting...") : (isRtl ? "نعم، احذف الكل نهائياً" : "Yes, Delete All")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink font-medium">
          {isRtl
            ? `أنت على وشك تنفيذ حذف شامل لكافة سجلات (${REPORT_TYPES.find((r) => r.value === type)?.label}). هذا الإجراء لا يمكن التراجع عنه.`
            : "You are about to delete all records in this report. This action cannot be undone."}
        </p>
      </Modal>

      {/* Confirmation Modal 2: Delete Selected Records */}
      <Modal
        open={confirmDeleteSelectedOpen}
        onClose={() => setConfirmDeleteSelectedOpen(false)}
        title={isRtl ? "تأكيد حذف السجلات المحددة" : "Confirm Delete Selected"}
        description={
          isRtl
            ? `سيتم حذف (${selectedIds.length}) سجل محدد نهائياً.`
            : `Are you sure you want to delete ${selectedIds.length} selected record(s)?`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteSelectedOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={handleDeleteSelected} disabled={deleting}>
              {deleting ? (isRtl ? "جارٍ الحذف..." : "Deleting...") : (isRtl ? `حذف ${selectedIds.length} سجل` : "Delete Selected")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink font-medium">
          {isRtl
            ? `هل أنت متأكد من حذف ${selectedIds.length} سجل محدد؟ لن تتمكن من استرجاع البيانات بعد الحذف.`
            : "This action cannot be undone."}
        </p>
      </Modal>

      {/* Confirmation Modal 3: Delete Single Record */}
      <Modal
        open={!!singleDeleteTarget}
        onClose={() => setSingleDeleteTarget(null)}
        title={isRtl ? "تأكيد حذف السجل" : "Confirm Delete Record"}
        description={
          isRtl
            ? `هل أنت متأكد من حذف السجل [${singleDeleteTarget?.label}] نهائياً؟`
            : `Are you sure you want to delete record [${singleDeleteTarget?.label}]?`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setSingleDeleteTarget(null)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={handleDeleteSingle} disabled={deleting}>
              {deleting ? (isRtl ? "جارٍ الحذف..." : "Deleting...") : (isRtl ? "تأكيد الحذف" : "Confirm Delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink font-medium">
          {isRtl
            ? `سيتم إزالة هذا السجل نهائياً من نظام بنك الدم.`
            : "This record will be permanently deleted from the blood bank database."}
        </p>
      </Modal>
    </div>
  );
}
