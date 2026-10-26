/** تحويل التاريخ المخزن (YYYY-MM-DD) إلى صيغة يوم/شهر/سنة للعرض */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const raw = value.slice(0, 10);
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/** تاريخ اليوم بصيغة YYYY-MM-DD بالتوقيت المحلي */
export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** إضافة أشهر على تاريخ ISO */
export function addMonthsISO(iso: string, months: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const base = new Date(year, month - 1 + months, day);
  const y = base.getFullYear();
  const m = `${base.getMonth() + 1}`.padStart(2, "0");
  const d = `${base.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const base = new Date(year, month - 1, day + days);
  const y = base.getFullYear();
  const m = `${base.getMonth() + 1}`.padStart(2, "0");
  const d = `${base.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** عدد الأيام المتبقية حتى تاريخ معين (سالب = منتهي) */
export function daysUntil(iso: string): number {
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

/** Treat stored available units as expired when their expiry date has passed or is invalid. */
export function currentUnitStatus(unit: { status: string; expiryDate: string }): string {
  if (unit.status !== "available") return unit.status;
  const remaining = daysUntil(unit.expiryDate);
  return Number.isFinite(remaining) && remaining >= 0 ? "available" : "expired";
}

export function isCurrentlyAvailableUnit(unit: { status: string; expiryDate: string }): boolean {
  return currentUnitStatus(unit) === "available";
}

export const isDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
