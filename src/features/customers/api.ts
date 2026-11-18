import { api } from "@/lib/api/client";
import { bool, num, str, type Rec } from "@/lib/api/list";
import { itemQuery, listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import { partyName } from "@/features/parties/api";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/property";
type S = LooseSchemas<components["schemas"]>;

export type Customer = { id: number; number: string; status: string; principalPartyId?: number; principalName: string; nationalId: string; mergedInto?: number; createdAt: string; rowVersion?: string; raw: Rec };
export const mapCustomer = (r: Rec): Customer => ({
  id: num(r, "customerId", "id") ?? 0, number: str(r, "customerNumber", "number"), status: str(r, "customerStatus", "status"),
  principalPartyId: num(r, "principalPartyId", "partyId"), principalName: str(r, "principalName", "principalPartyName") || (r.principal ? partyName(r.principal) : ""),
  nationalId: str(r, "nationalId", "principalNationalId"), mergedInto: num(r, "mergedIntoCustomerId"), createdAt: str(r, "createdAt"),
  rowVersion: str(r, "rowVersion") || undefined, raw: r,
});

export type Association = { id: number; partyId: number; partyName: string; role: string; isPrincipal: boolean; validFrom: string; validTo: string; reason: string };
export const mapAssociation = (r: Rec): Association => ({
  id: num(r, "associationId", "id") ?? 0, partyId: num(r, "partyId") ?? 0, partyName: str(r, "partyName", "displayName") || partyName(r),
  role: str(r, "associationRole", "role"), isPrincipal: bool(r, "isPrincipal"), validFrom: str(r, "validFrom"), validTo: str(r, "validTo"), reason: str(r, "changeReason", "reason"),
});

export type Restriction = { id: number; type: string; status: string; from: string; to: string; reason: string; reference: string; imposedAt: string; releasedAt: string };
export const mapRestriction = (r: Rec): Restriction => ({
  id: num(r, "customerRestrictionId", "restrictionId", "id") ?? 0, type: str(r, "restrictionType", "type"), status: str(r, "restrictionStatus", "status"),
  from: str(r, "effectiveFrom", "validFrom"), to: str(r, "effectiveTo", "validTo"), reason: str(r, "restrictionReason", "reason"),
  reference: str(r, "referenceDocument"), imposedAt: str(r, "imposedAt"), releasedAt: str(r, "releasedAt"),
});

export type StatusChange = { id: number; from: string; to: string; effectiveFrom: string; reason: string };
export const mapStatusChange = (r: Rec): StatusChange => ({
  id: num(r, "historyId", "id") ?? 0, from: str(r, "previousStatus", "fromStatus"), to: str(r, "newStatus", "toStatus", "status"),
  effectiveFrom: str(r, "effectiveFrom", "changedAt", "recordedFrom"), reason: str(r, "changeReason", "reason"),
});

export type Merge = { id: number; source: number; target: number; status: string; requestedAt: string; executedAt: string; reason: string };
export const mapMerge = (r: Rec): Merge => ({
  id: num(r, "customerMergeId", "mergeId", "id") ?? 0, source: num(r, "sourceCustomerId") ?? 0, target: num(r, "targetCustomerId") ?? 0,
  status: str(r, "mergeStatus", "status"), requestedAt: str(r, "requestedAt", "createdAt"), executedAt: str(r, "executedAt", "completedAt"), reason: str(r, "mergeReason", "reason"),
});

export type TimelineEntry = { id: number; type: string; domain: string; occurredAt: string; display: string };
export const mapTimeline = (r: Rec): TimelineEntry => {
  let display = str(r, "title", "description", "summary");
  const raw = str(r, "displayData");
  if (!display && raw) { try { const d = JSON.parse(raw) as Rec; display = str(d, "title", "description", "summary", "text") || raw; } catch { display = raw; } }
  return { id: num(r, "timelineEntryId", "entryId", "id") ?? 0, type: str(r, "eventType", "type"), domain: str(r, "sourceDomain"), occurredAt: str(r, "occurredAt", "recordedAt"), display };
};

export const customerKeys = { all: ["customers"] as const, one: (id: number | string) => ["customers", String(id)] as const };

export const customersQuery = (p: PageParams & { Search?: string; Status?: string; NationalId?: string; PrincipalName?: string; CustomerNumber?: string }) =>
  pagedQuery(customerKeys.all, "property", "/api/v1/customers", p, mapCustomer);
export const customerQuery = (id: number | string) => itemQuery(customerKeys.one(id), "property", `/api/v1/customers/${id}`, mapCustomer);
export const customerAssociationsQuery = (id: number | string, includeHistory = true) => listQuery([...customerKeys.one(id), "associations"], "property", `/api/v1/customers/${id}/associations`, { includeHistory }, mapAssociation);
export const customerRestrictionsQuery = (id: number | string) => listQuery([...customerKeys.one(id), "restrictions"], "property", `/api/v1/customers/${id}/restrictions`, { activeOnly: false }, mapRestriction);
export const customerStatusHistoryQuery = (id: number | string) => listQuery([...customerKeys.one(id), "status-history"], "property", `/api/v1/customers/${id}/status-history`, undefined, mapStatusChange);
export const customerMergesQuery = (id: number | string) => listQuery([...customerKeys.one(id), "merges"], "property", `/api/v1/customers/${id}/merges`, undefined, mapMerge);
export const customerTimelineQuery = (id: number | string, p: PageParams & { from?: string; to?: string; type?: string }) =>
  pagedQuery([...customerKeys.one(id), "timeline"], "property", `/api/v1/customers/${id}/timeline`, p, mapTimeline);

export const customerApi = {
  create: (b: S["CreateCustomerCommand"]) => api.property.post<Rec>("/api/v1/customers", b),
  updateNumber: (id: number, b: S["UpdateCustomerNumberRequest"]) => api.property.patch(`/api/v1/customers/${id}`, b),
  merge: (sourceId: number, b: S["MergeCustomerRequest"]) => api.property.post(`/api/v1/customers/${sourceId}/merge`, b),
  addAssociation: (id: number, b: S["AddCustomerAssociationRequest"]) => api.property.post(`/api/v1/customers/${id}/associations`, b),
  changePrincipal: (id: number, b: S["ChangePrincipalRequest"]) => api.property.put(`/api/v1/customers/${id}/principal`, b),
  endAssociation: (id: number, associationId: number, b: S["EndAssociationRequest"]) => api.property.post(`/api/v1/customers/${id}/associations/${associationId}/end`, b),
  applyRestriction: (id: number, b: S["ApplyRestrictionRequest"]) => api.property.post(`/api/v1/customers/${id}/restrictions`, b),
  liftRestriction: (restrictionId: number, b: S["LiftRestrictionRequest"]) => api.property.post(`/api/v1/restrictions/${restrictionId}/lift`, b),
  checkRestriction: (b: S["CheckRestrictionRequest"]) => api.property.post<Rec>("/api/v1/restrictions/check", b),
  rebuildTimeline: (id: number) => api.property.post(`/api/v1/customers/${id}/timeline/rebuild`),
};
