import { api } from "@/lib/api/client";
import { num, str, type Rec } from "@/lib/api/list";
import { itemQuery, listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/foundation";
type S = LooseSchemas<components["schemas"]>;

export type Regulation = { id: number; code: string; title: string; type: string; authority: string; issueDate: string; effectiveDate: string; status: string; summary: string };
export const mapRegulation = (r: Rec): Regulation => ({
  id: num(r, "regulationId", "id") ?? 0, code: str(r, "regulationCode", "code"), title: str(r, "title"), type: str(r, "regulationType"), authority: str(r, "issuingAuthority"),
  issueDate: str(r, "issueDate"), effectiveDate: str(r, "effectiveDate"), status: str(r, "status", "regulationStatus") || "Draft", summary: str(r, "summary"),
});
export type Parameter = { id: number; code: string; name: string; dataType: string; category: string; description: string; currentValue: string };
export const mapParameter = (r: Rec): Parameter => ({
  id: num(r, "businessParameterId", "parameterId", "id") ?? 0, code: str(r, "parameterCode", "code"), name: str(r, "parameterName", "name"), dataType: str(r, "dataType"),
  category: str(r, "category"), description: str(r, "description"), currentValue: str(r, "currentValue", "value"),
});
export type ParameterVersion = { id: number; value: string; validFrom: string; validTo: string; status: string; reason: string; companyId?: number; regulationId?: number };
export const mapParamVersion = (r: Rec): ParameterVersion => ({
  id: num(r, "parameterVersionId", "versionId", "id") ?? 0, value: str(r, "value"), validFrom: str(r, "validFrom"), validTo: str(r, "validTo"), status: str(r, "status") || "Published",
  reason: str(r, "changeReason"), companyId: num(r, "scopeCompanyId"), regulationId: num(r, "relatedRegulationId"),
});
export const regKeys = { all: ["regulations"] as const, param: (code: string) => ["regulations", "param", code] as const };
export const regulationsQuery = (p: PageParams & { status?: string; search?: string }) => pagedQuery(regKeys.all, "foundation", "/api/v1/regulations", p, mapRegulation);
export const regulationQuery = (id: number | string) => itemQuery([...regKeys.all, String(id)], "foundation", `/api/v1/regulations/${id}`, mapRegulation);
export const parameterQuery = (code: string) => itemQuery(regKeys.param(code), "foundation", `/api/v1/regulations/parameters/${encodeURIComponent(code)}`, mapParameter, undefined, Boolean(code));
export const parameterVersionsQuery = (code: string) => listQuery([...regKeys.param(code), "versions"], "foundation", `/api/v1/regulations/parameters/${encodeURIComponent(code)}/versions`, undefined, mapParamVersion, Boolean(code));
export const parameterValueQuery = (code: string, asOf?: string, companyId?: number) => itemQuery([...regKeys.param(code), "value", asOf ?? "", companyId ?? ""], "foundation", `/api/v1/regulations/parameters/${encodeURIComponent(code)}/value`, (r) => r, { asOf, companyId }, Boolean(code));
export const regApi = {
  create: (b: S["CreateRegulationRequest"]) => api.foundation.post("/api/v1/regulations", b),
  publish: (id: number) => api.foundation.post(`/api/v1/regulations/${id}/publish`),
  createParameter: (b: S["CreateBusinessParameterRequest"]) => api.foundation.post("/api/v1/regulations/parameters", b),
  publishVersion: (code: string, b: S["PublishParameterVersionRequest"]) => api.foundation.post(`/api/v1/regulations/parameters/${encodeURIComponent(code)}/versions`, b),
};
