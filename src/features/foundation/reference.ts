import { api } from "@/lib/api/client";
import { bool, num, str, type Rec } from "@/lib/api/list";
import { listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/foundation";
type S = LooseSchemas<components["schemas"]>;

export type RefGroup = { id: number; code: string; name: string; nameEn: string; description: string; allowsCustom: boolean; itemCount?: number };
export const mapGroup = (r: Rec): RefGroup => ({
  id: num(r, "referenceGroupId", "groupId", "id") ?? 0, code: str(r, "groupCode", "code"), name: str(r, "groupName", "name"), nameEn: str(r, "groupNameEn"),
  description: str(r, "description"), allowsCustom: bool(r, "allowsCustomItems"), itemCount: num(r, "itemCount", "itemsCount"),
});
export type RefItem = { id: number; code: string; name: string; nameEn: string; status: string; sortOrder: number; isDefault: boolean; externalCode: string; description: string; rowVersion?: string };
export const mapItem = (r: Rec): RefItem => ({
  id: num(r, "referenceItemId", "itemId", "id") ?? 0, code: str(r, "itemCode", "code"), name: str(r, "itemName", "name"), nameEn: str(r, "itemNameEn"),
  status: str(r, "status", "itemStatus") || "Active", sortOrder: num(r, "sortOrder") ?? 0, isDefault: bool(r, "isDefault"), externalCode: str(r, "externalCode"),
  description: str(r, "description"), rowVersion: str(r, "rowVersion") || undefined,
});
export type ExternalSystem = { id: number; code: string; name: string; type: string; status: string; rowVersion?: string };
export const mapSystem = (r: Rec): ExternalSystem => ({ id: num(r, "externalSystemId", "id") ?? 0, code: str(r, "systemCode", "code"), name: str(r, "systemName", "name"), type: str(r, "systemType"), status: str(r, "status") || (r.isActive === false ? "Inactive" : "Active"), rowVersion: str(r, "rowVersion") || undefined });
export type CodingStandard = { id: number; code: string; name: string; authority: string; status: string; rowVersion?: string };
export const mapStandard = (r: Rec): CodingStandard => ({ id: num(r, "codingStandardId", "id") ?? 0, code: str(r, "standardCode", "code"), name: str(r, "standardName", "name"), authority: str(r, "authority"), status: str(r, "status") || (r.isActive === false ? "Inactive" : "Active"), rowVersion: str(r, "rowVersion") || undefined });
export type Mapping = { id: number; system: string; entityType: string; groupCode: string; internalCode: string; externalCode: string; externalName: string; direction: string; status: string; validFrom: string; validTo: string; rowVersion?: string };
export const mapMapping = (r: Rec): Mapping => ({
  id: num(r, "externalCodeMappingId", "mappingId", "id") ?? 0, system: str(r, "externalSystemCode"), entityType: str(r, "internalEntityType"), groupCode: str(r, "internalGroupCode"),
  internalCode: str(r, "internalCode"), externalCode: str(r, "externalCode"), externalName: str(r, "externalName"), direction: str(r, "direction"),
  status: str(r, "status") || "Active", validFrom: str(r, "validFrom"), validTo: str(r, "validTo"), rowVersion: str(r, "rowVersion") || undefined,
});

export const refKeys = { groups: ["ref", "groups"] as const, items: (g: string) => ["ref", "items", g] as const, systems: ["ref", "systems"] as const, standards: ["ref", "standards"] as const, mappings: ["ref", "mappings"] as const };
export const refGroupsQuery = (p: PageParams & { search?: string }) => pagedQuery(refKeys.groups, "foundation", "/api/v1/reference-data/groups", p, mapGroup);
export const refItemsQuery = (groupCode: string, activeOnly = false) => listQuery(refKeys.items(groupCode), "foundation", `/api/v1/reference-data/groups/${encodeURIComponent(groupCode)}/items`, { activeOnly }, mapItem, Boolean(groupCode));
export const externalSystemsQuery = (search?: string) => listQuery([...refKeys.systems, search ?? ""], "foundation", "/api/v1/reference-data/external-systems", { search }, mapSystem);
export const codingStandardsQuery = (search?: string) => listQuery([...refKeys.standards, search ?? ""], "foundation", "/api/v1/reference-data/coding-standards", { search }, mapStandard);
export const mappingsQuery = (p: PageParams & { externalSystemCode?: string; internalEntityType?: string; internalGroupCode?: string; search?: string; activeOnly?: boolean }) =>
  pagedQuery(refKeys.mappings, "foundation", "/api/v1/reference-data/mappings", p, mapMapping);

export const refApi = {
  createGroup: (b: S["CreateReferenceGroupRequest"]) => api.foundation.post("/api/v1/reference-data/groups", b),
  createItem: (b: S["CreateReferenceItemRequest"]) => api.foundation.post("/api/v1/reference-data/items", b),
  changeItemStatus: (id: number, b: S["ChangeReferenceItemStatusRequest"]) => api.foundation.post(`/api/v1/reference-data/items/${id}/status`, b),
  createSystem: (b: S["CreateExternalSystemRequest"]) => api.foundation.post("/api/v1/reference-data/external-systems", b),
  deactivateSystem: (id: number, b: S["DeactivateExternalSystemRequest"]) => api.foundation.post(`/api/v1/reference-data/external-systems/${id}/deactivate`, b),
  createStandard: (b: S["CreateCodingStandardRequest"]) => api.foundation.post("/api/v1/reference-data/coding-standards", b),
  deactivateStandard: (id: number, b: S["DeactivateCodingStandardRequest"]) => api.foundation.post(`/api/v1/reference-data/coding-standards/${id}/deactivate`, b),
  createMapping: (b: S["CreateExternalCodeMappingRequest"]) => api.foundation.post("/api/v1/reference-data/mappings", b),
  updateMapping: (id: number, b: S["UpdateExternalCodeMappingRequest"]) => api.foundation.put(`/api/v1/reference-data/mappings/${id}`, b),
  resolveExternal: (q: { externalSystemCode: string; externalCode: string; internalEntityType: string; internalGroupCode?: string }) => api.foundation.get<Rec>("/api/v1/reference-data/mappings/resolve-external", q),
};
