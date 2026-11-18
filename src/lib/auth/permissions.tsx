import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { pick, str, toList } from "@/lib/api/list";
import { useSession } from "@/lib/api/session";
import type { PermissionCode } from "./permission-codes";

/**
 * enforced: the user's roles were read from Access and only granted actions are shown.
 * unknown: roles could not be read (or none are registered); actions stay visible and the server decides (403).
 */
export type PermissionState = { status: "loading" | "enforced" | "unknown"; codes: Set<string>; roles: string[]; can: (code: PermissionCode | PermissionCode[]) => boolean };

const active = (r: unknown, now = Date.now()) => {
  const to = pick<string>(r, "effectiveTo", "validTo");
  const st = str(r, "status").toLowerCase();
  return (!to || new Date(to).getTime() > now) && st !== "revoked" && st !== "inactive";
};

export async function loadPermissions(userId: string): Promise<{ codes: string[]; roles: string[] }> {
  const userRoles = toList(await api.foundation.get(`/api/v1/access/users/${encodeURIComponent(userId)}/roles`)).filter((r) => active(r));
  const roleIds = [...new Set(userRoles.map((r) => str(r, "roleId", "id")).filter(Boolean))];
  const lists = await Promise.all(roleIds.map((id) => api.foundation.get(`/api/v1/access/roles/${id}/permissions`).then(toList)));
  const codes = lists.flat().map((p) => str(p, "permissionCode", "code")).filter(Boolean);
  return { codes: [...new Set(codes)], roles: userRoles.map((r) => str(r, "roleName", "roleCode")).filter(Boolean) };
}

export function resolvePermissions(status: "loading" | "error" | "success", data?: { codes: string[]; roles: string[] }): PermissionState {
  const codes = new Set(data?.codes ?? []);
  const st: PermissionState["status"] = status === "loading" ? "loading" : status === "success" && codes.size > 0 ? "enforced" : "unknown";
  return {
    status: st, codes, roles: data?.roles ?? [],
    can: (c) => st !== "enforced" || (Array.isArray(c) ? c.some((x) => codes.has(x)) : codes.has(c)),
  };
}

const Ctx = createContext<PermissionState>(resolvePermissions("error"));

export function PermissionProvider({ children }: { children: ReactNode }) {
  const s = useSession();
  const q = useQuery({
    queryKey: ["me", "permissions", s?.tenantId, s?.userId],
    queryFn: () => loadPermissions(s!.userId),
    enabled: Boolean(s?.userId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const value = useMemo(() => resolvePermissions(q.isPending && Boolean(s?.userId) ? "loading" : q.isSuccess ? "success" : "error", q.data), [q.isPending, q.isSuccess, q.data, s?.userId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePermissions = () => useContext(Ctx);
export const useCan = (code: PermissionCode | PermissionCode[]) => usePermissions().can(code);

/** Renders children only when the user may perform the action. */
export function Can({ perm, children, fallback = null }: { perm: PermissionCode | PermissionCode[]; children: ReactNode; fallback?: ReactNode }) {
  return useCan(perm) ? <>{children}</> : <>{fallback}</>;
}
