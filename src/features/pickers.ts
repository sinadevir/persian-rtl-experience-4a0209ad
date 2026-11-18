import { api } from "@/lib/api/client";
import { num, str, toList, type Rec } from "@/lib/api/list";
import { mapParty } from "@/features/parties/api";
import { mapPremises } from "@/features/premises/api";
import { mapCustomer } from "@/features/customers/api";
import { mapClassification, mapActivityType } from "@/features/usage/api";
import { mapAuthType, mapRelType } from "@/features/relationships/api";
import { mapCompany } from "@/features/foundation/organization";
import { mapRole, mapUser, mapPermission } from "@/features/foundation/access";
import { mapDivision } from "@/features/foundation/geography";
import { statusLabel } from "@/lib/status";

export type PickOption = { value: string; label: string; hint?: string };
export type EntityKind = "party" | "premises" | "customer" | "usageClassification" | "activityType" | "relationshipType" | "authorizationType" | "company" | "role" | "user" | "permission" | "division" | "parcel" | "building" | "unit";

const page = { page: 1, pageSize: 15 };
/** Server-side search used by EntityPicker so users pick records by name/code instead of typing ids. */
export const entitySources: Record<EntityKind, { label: string; search: (q: string, signal?: AbortSignal) => Promise<PickOption[]> }> = {
  party: { label: "شخص", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/parties", { search: q, ...page }, s)).map(mapParty).map((p) => ({ value: String(p.id), label: p.name, hint: [p.nationalId, p.code].filter(Boolean).join(" · ") })) },
  premises: { label: "ملک", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/premises", { Search: q, page: 1, pageSize: 15 }, s)).map(mapPremises).map((p) => ({ value: String(p.id), label: p.code || `#${p.id}`, hint: p.name || p.address })) },
  customer: { label: "مشترک", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/customers", { Search: q, page: 1, pageSize: 15 }, s)).map(mapCustomer).map((c) => ({ value: String(c.id), label: c.number || `#${c.id}`, hint: c.principalName })) },
  usageClassification: { label: "کاربری", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/usage-classifications", { search: q, ...page }, s)).map(mapClassification).map((c) => ({ value: String(c.id), label: c.name, hint: c.code })) },
  activityType: { label: "نوع فعالیت", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/activity-types", {}, s)).map(mapActivityType).filter((a) => !q || a.name.includes(q) || a.code.includes(q)).map((a) => ({ value: String(a.id), label: a.name, hint: a.code })) },
  relationshipType: { label: "نوع رابطه", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/relationship-types", { search: q, ...page }, s)).map(mapRelType).map((t) => ({ value: String(t.id), label: t.name, hint: t.code })) },
  authorizationType: { label: "نوع اختیار", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/authorization-types", { search: q, ...page }, s)).map(mapAuthType).map((t) => ({ value: String(t.id), label: t.name, hint: t.code })) },
  company: { label: "شرکت", search: async (q, s) => toList<Rec>(await api.foundation.get("/api/v1/organization/companies", { search: q, ...page }, s)).map(mapCompany).map((c) => ({ value: String(c.id), label: c.name, hint: c.code })) },
  role: { label: "نقش", search: async (q, s) => toList<Rec>(await api.foundation.get("/api/v1/access/roles", { search: q }, s)).map(mapRole).map((r) => ({ value: String(r.id), label: r.name, hint: r.code })) },
  user: { label: "کاربر", search: async (q, s) => toList<Rec>(await api.foundation.get("/api/v1/access/users", { search: q, ...page }, s)).map(mapUser).map((u) => ({ value: String(u.id), label: u.displayName || u.userName, hint: u.userName })) },
  permission: { label: "مجوز", search: async (q, s) => toList<Rec>(await api.foundation.get("/api/v1/access/permissions", { search: q }, s)).map(mapPermission).map((p) => ({ value: String(p.id), label: p.name || p.code, hint: p.code })) },
  division: { label: "تقسیمات کشوری", search: async (q, s) => toList<Rec>(await api.foundation.get("/api/v1/geography/divisions", { search: q, ...page }, s)).map(mapDivision).map((d) => ({ value: String(d.id), label: d.name, hint: [statusLabel(d.type), d.code].join(" · ") })) },
  parcel: { label: "عرصه", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/premises/parcels", { Search: q, page: 1, pageSize: 15 }, s)).map((r) => ({ value: String(num(r, "parcelId", "id")), label: str(r, "parcelCode"), hint: str(r, "parcelName") })) },
  building: { label: "ساختمان", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/premises/buildings", { Search: q, page: 1, pageSize: 15 }, s)).map((r) => ({ value: String(num(r, "buildingId", "id")), label: str(r, "buildingCode"), hint: str(r, "buildingName") })) },
  unit: { label: "واحد", search: async (q, s) => toList<Rec>(await api.property.get("/api/v1/premises/units", { Search: q, page: 1, pageSize: 15 }, s)).map((r) => ({ value: String(num(r, "unitId", "id")), label: str(r, "unitCode"), hint: str(r, "unitName") })) },
};
