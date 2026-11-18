import { api } from "@/lib/api/client";
import { bool, num, pick, str, type Rec } from "@/lib/api/list";
import { itemQuery, listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/property";
type S = LooseSchemas<components["schemas"]>;

export type Party = {
  id: number; code: string; type: string; isOrganization: boolean; name: string; givenName: string; middleName: string; familyName: string;
  organizationName: string; nationalId: string; mobile: string; status: string; mergedInto?: number; birthDate: string; createdAt: string; rowVersion?: string; raw: Rec;
};

export const partyName = (r: unknown) =>
  str(r, "displayName", "fullName", "partyName", "name", "organizationName") ||
  [str(r, "givenName", "firstName"), str(r, "familyName", "lastName")].filter(Boolean).join(" ") ||
  str(r, "partyCode") || "—";

export const mapParty = (r: Rec): Party => {
  const type = str(r, "partyType", "type");
  return {
    id: num(r, "partyId", "id") ?? 0, code: str(r, "partyCode", "code"), type,
    isOrganization: /org/i.test(type) || Boolean(pick(r, "organizationName")),
    name: partyName(r), givenName: str(r, "givenName"), middleName: str(r, "middleName"), familyName: str(r, "familyName"),
    organizationName: str(r, "organizationName"),
    nationalId: str(r, "nationalId", "nationalLegalId", "nationalCode"), mobile: str(r, "mobilePhone", "mobile", "phone", "primaryPhone"),
    status: str(r, "partyStatus", "status"), mergedInto: num(r, "mergedIntoPartyId"), birthDate: str(r, "birthDate"),
    createdAt: str(r, "createdAt"), rowVersion: str(r, "rowVersion") || undefined, raw: r,
  };
};

export type Contact = { id: number; type: string; value: string; isPrimary: boolean; validFrom: string; validTo: string };
export const mapContact = (r: Rec): Contact => ({
  id: num(r, "partyContactId", "contactId", "id") ?? 0, type: str(r, "contactType"), value: str(r, "contactValue", "value"),
  isPrimary: bool(r, "isPrimary"), validFrom: str(r, "validFrom"), validTo: str(r, "validTo"),
});

export type IdentityChange = { id: number; at: string; by: string; reason: string; before: string; after: string };
export const mapIdentityChange = (r: Rec): IdentityChange => ({
  id: num(r, "partyIdentityHistoryId", "id") ?? 0, at: str(r, "changedAt", "recordedAt", "createdAt"), by: str(r, "changedBy", "createdBy"),
  reason: str(r, "reason"),
  before: [str(r, "previousGivenName"), str(r, "previousFamilyName"), str(r, "previousOrganizationName")].filter(Boolean).join(" "),
  after: [str(r, "newGivenName"), str(r, "newFamilyName"), str(r, "newOrganizationName")].filter(Boolean).join(" "),
});

export const partyKeys = { all: ["parties"] as const, one: (id: number | string) => ["parties", String(id)] as const };

export const partiesQuery = (p: PageParams & { search?: string; nationalId?: string; name?: string; phone?: string }) =>
  pagedQuery(partyKeys.all, "property", "/api/v1/parties", p, mapParty);
export const duplicatePartiesQuery = (p: PageParams & { mode: string }) =>
  pagedQuery([...partyKeys.all, "duplicates"], "property", "/api/v1/parties/duplicate-candidates", p, (r) => r);
export const partyQuery = (id: number | string) => itemQuery(partyKeys.one(id), "property", `/api/v1/parties/${id}`, mapParty);
export const partyContactsQuery = (id: number | string) => listQuery([...partyKeys.one(id), "contacts"], "property", `/api/v1/parties/${id}/contacts`, undefined, mapContact);
export const partyIdentityHistoryQuery = (id: number | string) => listQuery([...partyKeys.one(id), "identity-history"], "property", `/api/v1/parties/${id}/identity-history`, undefined, mapIdentityChange);
export const verificationQuery = (id: number | string) => itemQuery(["verifications", String(id)], "property", `/api/v1/verifications/${id}`, (r) => r);

export const partyApi = {
  createIndividual: (b: S["CreateIndividualRequest"]) => api.property.post<Rec>("/api/v1/parties/individuals", b),
  createOrganization: (b: S["CreateOrganizationRequest"]) => api.property.post<Rec>("/api/v1/parties/organizations", b),
  update: (id: number, b: S["UpdateIdentityRequest"]) => api.property.put<Rec>(`/api/v1/parties/${id}`, b),
  addContact: (id: number, b: S["AddContactRequest"]) => api.property.post(`/api/v1/parties/${id}/contacts`, b),
  setPrimaryContact: (id: number, contactId: number, b: S["SetPrimaryContactRequest"]) => api.property.put(`/api/v1/parties/${id}/contacts/${contactId}/primary`, b),
  endContact: (id: number, contactId: number, b: S["EndContactRequest"]) => api.property.post(`/api/v1/parties/${id}/contacts/${contactId}/end`, b),
  addIdentifier: (id: number, b: S["AddIdentifierRequest"]) => api.property.post(`/api/v1/parties/${id}/identifiers`, b),
  requestVerification: (id: number, b: S["CreateVerificationRequest"]) => api.property.post(`/api/v1/parties/${id}/verifications`, b),
  completeVerification: (verificationId: number, b: S["CompleteVerificationRequest"]) => api.property.post(`/api/v1/verifications/${verificationId}/result`, b),
  merge: (sourceId: number, b: S["MergePartyRequest"]) => api.property.post(`/api/v1/parties/${sourceId}/merge`, b),
};

/** Id from a Created response body (`{ partyId }`, `{ id }` …). */
export const createdId = (r: unknown, ...keys: string[]) => num(r, ...keys, "id") ?? (typeof r === "number" ? r : undefined);
