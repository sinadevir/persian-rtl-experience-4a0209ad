import { api } from "@/lib/api/client";
import { bool, num, str, toList, type Rec } from "@/lib/api/list";
import { itemQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import { partyName } from "@/features/parties/api";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/property";
type S = LooseSchemas<components["schemas"]>;

export type RelationshipType = { id: number; code: string; name: string; cardinality: string; exclusivity: string; overlap: string; multiParties: boolean; multiPremises: boolean; active: boolean; raw: Rec };
export const mapRelType = (r: Rec): RelationshipType => ({
  id: num(r, "relationshipTypeId", "id") ?? 0, code: str(r, "relationshipCode", "code"), name: str(r, "relationshipName", "name"),
  cardinality: str(r, "cardinalityPolicy"), exclusivity: str(r, "exclusivityPolicy"), overlap: str(r, "overlapPolicy"),
  multiParties: bool(r, "allowMultipleParties"), multiPremises: bool(r, "allowMultiplePremises"), active: r.isActive === undefined && r.IsActive === undefined ? true : bool(r, "isActive"), raw: r,
});

export type AuthorizationType = { id: number; code: string; name: string; description: string; operations: string[]; relationshipTypeIds: number[]; active: boolean; raw: Rec };
export const mapAuthType = (r: Rec): AuthorizationType => ({
  id: num(r, "authorizationTypeId", "id") ?? 0, code: str(r, "authorizationCode", "code"), name: str(r, "authorizationName", "name"), description: str(r, "description"),
  operations: toList<unknown>(r.operationCodes ?? r.OperationCodes ?? r.operations).map((o) => (typeof o === "string" ? o : str(o, "operationCode"))),
  relationshipTypeIds: toList<unknown>(r.allowedRelationshipTypeIds ?? r.AllowedRelationshipTypeIds).map(Number),
  active: r.isActive === undefined && r.IsActive === undefined ? true : bool(r, "isActive"), raw: r,
});

export type Relationship = { id: number; typeId: number; typeName: string; partyId: number; partyName: string; premisesId?: number; customerId?: number; status: string; validFrom: string; validTo: string; reason: string };
export const mapRelationship = (r: Rec): Relationship => ({
  id: num(r, "relationshipId", "id") ?? 0, typeId: num(r, "relationshipTypeId") ?? 0, typeName: str(r, "relationshipName", "relationshipTypeName", "relationshipCode"),
  partyId: num(r, "partyId") ?? 0, partyName: str(r, "partyName") || partyName(r), premisesId: num(r, "premisesId"), customerId: num(r, "customerId"),
  status: str(r, "relationshipStatus", "status"), validFrom: str(r, "validFrom"), validTo: str(r, "validTo"), reason: str(r, "relationshipReason", "reason"),
});

export type Authorization = { id: number; relationshipId: number; typeName: string; grantee: string; grantor: string; status: string; validFrom: string; validTo: string; reference: string };
export const mapAuthorization = (r: Rec): Authorization => ({
  id: num(r, "authorizationId", "id") ?? 0, relationshipId: num(r, "relationshipId") ?? 0, typeName: str(r, "authorizationName", "authorizationCode", "authorizationTypeName"),
  grantee: str(r, "granteeName", "granteePartyName") || str(r, "granteePartyId"), grantor: str(r, "grantorName", "grantorPartyName") || str(r, "grantorPartyId"),
  status: str(r, "authorizationStatus", "status"), validFrom: str(r, "validFrom"), validTo: str(r, "validTo"), reference: str(r, "authorizationReference"),
});

export type Dispute = { id: number; number: string; type: string; status: string; openedAt: string; description: string; resolution: string; premisesId?: number; customerId?: number; relationshipId?: number };
export const mapDispute = (r: Rec): Dispute => ({
  id: num(r, "relationshipDisputeId", "disputeId", "id") ?? 0, number: str(r, "disputeNumber"), type: str(r, "disputeType", "type"), status: str(r, "disputeStatus", "status"),
  openedAt: str(r, "openedAt", "createdAt"), description: str(r, "disputeDescription", "description"), resolution: str(r, "resolutionSummary"),
  premisesId: num(r, "premisesId"), customerId: num(r, "customerId"), relationshipId: num(r, "relationshipId"),
});

export const relKeys = { types: ["rel", "types"] as const, authTypes: ["rel", "auth-types"] as const, disputes: ["rel", "disputes"] as const, all: ["rel"] as const };

export const relationshipTypesQuery = (p: PageParams & { search?: string; includeInactive?: boolean }) => pagedQuery(relKeys.types, "property", "/api/v1/relationship-types", p, mapRelType);
export const authorizationTypesQuery = (p: PageParams & { search?: string; includeInactive?: boolean }) => pagedQuery(relKeys.authTypes, "property", "/api/v1/authorization-types", p, mapAuthType);
export const disputesQuery = (p: PageParams & { status?: string }) => pagedQuery(relKeys.disputes, "property", "/api/v1/relationship-disputes", p, mapDispute);
export const partyRelationshipsQuery = (partyId: number | string, p: PageParams & { activeOnly?: boolean }) => pagedQuery([...relKeys.all, "party", String(partyId)], "property", `/api/v1/parties/${partyId}/relationships`, p, mapRelationship);
export const premisesRelationshipsQuery = (premisesId: number | string, p: PageParams & { activeOnly?: boolean }) => pagedQuery([...relKeys.all, "premises", String(premisesId)], "property", `/api/v1/premises/${premisesId}/relationships`, p, mapRelationship);
export const customerRelationshipsQuery = (customerId: number | string, p: PageParams & { activeOnly?: boolean }) => pagedQuery([...relKeys.all, "customer", String(customerId)], "property", `/api/v1/customers/${customerId}/relationships`, p, mapRelationship);
export const partyAuthorizationsQuery = (partyId: number | string, p: PageParams & { activeOnly?: boolean }) => pagedQuery([...relKeys.all, "party-auth", String(partyId)], "property", `/api/v1/parties/${partyId}/authorizations`, p, mapAuthorization);
export const relationshipQuery = (id: number | string) => itemQuery([...relKeys.all, "one", String(id)], "property", `/api/v1/relationships/${id}`, mapRelationship);

export const relApi = {
  createType: (b: S["CreateRelationshipTypeRequest"]) => api.property.post("/api/v1/relationship-types", b),
  updateType: (id: number, b: S["UpdateRelationshipTypeRequest"]) => api.property.patch(`/api/v1/relationship-types/${id}`, b),
  deactivateType: (id: number) => api.property.post(`/api/v1/relationship-types/${id}/deactivate`),
  createAuthType: (b: S["CreateAuthorizationTypeRequest"]) => api.property.post("/api/v1/authorization-types", b),
  updateAuthType: (id: number, b: S["UpdateAuthorizationTypeRequest"]) => api.property.patch(`/api/v1/authorization-types/${id}`, b),
  deactivateAuthType: (id: number) => api.property.post(`/api/v1/authorization-types/${id}/deactivate`),
  establish: (b: S["EstablishRelationshipRequest"]) => api.property.post("/api/v1/relationships", b),
  end: (id: number, b: S["EndRelationshipRequest"]) => api.property.post(`/api/v1/relationships/${id}/end`, b),
  grant: (b: S["GrantAuthorizationRequest"]) => api.property.post("/api/v1/authorizations", b),
  revoke: (id: number, b: S["RevokeAuthorizationRequest"]) => api.property.post(`/api/v1/authorizations/${id}/revoke`, b),
  check: (b: S["CheckAuthorizationRequest"]) => api.property.post<Rec>("/api/v1/authorizations/check", b),
  createCase: (b: S["CreateRelationshipCaseRequest"]) => api.property.post<Rec>("/api/v1/relationship-cases", b),
  approveCase: (id: number) => api.property.post(`/api/v1/relationship-cases/${id}/approve`),
  rejectCase: (id: number, b: S["DecisionReasonRequest"]) => api.property.post(`/api/v1/relationship-cases/${id}/reject`, b),
  executeCase: (id: number) => api.property.post(`/api/v1/relationship-cases/${id}/execute`),
  openDispute: (b: S["CreateRelationshipDisputeRequest"]) => api.property.post("/api/v1/relationship-disputes", b),
  resolveDispute: (id: number, b: S["ResolveRelationshipDisputeRequest"]) => api.property.post(`/api/v1/relationship-disputes/${id}/resolve`, b),
};
