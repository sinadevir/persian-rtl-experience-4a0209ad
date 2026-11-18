import { api } from "@/lib/api/client";
import { bool, num, str, type Rec } from "@/lib/api/list";
import { itemQuery, listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/foundation";
type S = LooseSchemas<components["schemas"]>;

export type User = { id: number; userName: string; displayName: string; email: string; mobile: string; nationalId: string; status: string; companyId?: number; unitId?: number };
export const mapUser = (r: Rec): User => ({
  id: num(r, "userId", "id") ?? 0, userName: str(r, "userName"), displayName: str(r, "displayName", "name"), email: str(r, "email"), mobile: str(r, "mobilePhone"),
  nationalId: str(r, "nationalId"), status: str(r, "status", "userStatus") || "Active", companyId: num(r, "defaultCompanyId"), unitId: num(r, "defaultOrganizationalUnitId"),
});
export type Role = { id: number; code: string; name: string; nameEn: string; description: string };
export const mapRole = (r: Rec): Role => ({ id: num(r, "roleId", "id") ?? 0, code: str(r, "roleCode", "code"), name: str(r, "roleName", "name"), nameEn: str(r, "roleNameEn"), description: str(r, "description") });
export type Permission = { id: number; code: string; name: string; module: string; description: string };
export const mapPermission = (r: Rec): Permission => ({ id: num(r, "permissionId", "id") ?? 0, code: str(r, "permissionCode", "code"), name: str(r, "permissionName", "name"), module: str(r, "moduleCode"), description: str(r, "description") });
export type UserRole = { id: number; roleId: number; roleName: string; companyId?: number; unitId?: number; from: string; to: string; active: boolean };
export const mapUserRole = (r: Rec): UserRole => ({
  id: num(r, "userRoleId", "id") ?? 0, roleId: num(r, "roleId") ?? 0, roleName: str(r, "roleName", "roleCode"), companyId: num(r, "companyId"), unitId: num(r, "organizationalUnitId"),
  from: str(r, "effectiveFrom"), to: str(r, "effectiveTo"), active: r.isActive === undefined && r.IsActive === undefined ? !str(r, "effectiveTo") || new Date(str(r, "effectiveTo")) > new Date() : bool(r, "isActive"),
});
export type SodRule = { id: number; a: string; b: string; description: string; active: boolean };
export const mapSod = (r: Rec): SodRule => ({ id: num(r, "ruleId", "roleSegregationRuleId", "id") ?? 0, a: str(r, "roleCodeA"), b: str(r, "roleCodeB"), description: str(r, "description"), active: r.isActive === undefined && r.IsActive === undefined ? true : bool(r, "isActive") });

export const accessKeys = { users: ["access", "users"] as const, roles: ["access", "roles"] as const, perms: ["access", "permissions"] as const, sod: ["access", "sod"] as const };
export const usersQuery = (p: PageParams & { search?: string }) => pagedQuery(accessKeys.users, "foundation", "/api/v1/access/users", p, mapUser);
export const userQuery = (id: number | string) => itemQuery([...accessKeys.users, String(id)], "foundation", `/api/v1/access/users/${id}`, mapUser, undefined, Boolean(id));
export const userRolesQuery = (id: number | string) => listQuery([...accessKeys.users, String(id), "roles"], "foundation", `/api/v1/access/users/${id}/roles`, undefined, mapUserRole, Boolean(id));
export const rolesQuery = (search?: string) => listQuery([...accessKeys.roles, search ?? ""], "foundation", "/api/v1/access/roles", { search }, mapRole);
export const rolePermissionsQuery = (roleId: number | string) => listQuery([...accessKeys.roles, String(roleId), "permissions"], "foundation", `/api/v1/access/roles/${roleId}/permissions`, undefined, mapPermission, Boolean(roleId));
export const permissionsQuery = (q: { moduleCode?: string; search?: string }) => listQuery([...accessKeys.perms, q], "foundation", "/api/v1/access/permissions", q, mapPermission);
export const sodRulesQuery = (search?: string) => listQuery([...accessKeys.sod, search ?? ""], "foundation", "/api/v1/access/sod-rules", { search }, mapSod);

export const accessApi = {
  createUser: (b: S["CreateUserRequest"]) => api.foundation.post("/api/v1/access/users", b),
  createRole: (b: S["CreateRoleRequest"]) => api.foundation.post("/api/v1/access/roles", b),
  assignRole: (b: S["AssignRoleRequest"]) => api.foundation.post("/api/v1/access/user-roles", b),
  revokeRole: (userRoleId: number) => api.foundation.post(`/api/v1/access/user-roles/${userRoleId}/revoke`),
  createPermission: (b: S["CreatePermissionRequest"]) => api.foundation.post("/api/v1/access/permissions", b),
  grant: (b: S["GrantPermissionToRoleRequest"]) => api.foundation.post("/api/v1/access/role-permissions", b),
  revokePermission: (roleId: number, permissionId: number) => api.foundation.del("/api/v1/access/role-permissions", { roleId, permissionId }),
  evaluate: (b: S["EvaluatePermissionRequest"]) => api.foundation.post<Rec>("/api/v1/access/evaluate-permission", b),
  createSod: (b: S["CreateRoleSegregationRuleRequest"]) => api.foundation.post("/api/v1/access/sod-rules", b),
  deactivateSod: (id: number) => api.foundation.post(`/api/v1/access/sod-rules/${id}/deactivate`),
};
