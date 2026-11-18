import { api } from "@/lib/api/client";
import { num, str, toList, type Rec } from "@/lib/api/list";
import { itemQuery, listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import { partyName } from "@/features/parties/api";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/property";
type S = LooseSchemas<components["schemas"]>;

export type Owner = { partyId: number; partyName: string; share: number; validFrom: string; validTo: string };
export const mapOwner = (r: Rec): Owner => ({
  partyId: num(r, "partyId") ?? 0, partyName: str(r, "partyName", "ownerName") || partyName(r), share: num(r, "sharePercent", "share") ?? 0,
  validFrom: str(r, "validFrom"), validTo: str(r, "validTo"),
});

export type Register = { id: number; code: string; status: string; premisesId?: number; parcelId?: number; buildingId?: number; unitId?: number; description: string; currentVersion?: number; raw: Rec };
export const mapRegister = (r: Rec): Register => ({
  id: num(r, "ownershipRegisterId", "registerId", "id") ?? 0, code: str(r, "registerCode", "code"), status: str(r, "registerStatus", "status"),
  premisesId: num(r, "premisesId"), parcelId: num(r, "parcelId"), buildingId: num(r, "buildingId"), unitId: num(r, "unitId"),
  description: str(r, "description"), currentVersion: num(r, "currentVersionNumber", "versionNumber", "latestVersionNumber"), raw: r,
});

export type Version = { id: number; number: number; validFrom: string; validTo: string; recordedFrom: string; reason: string; description: string; interests: Owner[] };
export const mapVersion = (r: Rec): Version => ({
  id: num(r, "ownershipStateVersionId", "versionId", "id") ?? 0, number: num(r, "versionNumber") ?? 0, validFrom: str(r, "validFrom"), validTo: str(r, "validTo"),
  recordedFrom: str(r, "recordedFrom", "recordedAt"), reason: str(r, "versionReason", "reason"), description: str(r, "description"),
  interests: toList<Rec>(r.interests ?? r.Interests).map(mapOwner),
});

export type Occupancy = { id: number; kind: "right" | "record"; partyId: number; partyName: string; type: string; status: string; from: string; to: string; description: string };
export const mapOccupancy = (r: Rec): Occupancy => {
  const isRight = r.occupancyRightId !== undefined || r.rightType !== undefined || str(r, "kind").toLowerCase().includes("right");
  return {
    id: num(r, "occupancyRightId", "occupancyRecordId", "id") ?? 0, kind: isRight ? "right" : "record", partyId: num(r, "partyId") ?? 0,
    partyName: str(r, "partyName") || partyName(r), type: str(r, "rightType", "type"), status: str(r, "rightStatus", "status"),
    from: str(r, "validFrom", "actualStartDate"), to: str(r, "validTo", "actualEndDate", "endedAt"), description: str(r, "description"),
  };
};

export type Conflict = { key: string; premisesId: number; premisesCode: string; type: string; description: string; parties: string; detectedAt: string; raw: Rec };
export const mapConflict = (r: Rec): Conflict => ({
  key: `${num(r, "premisesId") ?? ""}-${str(r, "conflictType", "type")}-${num(r, "id", "conflictId") ?? Math.random()}`,
  premisesId: num(r, "premisesId") ?? 0, premisesCode: str(r, "premisesCode"), type: str(r, "conflictType", "type", "reason"),
  description: str(r, "description", "message", "detail"), parties: toList<Rec>(r.parties ?? r.Parties).map(partyName).join("، ") || str(r, "partyIds"),
  detectedAt: str(r, "asOf", "detectedAt"), raw: r,
});

export const ownershipKeys = { all: ["ownership"] as const, premises: (id: number | string) => ["ownership", "premises", String(id)] as const, register: (id: number | string) => ["ownership", "register", String(id)] as const };

export const currentOwnersQuery = (premisesId: number | string) => listQuery(ownershipKeys.premises(premisesId), "property", `/api/v1/premises/${premisesId}/current-owners`, undefined, mapOwner);
export const ownersHistoryQuery = (premisesId: number | string) => listQuery([...ownershipKeys.premises(premisesId), "all"], "property", `/api/v1/premises/${premisesId}/owners`, undefined, mapOwner);
export const registersBySubjectQuery = (q: { premisesId?: number; parcelId?: number; buildingId?: number; unitId?: number }) =>
  listQuery([...ownershipKeys.all, "by-subject"], "property", "/api/v1/ownership-registers/by-subject", q, mapRegister, Boolean(q.premisesId || q.parcelId || q.buildingId || q.unitId));
export const registerQuery = (id: number | string) => itemQuery(ownershipKeys.register(id), "property", `/api/v1/ownership-registers/${id}`, mapRegister);
export const registerCurrentQuery = (id: number | string) => itemQuery([...ownershipKeys.register(id), "current"], "property", `/api/v1/ownership-registers/${id}/current`, mapVersion);
export const registerVersionsQuery = (id: number | string) => listQuery([...ownershipKeys.register(id), "versions"], "property", `/api/v1/ownership-registers/${id}/versions`, undefined, mapVersion);
export const occupancyHistoryQuery = (premisesId: number | string) => listQuery([...ownershipKeys.premises(premisesId), "occupancy"], "property", `/api/v1/premises/${premisesId}/occupancy-history`, { activeOnly: false }, mapOccupancy);
export const premisesConflictsQuery = (premisesId: number | string) => listQuery([...ownershipKeys.premises(premisesId), "conflicts"], "property", `/api/v1/premises/${premisesId}/occupancy-conflicts`, undefined, mapConflict);
export const conflictsQuery = (p: PageParams) => pagedQuery([...ownershipKeys.all, "conflicts"], "property", "/api/v1/occupancy-conflicts", p, mapConflict);

export const ownershipApi = {
  createRegister: (b: S["CreateOwnershipRegisterCommand"]) => api.property.post<Rec>("/api/v1/ownership-registers", b),
  addInterest: (id: number, b: S["AddOwnershipInterestBody"]) => api.property.post(`/api/v1/ownership-registers/${id}/interests`, b),
  updateState: (id: number, b: S["UpdateOwnershipStateBody"]) => api.property.post(`/api/v1/ownership-registers/${id}/state`, b),
  transfer: (id: number, b: S["CompleteOwnershipTransferBody"]) => api.property.post(`/api/v1/ownership-registers/${id}/transfers`, b),
  correct: (id: number, b: S["CorrectOwnershipStateBody"]) => api.property.post(`/api/v1/ownership-registers/${id}/corrections`, b),
  validate: (b: S["ValidateOwnershipStateCommand"]) => api.property.post<Rec>("/api/v1/ownership-registers/validate-state", b),
  grantRight: (b: S["GrantOccupancyRightCommand"]) => api.property.post("/api/v1/occupancy-rights", b),
  endRight: (id: number, b: S["EndOccupancyRightBody"]) => api.property.post(`/api/v1/occupancy-rights/${id}/end`, b),
  recordOccupancy: (b: S["RecordOccupancyCommand"]) => api.property.post("/api/v1/occupancy-records", b),
  endRecord: (id: number, b: S["EndOccupancyRecordBody"]) => api.property.post(`/api/v1/occupancy-records/${id}/end`, b),
};

/** Shares must be positive and sum to exactly 100٪ before an ownership state is sent. */
export function sharesError(shares: number[]): string | undefined {
  if (shares.length === 0) return "حداقل یک مالک لازم است";
  if (shares.some((s) => !(s > 0) || s > 100)) return "سهم هر مالک باید بیشتر از صفر و حداکثر ۱۰۰ درصد باشد";
  const total = Math.round(shares.reduce((a, b) => a + b, 0) * 100) / 100;
  return total === 100 ? undefined : `جمع سهم‌ها باید ۱۰۰ درصد باشد (اکنون ${total.toLocaleString("fa-IR")} درصد)`;
}
