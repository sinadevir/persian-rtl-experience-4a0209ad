import { api } from "@/lib/api/client";
import { bool, num, str, toList, type Rec } from "@/lib/api/list";
import { itemQuery, listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/foundation";
type S = LooseSchemas<components["schemas"]>;

export type Company = { id: number; code: string; name: string; nameEn: string; type: string; nationalId: string; registrationNumber: string; establishedDate: string; parentId?: number; status: string; rowVersion?: string; raw: Rec };
export const mapCompany = (r: Rec): Company => ({
  id: num(r, "companyId", "id") ?? 0, code: str(r, "companyCode", "code"), name: str(r, "companyName", "name"), nameEn: str(r, "companyNameEn"),
  type: str(r, "companyType"), nationalId: str(r, "nationalId"), registrationNumber: str(r, "registrationNumber"), establishedDate: str(r, "establishedDate"),
  parentId: num(r, "parentCompanyId"), status: str(r, "status", "companyStatus") || (r.isActive === false ? "Inactive" : "Active"), rowVersion: str(r, "rowVersion") || undefined, raw: r,
});
export type OrgUnit = { id: number; companyId: number; parentId?: number; code: string; name: string; nameEn: string; type: string; status: string; rowVersion?: string; children: OrgUnit[] };
export const mapUnit = (r: Rec): OrgUnit => ({
  id: num(r, "organizationalUnitId", "unitId", "id") ?? 0, companyId: num(r, "companyId") ?? 0, parentId: num(r, "parentUnitId"), code: str(r, "unitCode", "code"),
  name: str(r, "unitName", "name"), nameEn: str(r, "unitNameEn"), type: str(r, "unitType"), status: str(r, "status") || (r.isActive === false ? "Inactive" : "Active"),
  rowVersion: str(r, "rowVersion") || undefined, children: toList<Rec>(r.children ?? r.Children ?? r.units).map(mapUnit),
});
export type Position = { id: number; code: string; title: string; isManagerial: boolean };
export const mapPosition = (r: Rec): Position => ({ id: num(r, "positionId", "id") ?? 0, code: str(r, "positionCode", "code"), title: str(r, "positionTitle", "title"), isManagerial: bool(r, "isManagerial") });
export type Appointment = { id: number; holderCode: string; holderName: string; positionId: number; positionTitle: string; unitId: number; from: string; to: string; isPrimary: boolean; rowVersion?: string };
export const mapAppointment = (r: Rec): Appointment => ({
  id: num(r, "appointmentId", "id") ?? 0, holderCode: str(r, "holderCode"), holderName: str(r, "holderName"), positionId: num(r, "positionId") ?? 0, positionTitle: str(r, "positionTitle"),
  unitId: num(r, "organizationalUnitId") ?? 0, from: str(r, "effectiveFrom"), to: str(r, "effectiveTo"), isPrimary: bool(r, "isPrimary"), rowVersion: str(r, "rowVersion") || undefined,
});

export const orgKeys = { companies: ["org", "companies"] as const, units: (companyId: number | string) => ["org", "units", String(companyId)] as const, positions: (unitId: number | string) => ["org", "positions", String(unitId)] as const, appointments: ["org", "appointments"] as const };
export const companiesQuery = (p: PageParams & { search?: string }) => pagedQuery(orgKeys.companies, "foundation", "/api/v1/organization/companies", p, mapCompany);
export const companyQuery = (id: number | string) => itemQuery([...orgKeys.companies, String(id)], "foundation", `/api/v1/organization/companies/${id}`, mapCompany);
export const companyTreeQuery = (companyId: number | string, asOf?: string) => listQuery([...orgKeys.units(companyId), "tree", asOf ?? ""], "foundation", `/api/v1/organization/companies/${companyId}/tree/as-of`, { asOf: asOf ?? new Date().toISOString() }, mapUnit, Boolean(companyId));
export const unitsQuery = (companyId: number | string, parentUnitId?: number) => listQuery(orgKeys.units(companyId), "foundation", `/api/v1/organization/companies/${companyId}/units`, { parentUnitId }, mapUnit, Boolean(companyId));
export const positionsQuery = (unitId: number | string) => listQuery(orgKeys.positions(unitId), "foundation", `/api/v1/organization/units/${unitId}/positions`, undefined, mapPosition, Boolean(unitId));
export const appointmentsAsOfQuery = (q: { organizationalUnitId?: number; positionId?: number; holderCode?: string; asOf?: string }) =>
  listQuery([...orgKeys.appointments, q], "foundation", "/api/v1/organization/appointments/as-of", { ...q, asOf: q.asOf ?? new Date().toISOString() }, mapAppointment, Boolean(q.organizationalUnitId || q.positionId || q.holderCode));

export const orgApi = {
  createCompany: (b: S["CreateCompanyRequest"]) => api.foundation.post("/api/v1/organization/companies", b),
  updateCompany: (id: number, b: S["UpdateCompanyRequest"]) => api.foundation.put(`/api/v1/organization/companies/${id}`, b),
  deactivateCompany: (id: number, b: S["DeactivateCompanyRequest"]) => api.foundation.post(`/api/v1/organization/companies/${id}/deactivate`, b),
  createUnit: (b: S["CreateOrganizationalUnitRequest"]) => api.foundation.post("/api/v1/organization/units", b),
  updateUnit: (id: number, b: S["UpdateOrganizationalUnitRequest"]) => api.foundation.put(`/api/v1/organization/units/${id}`, b),
  deactivateUnit: (id: number, b: S["DeactivateOrganizationalUnitRequest"]) => api.foundation.post(`/api/v1/organization/units/${id}/deactivate`, b),
  createPosition: (b: S["CreatePositionRequest"]) => api.foundation.post("/api/v1/organization/positions", b),
  createAppointment: (b: S["CreateAppointmentRequest"]) => api.foundation.post("/api/v1/organization/appointments", b),
  endAppointment: (id: number, b: S["EndAppointmentRequest"]) => api.foundation.post(`/api/v1/organization/appointments/${id}/end`, b),
};
