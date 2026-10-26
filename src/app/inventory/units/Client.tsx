"use client";

import { useMemo, useState } from "react";
import UnitDialog from "@/components/dialogs/UnitDialog";
import MovementDialog from "@/components/dialogs/MovementDialog";
import { Badge, Button, Card, EmptyState, Modal, Notice, PageHeader, SectionTitle, SelectInput, StatCard, Tabs, TextInput } from "@/components/ui";
import { BLOOD_TYPES, BLOOD_COMPONENTS, UNIT_STATUSES, rhLabel, unitStatusLabel } from "@/lib/constants";
import { currentUnitStatus, daysUntil, formatDate, isCurrentlyAvailableUnit } from "@/lib/format";
import { apiDelete, useResource } from "@/lib/api";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";
import type { BloodUnit } from "@/lib/types";

const toneForStatus = (status: string) => {
  if (status === "available") return "success";
  if (status === "reserved") return "info";
  if (status === "quarantine") return "warning";
  if (status === "dispensed") return "neutral";
  return "danger";
};

type Movement = {
  id: number;
  unitNumber: string;
  bloodType: string;
  type: string;
  fromLocation: string | null;
  toLocation: string | null;
  reason: string | null;
  performedBy: string | null;
  movementDate: string;
};

const movementTone: Record<string, string> = { add: "success", issue: "info", discard: "danger", transfer: "warning" };

