import { isDate } from "./format";
import type { FieldErrors } from "./types";

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export const requireText = (errors: FieldErrors, key: string, value: unknown, label: string) => {
  const clean = text(value);
  if (!clean) errors[key] = `${label} مطلوب`;
  return clean;
};

export const requireNumber = (
  errors: FieldErrors,
  key: string,
  value: unknown,
  label: string,
  bounds: { min?: number; max?: number } = {},
) => {
  const raw = typeof value === "number" ? value : Number(text(value));
  if (!Number.isFinite(raw)) {
    errors[key] = `${label} مطلوب ويجب أن يكون رقمًا`;
    return NaN;
  }
  if (!Number.isInteger(raw)) {
    errors[key] = `${label} يجب أن يكون عددًا صحيحًا`;
  }
  const min = bounds.min ?? 0;
  const max = bounds.max ?? 150;
  if (raw < min || raw > max) {
    errors[key] = `${label} غير صحيح`;
  }
  return raw;
};

export const requireDate = (errors: FieldErrors, key: string, value: unknown, label: string) => {
  const clean = text(value);
  if (!isDate(clean)) {
    errors[key] = `يجب اختيار ${label} من التقويم`;
    return "";
  }
  return clean;
};

export const optionalText = (value: unknown): string | null => {
  const clean = text(value);
  return clean ? clean : null;
};

export const requireOption = (
  errors: FieldErrors,
  key: string,
  value: unknown,
  label: string,
  allowed: readonly string[],
) => {
  const clean = text(value);
  if (!clean) {
    errors[key] = `${label} مطلوب`;
    return "";
  }
  if (!allowed.includes(clean)) {
    errors[key] = `قيمة ${label} غير صحيحة`;
    return "";
  }
  return clean;
};

export const optionalNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const clean = text(value);
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
};
