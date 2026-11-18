import { api } from "@/lib/api/client";
import { num, str, type Rec } from "@/lib/api/list";
import { itemQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/foundation";
type S = LooseSchemas<components["schemas"]>;

export type Division = { id: number; code: string; name: string; nameEn: string; type: string; parentId?: number; lat?: number; lng?: number };
export const mapDivision = (r: Rec): Division => ({
  id: num(r, "administrativeDivisionId", "divisionId", "id") ?? 0, code: str(r, "divisionCode", "code"), name: str(r, "divisionName", "name"), nameEn: str(r, "divisionNameEn"),
  type: str(r, "divisionType", "type"), parentId: num(r, "parentDivisionId", "parentId"), lat: num(r, "latitude"), lng: num(r, "longitude"),
});
export type ServiceArea = { id: number; companyId: number; code: string; name: string; type: string; divisionId?: number; responsibleUnitId?: number; description: string; boundary: string; status: string; rowVersion?: string };
export const mapServiceArea = (r: Rec): ServiceArea => ({
  id: num(r, "serviceAreaId", "id") ?? 0, companyId: num(r, "companyId") ?? 0, code: str(r, "areaCode", "code"), name: str(r, "areaName", "name"), type: str(r, "areaType", "type"),
  divisionId: num(r, "administrativeDivisionId"), responsibleUnitId: num(r, "responsibleUnitId"), description: str(r, "description"), boundary: str(r, "boundaryGeoJson"),
  status: str(r, "status") || (r.isActive === false ? "Inactive" : "Active"), rowVersion: str(r, "rowVersion") || undefined,
});
export const geoKeys = { divisions: ["geo", "divisions"] as const, areas: ["geo", "areas"] as const };
export const divisionsQuery = (p: PageParams & { type?: string; parentId?: number; search?: string }) => pagedQuery(geoKeys.divisions, "foundation", "/api/v1/geography/divisions", p, mapDivision);
export const serviceAreasQuery = (p: PageParams & { companyId?: number; areaType?: string; search?: string }) => pagedQuery(geoKeys.areas, "foundation", "/api/v1/geography/service-areas", p, mapServiceArea);
export const serviceAreaQuery = (id: number | string) => itemQuery([...geoKeys.areas, String(id)], "foundation", `/api/v1/geography/service-areas/${id}`, mapServiceArea);
export const geoApi = {
  createDivision: (b: S["CreateAdministrativeDivisionRequest"]) => api.foundation.post("/api/v1/geography/divisions", b),
  createArea: (b: S["CreateServiceAreaRequest"]) => api.foundation.post("/api/v1/geography/service-areas", b),
  updateArea: (id: number, b: S["UpdateServiceAreaRequest"]) => api.foundation.put(`/api/v1/geography/service-areas/${id}`, b),
  deactivateArea: (id: number, b: S["DeactivateServiceAreaRequest"]) => api.foundation.post(`/api/v1/geography/service-areas/${id}/deactivate`, b),
};
