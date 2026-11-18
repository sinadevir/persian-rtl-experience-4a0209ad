import { useSyncExternalStore } from "react";

/** Which backend a request goes to. Paths in the Swagger docs are relative to these base URLs. */
export type ApiService = "property" | "foundation";

export type ApiConfig = {
  /** PropertyDomain.WebApi base URL (B01–B07). */
  propertyUrl: string;
  /** BusinessFoundation API base URL (organization, geography, reference data, access…). */
  foundationUrl: string;
  /** OIDC authority trusted by the backend (`Authentication:Authority`). */
  authAuthority: string;
  authClientId: string;
  authScope: string;
  /** Development sign-in with X-Tenant-Id / X-User-Id headers; the backend accepts it only in Development. */
  allowDevLogin: boolean;
};

const KEY = "cis.api-config";
const env = import.meta.env as Record<string, string | boolean | undefined>;
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export const envConfig = (): ApiConfig => ({
  propertyUrl: s(env.VITE_PROPERTY_API_URL),
  foundationUrl: s(env.VITE_FOUNDATION_API_URL),
  authAuthority: s(env.VITE_AUTH_AUTHORITY),
  authClientId: s(env.VITE_AUTH_CLIENT_ID),
  authScope: s(env.VITE_AUTH_SCOPE) || "openid profile",
  allowDevLogin: env.DEV === true || env.VITE_ALLOW_DEV_LOGIN === "true",
});

let cache: ApiConfig | null = null;
const listeners = new Set<() => void>();

function read(): ApiConfig {
  const base = envConfig();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return base;
    const o = JSON.parse(raw) as Partial<ApiConfig>;
    return { ...base, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) };
  } catch {
    return base;
  }
}

export function getApiConfig(): ApiConfig {
  if (!cache) cache = read();
  return cache;
}

export function saveApiConfig(next: Partial<ApiConfig>) {
  const merged = { ...getApiConfig(), ...next };
  window.localStorage.setItem(KEY, JSON.stringify(merged));
  cache = merged;
  listeners.forEach((l) => l());
}

export function resetApiConfig() {
  window.localStorage.removeItem(KEY);
  cache = null;
  listeners.forEach((l) => l());
}

export const trimSlash = (u: string) => u.replace(/\/+$/, "");
export const baseUrlOf = (service: ApiService, c = getApiConfig()) => trimSlash(service === "property" ? c.propertyUrl : c.foundationUrl);
export const isConfigured = (c = getApiConfig()) => Boolean(c.propertyUrl && c.foundationUrl);
export const oidcEnabled = (c = getApiConfig()) => Boolean(c.authAuthority && c.authClientId);

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const serverSnapshot = envConfig();
export const useApiConfig = () => useSyncExternalStore(subscribe, getApiConfig, () => serverSnapshot);
