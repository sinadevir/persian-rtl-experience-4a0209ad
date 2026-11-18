import { faToEnDigits, toDateOnly } from "./jalali";

export type FormValue = string | boolean | Date | string[] | undefined;
export type FormValues = Record<string, FormValue>;

/** Helpers that turn form state into API request fields (empty → undefined/null as the DTO expects). */
export const text = (v: FormValue) => (typeof v === "string" && v.trim() ? faToEnDigits(v.trim()) : undefined);
export const rawText = (v: FormValue) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
export const int = (v: FormValue) => { const t = text(v); if (t === undefined) return undefined; const n = Number(t); return Number.isFinite(n) ? n : undefined; };
export const reqInt = (v: FormValue) => int(v) ?? 0;
export const isoDate = (v: FormValue) => (v instanceof Date ? v.toISOString() : undefined);
export const dateOnly = (v: FormValue) => (v instanceof Date ? toDateOnly(v) : undefined);
export const flag = (v: FormValue) => v === true;
