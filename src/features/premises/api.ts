import { api } from "@/lib/api/client";
import { bool, num, str, type Rec } from "@/lib/api/list";
import { itemQuery, listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/property";
type S = LooseSchemas<components["schemas"]>;

export type Premises = { id: number; code: string; name: string; status: string; address: string; postalCode: string; description: string; createdAt: string; rowVersion?: string; raw: Rec };
export const mapPremises = (r: Rec): Premises => ({
  id: num(r, "premisesId", "id") ?? 0, code: str(r, "premisesCode", "code"), name: str(r, "premisesName", "name"),
  status: str(r, "premisesStatus", "status"), address: str(r, "addressText", "primaryAddress", "address"), postalCode: str(r, "postalCode"),
  description: str(r, "description"), createdAt: str(r, "createdAt"), rowVersion: str(r, "rowVersion") || undefined, raw: r,
});

export type Address = { id: number; type: string; text: string; postalCode: string; province: string; county: string; city: string; district: string; isPrimary: boolean; validFrom: string; validTo: string; lat?: number; lng?: number };
export const mapAddress = (r: Rec): Address => ({
  id: num(r, "premisesAddressId", "addressId", "id") ?? 0, type: str(r, "addressType"), text: str(r, "addressText"), postalCode: str(r, "postalCode"),
  province: str(r, "provinceCode"), county: str(r, "countyCode"), city: str(r, "cityCode"), district: str(r, "districtCode"),
  isPrimary: bool(r, "isPrimary"), validFrom: str(r, "validFrom"), validTo: str(r, "validTo"), lat: num(r, "latitude"), lng: num(r, "longitude"),
});

export type StructureKind = "parcels" | "buildings" | "units";
export type StructureItem = { id: number; code: string; name: string; status: string; area?: number; floors?: number; year?: number; floor?: number; unitNumber: string; description: string; rowVersion?: string; raw: Rec };
export const mapStructure = (prefix: "parcel" | "building" | "unit") => (r: Rec): StructureItem => ({
  id: num(r, `${prefix}Id`, "id") ?? 0, code: str(r, `${prefix}Code`, "code"), name: str(r, `${prefix}Name`, "name"), status: str(r, `${prefix}Status`, "status"),
  area: num(r, "areaSquareMeters"), floors: num(r, "floorCount"), year: num(r, "constructionYear"), floor: num(r, "floorNumber"), unitNumber: str(r, "unitNumber"),
  description: str(r, "description"), rowVersion: str(r, "rowVersion") || undefined, raw: r,
});
export const structurePrefix = { parcels: "parcel", buildings: "building", units: "unit" } as const;

export type StructureLink = { linkId: number; kind: string; targetId: number; targetCode: string; role: string; validFrom: string; validTo: string };
export const mapLink = (r: Rec): StructureLink => ({
  linkId: num(r, "linkId", "premisesParcelLinkId", "premisesBuildingLinkId", "premisesUnitLinkId", "id") ?? 0,
  kind: str(r, "kind", "linkType", "targetType"), targetId: num(r, "targetId", "parcelId", "buildingId", "unitId") ?? 0,
  targetCode: str(r, "targetCode", "parcelCode", "buildingCode", "unitCode"), role: str(r, "linkRole", "relationRole"), validFrom: str(r, "validFrom"), validTo: str(r, "validTo"),
});

export const premisesKeys = { all: ["premises"] as const, one: (id: number | string) => ["premises", String(id)] as const, structure: ["premises-structure"] as const };

export const premisesListQuery = (p: PageParams & { Search?: string; Status?: string; Address?: string; Code?: string }) => pagedQuery(premisesKeys.all, "property", "/api/v1/premises", p, mapPremises);
export const premisesQuery = (id: number | string) => itemQuery(premisesKeys.one(id), "property", `/api/v1/premises/${id}`, mapPremises);
export const premisesByCodeQuery = (code: string) => itemQuery([...premisesKeys.all, "code", code], "property", `/api/v1/premises/by-code/${encodeURIComponent(code)}`, mapPremises, undefined, Boolean(code));
export const addressesQuery = (id: number | string) => listQuery([...premisesKeys.one(id), "addresses"], "property", `/api/v1/premises/${id}/addresses`, undefined, mapAddress);
export const addressHistoryQuery = (id: number | string) => listQuery([...premisesKeys.one(id), "addresses-history"], "property", `/api/v1/premises/${id}/addresses/history`, undefined, mapAddress);
/** Structure endpoint returns parcels/buildings/units links; kept raw and flattened by the page. */
export const premisesStructureQuery = (id: number | string, activeOnly = true) => itemQuery([...premisesKeys.one(id), "structure"], "property", `/api/v1/premises/${id}/structure`, (r) => r, { activeOnly });
export const structureListQuery = (kind: StructureKind, p: PageParams & { Search?: string; Status?: string }) =>
  pagedQuery([...premisesKeys.structure, kind], "property", `/api/v1/premises/${kind}`, p, mapStructure(structurePrefix[kind]));
export const hierarchyQuery = (activeOnly = true) => itemQuery([...premisesKeys.structure, "hierarchy"], "property", "/api/v1/premises/structure/hierarchy", (r) => r, { activeOnly });

export const premisesApi = {
  create: (b: S["CreatePremisesCommand"]) => api.property.post<Rec>("/api/v1/premises", b),
  update: (id: number, b: S["UpdatePremisesRequest"]) => api.property.patch(`/api/v1/premises/${id}`, b),
  changeStatus: (id: number, b: S["ChangePremisesStatusRequest"]) => api.property.patch(`/api/v1/premises/${id}/status`, b),
  createParcel: (b: S["CreateParcelRequest"]) => api.property.post("/api/v1/premises/parcels", b),
  createBuilding: (b: S["CreateBuildingRequest"]) => api.property.post("/api/v1/premises/buildings", b),
  createUnit: (b: S["CreateUnitRequest"]) => api.property.post("/api/v1/premises/units", b),
  updateStructure: (kind: StructureKind, id: number, b: S["UpdateParcelRequest"] | S["UpdateBuildingRequest"] | S["UpdateUnitRequest"]) => api.property.patch(`/api/v1/premises/${kind}/${id}`, b),
  addLink: (premisesId: number, kind: StructureKind, b: S["AddStructureLinkRequest"]) => api.property.post(`/api/v1/premises/${premisesId}/structure/${kind}`, b),
  endLink: (premisesId: number, kind: StructureKind, linkId: number, b: S["EndStructureLinkRequest"]) => api.property.post(`/api/v1/premises/${premisesId}/structure/${kind}/${linkId}/end`, b),
  linkParcelBuilding: (parcelId: number, b: S["AddHierarchyLinkRequest"]) => api.property.post(`/api/v1/premises/structure/parcels/${parcelId}/buildings`, b),
  endParcelBuilding: (linkId: number, b: S["EndStructureLinkRequest"]) => api.property.post(`/api/v1/premises/structure/parcel-building/${linkId}/end`, b),
  linkBuildingUnit: (buildingId: number, b: S["AddHierarchyLinkRequest"]) => api.property.post(`/api/v1/premises/structure/buildings/${buildingId}/units`, b),
  endBuildingUnit: (linkId: number, b: S["EndStructureLinkRequest"]) => api.property.post(`/api/v1/premises/structure/building-unit/${linkId}/end`, b),
  addAddress: (id: number, b: S["PremisesAddressInput"]) => api.property.post(`/api/v1/premises/${id}/addresses`, b),
  replaceAddress: (id: number, addressId: number, b: S["PremisesAddressInput"]) => api.property.post(`/api/v1/premises/${id}/addresses/${addressId}/replace`, b),
  endAddress: (id: number, addressId: number, b: S["EndPremisesAddressRequest"]) => api.property.post(`/api/v1/premises/${id}/addresses/${addressId}/end`, b),
};
