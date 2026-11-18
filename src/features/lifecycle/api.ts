import { api } from "@/lib/api/client";
import { num, str, toList, type Rec } from "@/lib/api/list";
import { itemQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/property";
type S = LooseSchemas<components["schemas"]>;

/** Customer lifecycle case (B07): status transitions of a customer that go through review and execution. */
export type LifecycleCase = {
  id: number; number: string; customerId: number; transitionType: string; status: string; fromStatus: string; toStatus: string;
  requestedAt: string; submittedAt: string; approvedAt: string; executedAt: string; effectiveAt: string; reason: string; failureReason: string; requestedBy: string; raw: Rec;
};
export const mapLifecycleCase = (r: Rec): LifecycleCase => ({
  id: num(r, "customerLifecycleCaseId", "caseId", "id") ?? 0, number: str(r, "caseNumber"), customerId: num(r, "customerId") ?? 0,
  transitionType: str(r, "transitionType", "caseType"), status: str(r, "caseStatus", "status"), fromStatus: str(r, "fromStatus", "expectedStatus"), toStatus: str(r, "toStatus"),
  requestedAt: str(r, "requestedAt", "createdAt"), submittedAt: str(r, "submittedAt"), approvedAt: str(r, "approvedAt"), executedAt: str(r, "executedAt", "completedAt"),
  effectiveAt: str(r, "effectiveAt"), reason: str(r, "caseReason", "reason"), failureReason: str(r, "failureReason"), requestedBy: str(r, "requestedBy"), raw: r,
});

export type ChangeItem = { id: number; number: number; targetDomain: string; targetType: string; targetId: number; changeType: string; status: string; proposedValue: string; failureReason: string };
export const mapChangeItem = (r: Rec): ChangeItem => ({
  id: num(r, "informationChangeItemId", "itemId", "id") ?? 0, number: num(r, "itemNumber") ?? 0, targetDomain: str(r, "targetDomain"), targetType: str(r, "targetReferenceType"),
  targetId: num(r, "targetReferenceId") ?? 0, changeType: str(r, "changeType"), status: str(r, "itemStatus", "status"), proposedValue: str(r, "proposedValue"), failureReason: str(r, "failureReason"),
});

/** Customer information change request (B07): a set of field changes reviewed item by item. */
export type ChangeRequest = { id: number; number: string; customerId: number; status: string; requestedAt: string; submittedAt: string; completedAt: string; reason: string; failureReason: string; revision: number; items: ChangeItem[]; raw: Rec };
export const mapChangeRequest = (r: Rec): ChangeRequest => ({
  id: num(r, "informationChangeRequestId", "requestId", "id") ?? 0, number: str(r, "requestNumber"), customerId: num(r, "customerId") ?? 0, status: str(r, "requestStatus", "status"),
  requestedAt: str(r, "requestedAt", "createdAt"), submittedAt: str(r, "submittedAt"), completedAt: str(r, "completedAt"), reason: str(r, "requestReason", "reason"),
  failureReason: str(r, "failureReason"), revision: num(r, "revisionNumber") ?? 0, items: toList<Rec>(r.items ?? r.Items).map(mapChangeItem), raw: r,
});

export const lifecycleKeys = { cases: ["lifecycle", "cases"] as const, changes: ["lifecycle", "changes"] as const };

type CaseFilter = PageParams & { status?: string; customerId?: number; transitionType?: string; from?: string; to?: string; requestedBy?: number };
export const lifecycleCasesQuery = (p: CaseFilter) => pagedQuery(lifecycleKeys.cases, "property", "/api/v1/customer-lifecycle-cases", p, mapLifecycleCase);
export const lifecycleCaseQuery = (id: number | string) => itemQuery([...lifecycleKeys.cases, String(id)], "property", `/api/v1/customer-lifecycle-cases/${id}`, mapLifecycleCase);
export const changeRequestsQuery = (p: CaseFilter) => pagedQuery(lifecycleKeys.changes, "property", "/api/v1/customer-information-change-requests", p, mapChangeRequest);
export const changeRequestQuery = (id: number | string) => itemQuery([...lifecycleKeys.changes, String(id)], "property", `/api/v1/customer-information-change-requests/${id}`, mapChangeRequest);

export type CaseAction = "submit" | "review" | "approve" | "reject" | "cancel" | "execute" | "retry-execution";
export type RequestAction = "submit" | "review" | "cancel";
export type ItemAction = "approve" | "reject" | "execute" | "retry";

export const lifecycleApi = {
  createCase: (b: S["CreateLifecycleCaseRequest"]) => api.property.post<Rec>("/api/v1/customer-lifecycle-cases", b),
  caseAction: (id: number, action: CaseAction, reason?: string) =>
    api.property.post(`/api/v1/customer-lifecycle-cases/${id}/${action}`, action === "reject" ? ({ reason } satisfies S["DecisionRequest"]) : {}),
  createChange: (b: S["CreateInformationChangeRequest"]) => api.property.post<Rec>("/api/v1/customer-information-change-requests", b),
  addChangeItem: (id: number, b: S["CreateInformationChangeItemRequest"]) => api.property.post(`/api/v1/customer-information-change-requests/${id}/items`, b),
  requestAction: (id: number, action: RequestAction) => api.property.post(`/api/v1/customer-information-change-requests/${id}/${action}`),
  itemAction: (itemId: number, action: ItemAction, reason?: string) =>
    api.property.post(`/api/customer-information-change-items/${itemId}/${action}`, action === "reject" ? ({ reason } satisfies S["DecisionRequest"]) : {}),
  supersedeItem: (itemId: number, b: S["SupersedeInformationChangeItemRequest"]) => api.property.post(`/api/customer-information-change-items/${itemId}/supersede`, b),
};

/**
 * Which workflow buttons to offer for a case in a given server status. The server still validates every
 * transition; this only avoids showing buttons that would certainly be refused.
 */
export function lifecycleActions(status: string): CaseAction[] {
  switch (status.replace(/[\s_-]/g, "").toLowerCase()) {
    case "draft": return ["submit", "cancel"];
    case "submitted": return ["review", "cancel"];
    case "underreview": case "inreview": return ["approve", "reject"];
    case "approved": case "awaitingexecution": return ["execute"];
    case "failed": case "executionfailed": return ["retry-execution"];
    default: return [];
  }
}
export function changeRequestActions(status: string): RequestAction[] {
  switch (status.replace(/[\s_-]/g, "").toLowerCase()) {
    case "draft": return ["submit", "cancel"];
    case "submitted": return ["review", "cancel"];
    default: return [];
  }
}
export function changeItemActions(status: string): ItemAction[] {
  switch (status.replace(/[\s_-]/g, "").toLowerCase()) {
    case "submitted": case "underreview": case "pending": return ["approve", "reject"];
    case "approved": case "awaitingexecution": return ["execute"];
    case "failed": return ["retry"];
    default: return [];
  }
}

export const actionLabels: Record<string, string> = {
  submit: "ارسال برای بررسی", review: "شروع بررسی", approve: "تأیید", reject: "رد", cancel: "لغو", execute: "اجرا",
  "retry-execution": "اجرای مجدد", retry: "اجرای مجدد", "awaiting-execution": "آماده اجرا",
};

/** Ordered happy-path steps used by the workflow stepper. */
export const WORKFLOW_STEPS = ["Draft", "Submitted", "UnderReview", "Approved", "AwaitingExecution", "Completed"] as const;

/** Transition codes documented for B07 lifecycle cases (B07 message contracts §9). */
export const TRANSITIONS = [
  { value: "Activate", label: "فعال‌سازی" }, { value: "Suspend", label: "تعلیق" }, { value: "Reactivate", label: "رفع تعلیق" },
  { value: "Close", label: "بستن اشتراک" }, { value: "Reopen", label: "بازگشایی اشتراک" },
];
export const transitionLabel = (v: string) => TRANSITIONS.find((t) => t.value.toLowerCase() === v.toLowerCase())?.label ?? v;

/**
 * B07 contract: an active NoDisconnect restriction blocks Suspend/Close; NoNewConnection blocks
 * Activate/Reactivate/Reopen. Returns the blocked transition codes for the given active restriction types.
 */
const BLOCKS: Record<string, string[]> = { nodisconnect: ["Suspend", "Close"], nonewconnection: ["Activate", "Reactivate", "Reopen"] };
export function blockedTransitions(activeRestrictionTypes: string[]): Set<string> {
  return new Set(activeRestrictionTypes.flatMap((t) => BLOCKS[t.replace(/[\s_-]/g, "").toLowerCase()] ?? []));
}
