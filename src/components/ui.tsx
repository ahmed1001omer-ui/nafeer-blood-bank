"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { formatDate, todayISO } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Card / Section                                                      */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
  padding = "p-5",
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return <section className={`surface ${padding} ${className}`}>{children}</section>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-bold leading-tight text-ink">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-[13.5px] text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost";

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  onClick,
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  required,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label flex items-center gap-1 font-semibold text-[13.5px] text-ink mb-1.5">
        <span>{label}</span>
        {required ? <span className="required font-bold text-[var(--color-brand)]">*</span> : null}
      </label>
      {children}
      {error ? <span className="field-error text-[12px] text-red-600 font-medium mt-1 block">{error}</span> : null}
      {!error && hint ? <span className="field-hint text-[12px] text-muted mt-1 block">{hint}</span> : null}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  invalid,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  type?: "text" | "number" | "tel" | "date" | "password" | "email";
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      className={`field-input ${invalid ? "field-input-invalid" : ""} ${className}`}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  invalid,
  disabled,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[] | readonly string[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={`field-input ${invalid ? "field-input-invalid" : ""} ${className}`}
    >
      <option value="">{placeholder ?? "اختر"}</option>
      {normalized.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  invalid,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`field-input ${invalid ? "field-input-invalid" : ""}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Date picker (تقويم حقيقي — يخزن التاريخ كـ ISO ويعرض يوم/شهر/سنة)   */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];
const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function DatePicker({
  value,
  onChange,
  invalid,
  placeholder = "اختر التاريخ",
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initial = value ? value.slice(0, 10) : todayISO();
  const [view, setView] = useState(() => {
    const [year, month] = initial.split("-").map(Number);
    return { year, month };
  });

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const openWithView = () => {
    if (value) {
      const [year, month] = value.slice(0, 10).split("-").map(Number);
      setView({ year, month });
    }
    setOpen(true);
  };

  const days = useMemo(() => {
    const first = new Date(view.year, view.month - 1, 1);
    // الأسبوع يبدأ من السبت
    const offset = (first.getDay() + 1) % 7;
    const total = new Date(view.year, view.month, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let day = 1; day <= total; day += 1) {
      const month = `${view.month}`.padStart(2, "0");
      const dayStr = `${day}`.padStart(2, "0");
      cells.push(`${view.year}-${month}-${dayStr}`);
    }
    return cells;
  }, [view]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openWithView())}
        className={`field-input flex items-center justify-between text-right cursor-pointer hover:border-[var(--color-brand)] transition-colors ${
          invalid ? "field-input-invalid" : ""
        }`}
      >
        <span className={value ? "text-ink font-semibold" : "text-muted"}>
          {value ? formatDate(value) : placeholder}
        </span>
        <div className="flex items-center gap-1.5 text-[var(--color-brand)] opacity-85">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      </button>

      {open ? (
        <div className="surface absolute z-40 mt-2 w-[276px] p-3 shadow-[0_12px_40px_rgba(16,24,40,0.14)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setView((prev) =>
                  prev.month === 12 ? { year: prev.year + 1, month: 1 } : { ...prev, month: prev.month + 1 },
                )
              }
            >
              ‹
            </button>
            <div className="flex items-center gap-1">
              <select
                value={view.month}
                onChange={(event) => setView((prev) => ({ ...prev, month: Number(event.target.value) }))}
                className="field-input h-8 w-[92px] px-2 text-[12.5px]"
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={view.year}
                onChange={(event) => setView((prev) => ({ ...prev, year: Number(event.target.value) }))}
                className="field-input h-8 w-[76px] px-2 text-[12.5px]"
              >
                {Array.from({ length: 60 }, (_, index) => new Date().getFullYear() + 10 - index).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setView((prev) =>
                  prev.month === 1 ? { year: prev.year - 1, month: 12 } : { ...prev, month: prev.month - 1 },
                )
              }
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-[11px] font-semibold text-muted">
                {day}
              </span>
            ))}
            {days.map((day, index) =>
              day ? (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-[10px] text-[12.5px] font-medium transition-colors ${
                    value && value.slice(0, 10) === day
                      ? "bg-brand text-white"
                      : "text-ink hover:bg-page"
                  }`}
                >
                  {Number(day.slice(8, 10))}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const today = todayISO();
                onChange(today);
                const [year, month] = today.split("-").map(Number);
                setView({ year, month });
                setOpen(false);
              }}
            >
              اليوم
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  width = "max-w-2xl",
  showCloseButton = true,
  icon,
  closeOnClickOutside = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  showCloseButton?: boolean;
  icon?: ReactNode;
  closeOnClickOutside?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-md animate-fade overflow-y-auto"
      onClick={(e) => {
        if (closeOnClickOutside && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`surface w-full ${width} max-h-[84vh] flex flex-col rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] border border-[var(--border-line)] border-t-4 border-t-[var(--color-brand)] animate-rise my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header: flex-shrink-0 so it NEVER scrolls or disappears */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-line)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-3 min-w-0">
            {icon ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center text-xl shadow-sm">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              <h3 className="text-[17px] font-bold text-ink leading-snug truncate">{title}</h3>
              {description ? (
                <p className="mt-0.5 text-[12px] text-muted leading-tight truncate">{description}</p>
              ) : null}
            </div>
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-[var(--bg-elevated)] transition-colors text-base font-bold"
              aria-label="إغلاق النافذة"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          ) : null}
        </div>

        {/* Scrollable Body: min-h-0 is essential so flexbox allows internal scrollbar */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 custom-scrollbar bg-[var(--bg-card)]">
          {children}
        </div>

        {/* Sticky Footer: flex-shrink-0 */}
        {footer ? (
          <div className="flex-shrink-0 flex flex-wrap items-center justify-end gap-2.5 bg-[var(--bg-elevated)] px-5 py-3 border-t border-[var(--border-line)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Badge({ tone = "neutral", children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-14 text-center">
      <p className="text-[14.5px] font-semibold text-ink">{title}</p>
      {description ? <p className="text-[13px] text-muted">{description}</p> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="surface p-5">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={`mt-2 text-[28px] font-bold leading-none ${accent ? "text-brand" : "text-ink"}`}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-[12.5px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    info: "bg-[var(--color-info-soft)] text-[var(--color-info)] border border-[var(--color-info)]/20",
    success: "bg-[var(--color-success-soft)] text-[var(--color-success)] border border-[var(--color-success)]/20",
    warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning)]/20",
    danger: "bg-[var(--color-brand-soft)] text-[var(--color-brand)] border border-[var(--color-brand)]/20",
  };
  return <div className={`rounded-[12px] px-4 py-3 text-[13.5px] font-medium ${tones[tone]}`}>{children}</div>;
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: { value: string; label: string; count?: number }[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`btn ${active === item.value ? "btn-primary" : "btn-secondary"}`}
        >
          {item.label}
          {typeof item.count === "number" ? (
            <span className={active === item.value ? "text-white/80" : "text-muted"}>({item.count})</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function ReadOnlyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-line)] py-2 last:border-0">
      <span className="text-[12.5px] font-medium text-muted">{label}</span>
      <span className="text-[13px] font-semibold text-ink">{value}</span>
    </div>
  );
}

export function useFormErrors() {
  const id = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  return {
    id,
    errors,
    setErrors,
    clear: () => setErrors({}),
    apply: (next: Record<string, string>) => setErrors(next),
  };
}
