import { demoResponse } from "./demo";
import { baseUrlOf, type ApiService } from "./config";
import { getSession, notifySessionExpired } from "./session";

export type ApiErrorKind = "config" | "network" | "http";

/** Normalized error for every API failure. HTTP errors carry the backend ProblemDetails fields. */
export class ApiError extends Error {
  kind: ApiErrorKind;
  status: number;
  title?: string;
  detail?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  constructor(kind: ApiErrorKind, status: number, message: string, extra: Partial<Pick<ApiError, "title" | "detail" | "traceId" | "errors">> = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    Object.assign(this, extra);
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

export type QueryValue = string | number | boolean | Date | null | undefined;
export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
};

export function buildUrl(base: string, path: string, query?: Record<string, QueryValue>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    qs.append(k, v instanceof Date ? v.toISOString() : String(v));
  }
  const q = qs.toString();
  return `${base}${path.startsWith("/") ? path : `/${path}`}${q ? `?${q}` : ""}`;
}

export function authHeaders(): Record<string, string> {
  const s = getSession();
  if (!s) return {};
  if (s.mode === "dev") return { "X-Tenant-Id": s.tenantId, "X-User-Id": s.userId };
  return s.accessToken ? { Authorization: `Bearer ${s.accessToken}` } : {};
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("json")) {
    try { return JSON.parse(text); } catch { return text; }
  }
  return text;
}

/** Single entry point for all backend calls. */
export async function apiRequest<T = unknown>(service: ApiService, path: string, opts: RequestOptions = {}): Promise<T> {
  const base = baseUrlOf(service);
  if (!base) {
    // Demo mode until a server is configured: reads show sample records, writes succeed locally.
    await new Promise((r) => setTimeout(r, 250));
    if ((opts.method ?? (opts.body !== undefined ? "POST" : "GET")) === "GET") return demoResponse(path, opts.query) as T;
    return { id: Date.now() % 100000 } as T;
  }
  const headers: Record<string, string> = { Accept: "application/json", "X-Correlation-Id": newId(), ...authHeaders() };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(buildUrl(base, path, opts.query), {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new ApiError("network", 0, "ارتباط با سرور برقرار نشد");
  }
  const data = await parseBody(res);
  if (!res.ok) {
    const p = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    if (res.status === 401) notifySessionExpired();
    throw new ApiError("http", res.status, String(p.detail ?? p.title ?? res.statusText ?? "خطا"), {
      title: p.title as string | undefined,
      detail: (p.detail as string | undefined) ?? (typeof data === "string" ? data : undefined),
      traceId: p.traceId as string | undefined,
      errors: p.errors as Record<string, string[]> | undefined,
    });
  }
  return data as T;
}

export const api = {
  property: {
    get: <T = unknown>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) => apiRequest<T>("property", path, { query, signal }),
    post: <T = unknown>(path: string, body: unknown = {}) => apiRequest<T>("property", path, { method: "POST", body }),
    put: <T = unknown>(path: string, body: unknown = {}) => apiRequest<T>("property", path, { method: "PUT", body }),
    patch: <T = unknown>(path: string, body: unknown = {}) => apiRequest<T>("property", path, { method: "PATCH", body }),
  },
  foundation: {
    get: <T = unknown>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) => apiRequest<T>("foundation", path, { query, signal }),
    post: <T = unknown>(path: string, body: unknown = {}) => apiRequest<T>("foundation", path, { method: "POST", body }),
    put: <T = unknown>(path: string, body: unknown = {}) => apiRequest<T>("foundation", path, { method: "PUT", body }),
    del: <T = unknown>(path: string, query?: RequestOptions["query"]) => apiRequest<T>("foundation", path, { method: "DELETE", query }),
  },
};
