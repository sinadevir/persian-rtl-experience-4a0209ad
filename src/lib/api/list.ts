/** The Swagger contract does not document response bodies, so readers below accept the common
 *  ASP.NET shapes (camelCase / PascalCase, bare arrays or paged envelopes). */
export type Rec = Record<string, unknown>;
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

const pascal = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);

export function pick<T = unknown>(r: unknown, ...keys: string[]): T | undefined {
  if (!r || typeof r !== "object") return undefined;
  const o = r as Rec;
  for (const k of keys) {
    const v = o[k] ?? o[pascal(k)];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}
export const str = (r: unknown, ...keys: string[]) => { const v = pick(r, ...keys); return v === undefined ? "" : String(v); };
export const num = (r: unknown, ...keys: string[]) => { const v = pick(r, ...keys); const n = Number(v); return v === undefined || Number.isNaN(n) ? undefined : n; };
export const bool = (r: unknown, ...keys: string[]) => { const v = pick(r, ...keys); return v === true || v === "true" || v === 1; };

const LIST_KEYS = ["items", "data", "results", "value", "records", "rows"];

export function toList<T = Rec>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object") {
    for (const k of LIST_KEYS) {
      const v = pick(res, k);
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

export function toPage<T = Rec>(res: unknown, page = 1, pageSize = 20): Page<T> {
  const items = toList<T>(res);
  const total = Array.isArray(res) ? items.length : (num(res, "totalCount", "total", "count", "totalItems", "totalRecords") ?? items.length);
  return {
    items,
    total,
    page: Array.isArray(res) ? page : (num(res, "page", "pageNumber", "currentPage") ?? page),
    pageSize: Array.isArray(res) ? pageSize : (num(res, "pageSize", "size") ?? pageSize),
  };
}

/** Optimistic-concurrency token the backend returns as RowVersion (base64). */
export const rowVersion = (r: unknown) => str(r, "rowVersion", "expectedRowVersion") || undefined;
