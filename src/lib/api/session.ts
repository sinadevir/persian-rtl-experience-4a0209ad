import { useSyncExternalStore } from "react";

export type Session = {
  mode: "oidc" | "dev";
  accessToken?: string;
  idToken?: string;
  /** epoch ms */
  expiresAt?: number;
  tenantId: string;
  userId: string;
  displayName: string;
  userName?: string;
};

const KEY = "cis.session";
const listeners = new Set<() => void>();
let cache: Session | null | undefined;

function read(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.expiresAt && s.expiresAt < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  if (cache === undefined) cache = read();
  if (cache?.expiresAt && cache.expiresAt < Date.now()) { clearSession(); return null; }
  return cache;
}

export function setSession(s: Session) {
  window.localStorage.setItem(KEY, JSON.stringify(s));
  cache = s;
  listeners.forEach((l) => l());
}

export function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  cache = null;
  listeners.forEach((l) => l());
}

/** Raised by the API client when the server answers 401 so the shell can send the user to sign in. */
export const SESSION_EXPIRED = "cis:session-expired";
export const notifySessionExpired = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED)); };

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const useSession = () => useSyncExternalStore(subscribe, getSession, () => null);

/** Reads JWT claims the backend relies on: `tenant_id` and the user id (`sub` / NameIdentifier). */
export function claimsFromToken(token: string): { tenantId: string; userId: string; name: string; userName: string; exp?: number } {
  const part = token.split(".")[1];
  if (!part) throw new Error("توکن دریافتی معتبر نیست");
  const json = decodeURIComponent(
    atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="))
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
  const c = JSON.parse(json) as Record<string, unknown>;
  const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
  const userId = str(c["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? c["nameid"] ?? c["sub"]);
  return {
    tenantId: str(c["tenant_id"]),
    userId,
    name: str(c["name"] ?? c["given_name"] ?? c["preferred_username"] ?? userId),
    userName: str(c["preferred_username"] ?? c["unique_name"] ?? ""),
    exp: typeof c["exp"] === "number" ? (c["exp"] as number) : undefined,
  };
}
