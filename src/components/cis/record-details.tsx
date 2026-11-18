import type { ReactNode } from "react";
import { fieldLabel } from "@/lib/field-labels";
import { statusLabel } from "@/lib/status";
import { faDigits, faNum, toJalali, toJalaliDateTime } from "@/lib/jalali";
import { cn } from "@/lib/utils";

const ISO = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** Turns a JSON string into an object when possible, so server snapshots read as fields. */
export function parseRecord(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const t = value.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return value;
  try { return JSON.parse(t); } catch { return value; }
}

/** A single value in Persian: dates in Solar Hijri, yes/no, status names, Persian digits. */
export function formatValue(key: string, value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "number") return /(id|code|number|year)$/i.test(key) ? faDigits(value) : faNum(value);
  if (typeof value === "string") {
    if (ISO.test(value)) return value.length <= 10 || /T00:00(:00(\.0+)?)?Z?$/.test(value) ? toJalali(value) : toJalaliDateTime(value);
    if (/(status|state)$/i.test(key)) return statusLabel(value);
    return value;
  }
  return null;
}

/** Shows any server record as Persian label / value rows, right to left, nested objects indented. */
export function RecordDetails({ value, empty = "اطلاعاتی ثبت نشده است.", className }: { value: unknown; empty?: string; className?: string }) {
  const v = parseRecord(value);
  if (v === null || v === undefined || v === "") return <p className="text-sm text-muted-foreground">{empty}</p>;
  if (Array.isArray(v)) {
    if (!v.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
    return (
      <ol className={cn("space-y-2", className)}>
        {v.map((item, i) => (
          <li key={i} className="rounded-md border bg-card p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">ردیف {faNum(i + 1)}</div>
            <RecordDetails value={item} empty={empty} />
          </li>
        ))}
      </ol>
    );
  }
  if (typeof v !== "object") return <p className="text-sm">{formatValue("", v)}</p>;
  const entries = Object.entries(v as Record<string, unknown>);
  if (!entries.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <dl className={cn("grid gap-y-2 text-sm", className)}>
      {entries.map(([k, val]) => {
        const nested = val !== null && typeof val === "object";
        return (
          <div key={k} className={cn("border-b border-dashed pb-2", !nested && "grid grid-cols-[minmax(7rem,40%)_1fr] items-baseline gap-3")}>
            <dt className="text-muted-foreground">{fieldLabel(k)}</dt>
            <dd className={cn("text-start font-medium break-words", nested && "mt-2 border-s-2 border-primary/30 ps-3")}>
              {nested ? <RecordDetails value={val} empty="—" /> : formatValue(k, val)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