export default function InventoryUnitsPage() {
  const { t, lang } = useLanguage();
  const isRtl = lang !== "en";
  const { data, loading, refresh } = useResource<{ units: BloodUnit[] }>("/api/units");
  const { data: movData, refresh: refreshMovements } = useResource<{ movements: Movement[] }>("/api/movements");
  const canAccess = useCan();
  const [tab, setTab] = useState("current");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<BloodUnit | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveUnit, setMoveUnit] = useState<BloodUnit | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [component, setComponent] = useState("");
  const [status, setStatus] = useState("");
  const [expiryFrom, setExpiryFrom] = useState("");
  const [expiryTo, setExpiryTo] = useState("");

  // Multi-selection and deletions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);
  const [confirmDeleteSelectedOpen, setConfirmDeleteSelectedOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<BloodUnit | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const movementLabel: Record<string, string> = {
    add: lang === "en" ? "Add" : "إضافة",
    issue: lang === "en" ? "Issue" : "صرف",
    discard: lang === "en" ? "Discard" : "إتلاف",
    transfer: lang === "en" ? "Transfer" : "نقل",
  };

  const units = useMemo(() => data?.units ?? [], [data]);
  const movements = useMemo(() => movData?.movements ?? [], [movData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return units.filter((row) => {
      if (bloodType && row.bloodType !== bloodType) return false;
      if (component && row.component !== component) return false;
      if (status && currentUnitStatus(row) !== status) return false;
      if (expiryFrom && row.expiryDate < expiryFrom) return false;
      if (expiryTo && row.expiryDate > expiryTo) return false;
      if (!query) return true;
      return (
        row.unitNumber.toLowerCase().includes(query) ||
        (row.sourceCode ?? "").toLowerCase().includes(query) ||
        row.storageLocation.toLowerCase().includes(query)
      );
    });
  }, [units, search, bloodType, component, status, expiryFrom, expiryTo]);

  const availableCount = units.filter(isCurrentlyAvailableUnit).length;
  const reservedCount = units.filter((row) => row.status === "reserved").length;
  const nearExpiryUnits = units
    .filter((row) => (row.status === "available" || row.status === "reserved") && daysUntil(row.expiryDate) <= 7 && daysUntil(row.expiryDate) >= 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const expiredCount = units.filter((row) => currentUnitStatus(row) === "expired").length;
  const discardedCount = units.filter((row) => row.status === "rejected").length;

  const thresholds: Record<string, number> = {};
  BLOOD_TYPES.forEach((bt) => (thresholds[bt] = bt.includes("-") ? 3 : 6));
  const lowStockTypes = BLOOD_TYPES.filter((bt) => {
    const avail = units.filter((u) => u.bloodType === bt && isCurrentlyAvailableUnit(u)).reduce((s, u) => s + u.quantity, 0);
    return avail < thresholds[bt];
  });

  const refreshAll = () => {
    setSelectedIds([]);
    refresh();
    refreshMovements();
  };

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const activeList = tab === "near_expiry" ? nearExpiryUnits : filtered;
      setSelectedIds(activeList.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Delete handlers
  const handleClearAll = async () => {
    setDeleting(true);
    setActionNotice(null);
    try {
      await apiDelete("/api/units", { all: true });
      setConfirmClearAllOpen(false);
      setActionNotice(isRtl ? "تم تفريغ كافة وحدات المخزون بنجاح" : "All stock units cleared successfully");
      refreshAll();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Failed to clear stock");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    setActionNotice(null);
    try {
      await apiDelete("/api/units", { ids: selectedIds });
      setConfirmDeleteSelectedOpen(false);
      setActionNotice(isRtl ? `تم حذف (${selectedIds.length}) وحدة دم بنجاح` : `Deleted ${selectedIds.length} units successfully`);
      setSelectedIds([]);
      refreshAll();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Failed to delete selected units");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!singleDeleteTarget) return;
    setDeleting(true);
    setActionNotice(null);
    try {
      await apiDelete(`/api/units/${singleDeleteTarget.id}`);
      setSingleDeleteTarget(null);
      setActionNotice(isRtl ? `تم حذف وحدة الدم [${singleDeleteTarget.unitNumber}] بنجاح` : "Unit deleted successfully");
      refreshAll();
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : "Failed to delete unit");
    } finally {
      setDeleting(false);
    }
  };

  const renderStatusFilter = (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <div className="min-w-[180px] flex-1">
        <TextInput
          value={search}
          onChange={setSearch}
          placeholder={lang === "en" ? "Search unit number, donation ID, or location" : "بحث برقم الوحدة أو رقم التبرع أو موقع التخزين"}
        />
      </div>
      <div className="w-[120px]">
        <SelectInput value={bloodType} onChange={setBloodType} options={BLOOD_TYPES} placeholder={t("bloodType")} />
      </div>
      <div className="w-[170px]">
        <SelectInput value={component} onChange={setComponent} options={BLOOD_COMPONENTS} placeholder={lang === "en" ? "Component" : "المكوّن"} />
      </div>
      <div className="w-[140px]">
        <SelectInput value={status} onChange={setStatus} options={UNIT_STATUSES} placeholder={t("status")} />
      </div>

      {/* Expiry Date Range Filter */}
      <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-line)] bg-[var(--bg-elevated)] px-2.5 py-1">
        <span className="text-xs font-semibold text-muted whitespace-nowrap">
          {isRtl ? "الصلاحية من:" : "Exp from:"}
        </span>
        <input
          type="date"
          value={expiryFrom}
          onChange={(e) => setExpiryFrom(e.target.value)}
          className="bg-transparent text-xs font-medium text-ink focus:outline-none"
          title={isRtl ? "تاريخ انتهاء الصلاحية من" : "Expiry from"}
        />
        <span className="text-xs font-semibold text-muted whitespace-nowrap">
          {isRtl ? "إلى:" : "To:"}
        </span>
        <input
          type="date"
          value={expiryTo}
          onChange={(e) => setExpiryTo(e.target.value)}
          className="bg-transparent text-xs font-medium text-ink focus:outline-none"
          title={isRtl ? "تاريخ انتهاء الصلاحية إلى" : "Expiry to"}
        />
      </div>

      {search || bloodType || component || status || expiryFrom || expiryTo ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSearch("");
            setBloodType("");
            setComponent("");
            setStatus("");
            setExpiryFrom("");
            setExpiryTo("");
          }}
        >
          {t("reset")}
        </Button>
      ) : null}
    </div>
  );

  const unitRow = (row: BloodUnit) => {
    const remaining = daysUntil(row.expiryDate);
    const isChecked = selectedIds.includes(row.id);
    return (
      <tr key={row.id} className={isChecked ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
        {canAccess("units", "delete") ? (
          <td className="text-center w-10">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleToggleSelect(row.id)}
              aria-label={`Select unit ${row.unitNumber}`}
              className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
            />
          </td>
        ) : null}
        <td className="font-semibold">{row.unitNumber}</td>
        <td><Badge tone="danger">{row.bloodType}{rhLabel(row.rh)}</Badge></td>
        <td>{row.component}</td>
        <td><Badge tone={toneForStatus(currentUnitStatus(row))}>{unitStatusLabel(currentUnitStatus(row))}</Badge></td>
        <td>{row.quantity}</td>
        <td>{formatDate(row.collectionDate)}</td>
        <td><span className={remaining <= 7 ? "font-semibold text-critical" : ""}>{formatDate(row.expiryDate)}</span></td>
        <td>{row.storageLocation}</td>
        <td>{row.sourceCode ?? "—"}</td>
        {canAccess("units", "update") || canAccess("units", "delete") ? (
          <td>
            <div className="flex items-center gap-2">
              {canAccess("units", "update") ? (
                <Button variant="secondary" size="sm" onClick={() => { setSelected(row); setDialogOpen(true); }}>
                  {t("edit")}
                </Button>
              ) : null}
              {(canAccess("units", "update") || canAccess("units", "delete")) && row.status !== "dispensed" ? (
                <Button variant="secondary" size="sm" onClick={() => { setMoveUnit(row); setMoveOpen(true); }}>
                  {lang === "en" ? "Movement" : "حركة"}
                </Button>
              ) : null}
              {canAccess("units", "delete") ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setSingleDeleteTarget(row)}
                  title={isRtl ? "حذف الوحدة" : "Delete unit"}
                >
                  {isRtl ? "حذف" : "Delete"}
                </Button>
              ) : null}
            </div>
          </td>
        ) : null}
      </tr>
    );
  };

  const showActions = canAccess("units", "update") || canAccess("units", "delete");
  const canDeleteUnits = canAccess("units", "delete");

  const currentList = tab === "near_expiry" ? nearExpiryUnits : filtered;
  const allCurrentSelected = currentList.length > 0 && currentList.every((u) => selectedIds.includes(u.id));

  return (
    <div className="animate-rise">
      <PageHeader
        title={t("units")}
        description={
          lang === "en"
            ? "Blood stock management: blood types, components, statuses, expiry dates, and storage locations"
            : "إدارة وحدات الدم: الفصائل، المكوّنات، الحالات، تواريخ الانتهاء ومواقع التخزين"
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canAccess("units", "create") ? (
              <Button onClick={() => { setSelected(null); setDialogOpen(true); }}>{t("addUnit")}</Button>
            ) : null}
            {canDeleteUnits ? (
              <Button
                variant="danger"
                onClick={() => setConfirmClearAllOpen(true)}
                disabled={units.length === 0}
              >
                {isRtl ? "حذف كل المخزون" : "Clear All Stock"}
              </Button>
            ) : null}
          </div>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={lang === "en" ? "Total Units" : "إجمالي الوحدات"} value={units.length} hint={lang === "en" ? `Available: ${availableCount}` : `المتاح: ${availableCount}`} accent />
        <StatCard label={lang === "en" ? "Reserved Stock" : "مخزون محجوز"} value={reservedCount} />
        <StatCard label={t("nearExpiryUnits")} value={nearExpiryUnits.length} hint={lang === "en" ? "Within 7 days (FEFO)" : "خلال 7 أيام (FEFO)"} accent={nearExpiryUnits.length > 0} />
        <StatCard label={lang === "en" ? "Expired Units" : "وحدات منتهية"} value={expiredCount} />
        <StatCard label={lang === "en" ? "Discarded / Rejected" : "مستبعدة / تالفة"} value={discardedCount} />
      </div>

      {lowStockTypes.length > 0 ? (
        <div className="mt-4">
          <Notice tone="warning">
            {lang === "en" ? "Low stock detected for types:" : "تنبيه: يوجد انخفاض في مخزون الفصائل التالية:"}{" "}
            <strong>{lowStockTypes.join("، ")}</strong>
          </Notice>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          items={[
            { value: "current", label: lang === "en" ? "Available Stock" : "المخزون الحالي", count: filtered.length },
            { value: "near_expiry", label: lang === "en" ? "Near Expiry (FEFO)" : "قريبة من الانتهاء", count: nearExpiryUnits.length },
            { value: "movements", label: lang === "en" ? "Movements Log" : "سجل الحركات", count: movements.length },
          ]}
          active={tab}
          onChange={setTab}
        />

        {selectedIds.length > 0 && canDeleteUnits && tab !== "movements" ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmDeleteSelectedOpen(true)}
          >
            {isRtl ? `حذف الوحدات المحددة (${selectedIds.length})` : `Delete Selected (${selectedIds.length})`}
          </Button>
        ) : null}
      </div>

      <div className="mt-4">
        {tab === "current" ? (
          <Card padding="p-0">
            {renderStatusFilter}
            {loading ? (
              <EmptyState title={t("loading")} />
            ) : filtered.length === 0 ? (
              <EmptyState title={t("noData")} description={lang === "en" ? "No units matching current filters" : "لا توجد وحدات مطابقة للبحث أو التصفية الحالية"} />
            ) : (
              <div className="table-wrap border-t border-line">
                <table className="data-table">
                  <thead>
                    <tr>
                      {canDeleteUnits ? (
                        <th className="w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allCurrentSelected}
                            onChange={handleSelectAll}
                            aria-label={isRtl ? "تحديد الكل" : "Select all"}
                            className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
                          />
                        </th>
                      ) : null}
                      <th>{t("unitNumber")}</th>
                      <th>{t("bloodType")}</th>
                      <th>{lang === "en" ? "Component" : "المكوّن"}</th>
                      <th>{t("status")}</th>
                      <th>{t("quantity")}</th>
                      <th>{t("collectionDate")}</th>
                      <th>{t("expiryDate")}</th>
                      <th>{lang === "en" ? "Storage Location" : "موقع التخزين"}</th>
                      <th>{lang === "en" ? "Donation ID" : "رقم التبرع"}</th>
                      {showActions ? <th>{t("actions")}</th> : null}
                    </tr>
                  </thead>
                  <tbody>{filtered.map(unitRow)}</tbody>
                </table>
              </div>
            )}
          </Card>
        ) : tab === "near_expiry" ? (
          <Card padding="p-0">
            <div className="p-4">
              <SectionTitle title={t("nearExpiryUnits")} subtitle={lang === "en" ? "Units reaching expiry within 7 days sorted FEFO" : "الوحدات التي تقترب من تاريخ الانتهاء خلال 7 أيام مرتبة بأسبقية الانتهاء"} />
            </div>
            {nearExpiryUnits.length === 0 ? (
              <EmptyState title={lang === "en" ? "No units near expiry" : "لا توجد وحدات قريبة من الانتهاء"} />
            ) : (
              <div className="table-wrap border-t border-line">
                <table className="data-table">
                  <thead>
                    <tr>
                      {canDeleteUnits ? (
                        <th className="w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allCurrentSelected}
                            onChange={handleSelectAll}
                            aria-label={isRtl ? "تحديد الكل" : "Select all"}
                            className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
                          />
                        </th>
                      ) : null}
                      <th>{t("unitNumber")}</th>
                      <th>{t("bloodType")}</th>
                      <th>{lang === "en" ? "Component" : "المكوّن"}</th>
                      <th>{t("status")}</th>
                      <th>{t("quantity")}</th>
                      <th>{t("collectionDate")}</th>
                      <th>{t("expiryDate")}</th>
                      <th>{lang === "en" ? "Storage Location" : "موقع التخزين"}</th>
                      <th>{lang === "en" ? "Donation ID" : "رقم التبرع"}</th>
                      {showActions ? <th>{t("actions")}</th> : null}
                    </tr>
                  </thead>
                  <tbody>{nearExpiryUnits.map(unitRow)}</tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          <Card padding="p-0">
            <div className="p-4">
              <SectionTitle title={lang === "en" ? "Stock Movements Log" : "سجل حركات وحدات الدم"} subtitle={lang === "en" ? "Track all additions, transfers, issues, and discards" : "تتبع عمليات الإضافة والنقل والصرف والإتلاف على وحدات الدم"} />
            </div>
            {movements.length === 0 ? (
              <EmptyState title={lang === "en" ? "No movements recorded" : "لا توجد حركات مسجلة"} />
            ) : (
              <div className="table-wrap border-t border-line">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("unitNumber")}</th>
                      <th>{t("bloodType")}</th>
                      <th>{lang === "en" ? "Movement Type" : "نوع الحركة"}</th>
                      <th>{lang === "en" ? "From Location" : "من موقع"}</th>
                      <th>{lang === "en" ? "To Location" : "إلى موقع"}</th>
                      <th>{lang === "en" ? "Reason" : "السبب / البيان"}</th>
                      <th>{lang === "en" ? "User" : "المستخدم"}</th>
                      <th>{t("date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="font-semibold">{m.unitNumber}</td>
                        <td><Badge tone="danger">{m.bloodType}</Badge></td>
                        <td><Badge tone={movementTone[m.type] ?? "neutral"}>{movementLabel[m.type] ?? m.type}</Badge></td>
                        <td>{m.fromLocation ?? "—"}</td>
                        <td>{m.toLocation ?? "—"}</td>
                        <td>{m.reason ?? "—"}</td>
                        <td>{m.performedBy ?? "—"}</td>
                        <td>{formatDate(m.movementDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      <UnitDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={refreshAll}
        unit={selected}
      />

      <MovementDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        onSaved={refreshAll}
        unit={moveUnit}
      />

      {/* Confirmation Modal: Clear All Stock */}
      <Modal
        open={confirmClearAllOpen}
        onClose={() => setConfirmClearAllOpen(false)}
        title={isRtl ? "تأكيد حذف وتفريغ كل المخزون" : "Confirm Clear All Stock"}
        description={
          isRtl
            ? "تحذير: سيتم حذف جميع وحدات الدم الموجودة في المخزون بالكامل نهائياً. هل أنت متأكد؟"
            : "Warning: All blood units in inventory will be permanently deleted."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClearAllOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={handleClearAll} disabled={deleting}>
              {deleting ? (isRtl ? "جارٍ الحذف..." : "Deleting...") : (isRtl ? "نعم، حذف كل المخزون" : "Yes, Clear All")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink font-medium">
          {isRtl
            ? `أنت على وشك حذف كافة وحدات المخزون (${units.length} وحدة). هذا الإجراء لا يمكن التراجع عنه مطلقاً.`
            : "This action cannot be undone."}
        </p>
      </Modal>

      {/* Confirmation Modal: Delete Selected */}
      <Modal
        open={confirmDeleteSelectedOpen}
        onClose={() => setConfirmDeleteSelectedOpen(false)}
        title={isRtl ? "تأكيد حذف الوحدات المحددة" : "Confirm Delete Selected Units"}
        description={
          isRtl
            ? `سيتم حذف (${selectedIds.length}) وحدة دم محددة نهائياً من المخزون.`
            : `Are you sure you want to delete ${selectedIds.length} selected unit(s)?`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteSelectedOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={handleDeleteSelected} disabled={deleting}>
              {deleting ? (isRtl ? "جارٍ الحذف..." : "Deleting...") : (isRtl ? `حذف ${selectedIds.length} وحدة` : "Delete Selected")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink font-medium">
          {isRtl
            ? `سيتم إزالة الوحدات المحددة نهائياً من قاعدة البيانات.`
            : "Selected units will be permanently removed from inventory."}
        </p>
      </Modal>

      {/* Confirmation Modal: Delete Single Unit */}
      <Modal
        open={!!singleDeleteTarget}
        onClose={() => setSingleDeleteTarget(null)}
        title={isRtl ? "تأكيد حذف وحدة الدم" : "Confirm Delete Blood Unit"}
        description={
          isRtl
            ? `هل أنت متأكد من حذف وحدة الدم رقم [${singleDeleteTarget?.unitNumber}] (${singleDeleteTarget?.bloodType} - ${singleDeleteTarget?.component}) نهائياً؟`
            : `Are you sure you want to delete unit [${singleDeleteTarget?.unitNumber}]?`
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
            ? "سيتم حذف هذه الوحدة من المخزون."
            : "This blood unit will be removed from stock."}
        </p>
      </Modal>
    </div>
  );
}
