import { api } from "@/lib/api/client";
import { num, str, toList, type Rec } from "@/lib/api/list";
import { itemQuery, listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { LooseSchemas } from "@/lib/api/loose";
import type { components } from "@/lib/api/generated/property";
type S = LooseSchemas<components["schemas"]>;

export type Classification = { id: number; parentId?: number; code: string; name: string; status: string; description: string; rowVersion?: string; children: Classification[] };
export const mapClassification = (r: Rec): Classification => ({
  id: num(r, "usageClassificationId", "id") ?? 0, parentId: num(r, "parentUsageClassificationId", "parentId"), code: str(r, "classificationCode", "code"),
  name: str(r, "classificationName", "name"), status: str(r, "classificationStatus", "status"), description: str(r, "description"),
  rowVersion: str(r, "rowVersion") || undefined, children: toList<Rec>(r.children ?? r.Children).map(mapClassification),
});

export type Segment = { id: number; premisesId: number; code: string; name: string; status: string; description: string; legalUsage: string; declaredUsage: string };
export const mapSegment = (r: Rec): Segment => ({
  id: num(r, "usageSegmentId", "segmentId", "id") ?? 0, premisesId: num(r, "premisesId") ?? 0, code: str(r, "segmentCode", "code"), name: str(r, "segmentName", "name"),
  status: str(r, "segmentStatus", "status"), description: str(r, "description"),
  legalUsage: str(r, "legalUsageName", "legalUsage", "legalClassificationName"), declaredUsage: str(r, "declaredUsageName", "declaredUsage"),
});

export type Assignment = { id: number; classificationId: number; classificationName: string; type: string; validFrom: string; validTo: string; recordedFrom: string; recordedTo: string; reason: string; description: string; supersedes?: number; correctionId?: number };
export const mapAssignment = (r: Rec): Assignment => ({
  id: num(r, "usageAssignmentId", "assignmentId", "id") ?? 0, classificationId: num(r, "usageClassificationId") ?? 0,
  classificationName: str(r, "classificationName", "usageClassificationName", "usageName") || str(r, "classificationCode"),
  type: str(r, "assignmentType"), validFrom: str(r, "validFrom"), validTo: str(r, "validTo"), recordedFrom: str(r, "recordedFrom"), recordedTo: str(r, "recordedTo"),
  reason: str(r, "assignmentReason"), description: str(r, "description"), supersedes: num(r, "supersedesAssignmentId"), correctionId: num(r, "correctionId"),
});

export type Assertion = { id: number; classificationId: number; classificationName: string; type: string; date: string; status: string; source: string; description: string; decisionReason: string; rowVersion?: string };
export const mapAssertion = (r: Rec): Assertion => ({
  id: num(r, "usageAssertionId", "id") ?? 0, classificationId: num(r, "usageClassificationId") ?? 0, classificationName: str(r, "classificationName", "usageClassificationName"),
  type: str(r, "assertionType"), date: str(r, "assertionDate"), status: str(r, "assertionStatus", "status"), source: str(r, "sourceReference"),
  description: str(r, "assertionDescription", "description"), decisionReason: str(r, "decisionReason"), rowVersion: str(r, "rowVersion") || undefined,
});

export type UsageCase = { id: number; number: string; segmentId?: number; type: string; status: string; requestedAt: string; targetClassificationId?: number; effectiveFrom: string; description: string; decisionReason: string; failureReason: string };
export const mapUsageCase = (r: Rec): UsageCase => ({
  id: num(r, "usageChangeCaseId", "id") ?? 0, number: str(r, "caseNumber"), segmentId: num(r, "usageSegmentId"), type: str(r, "caseType"), status: str(r, "caseStatus", "status"),
  requestedAt: str(r, "requestedAt", "createdAt"), targetClassificationId: num(r, "targetUsageClassificationId"), effectiveFrom: str(r, "proposedEffectiveFrom"),
  description: str(r, "description"), decisionReason: str(r, "decisionReason"), failureReason: str(r, "failureReason"),
});

export type Mismatch = { key: string; premisesId: number; segmentId: number; segmentCode: string; legal: string; declared: string; observed: string; detectedAt: string };
export const mapMismatch = (r: Rec): Mismatch => ({
  key: `${num(r, "usageSegmentId", "segmentId") ?? 0}-${str(r, "detectedAt", "asOf")}-${num(r, "id") ?? ""}`,
  premisesId: num(r, "premisesId") ?? 0, segmentId: num(r, "usageSegmentId", "segmentId") ?? 0, segmentCode: str(r, "segmentCode"),
  legal: str(r, "legalUsageName", "legalUsage", "legalClassificationName"), declared: str(r, "declaredUsageName", "declaredUsage", "assertedUsage"),
  observed: str(r, "observedActivity", "activityName"), detectedAt: str(r, "detectedAt", "asOf"),
});

export type ActivityType = { id: number; code: string; name: string; status: string; description: string; rowVersion?: string };
export const mapActivityType = (r: Rec): ActivityType => ({
  id: num(r, "activityTypeId", "id") ?? 0, code: str(r, "activityCode", "code"), name: str(r, "activityName", "name"), status: str(r, "activityStatus", "status"),
  description: str(r, "description"), rowVersion: str(r, "rowVersion") || undefined,
});

export type Activity = { id: number; typeId: number; typeName: string; start: string; end: string; description: string; source: string };
export const mapActivity = (r: Rec): Activity => ({
  id: num(r, "usageActivityId", "activityId", "id") ?? 0, typeId: num(r, "activityTypeId") ?? 0, typeName: str(r, "activityName", "activityTypeName"),
  start: str(r, "activityStartAt"), end: str(r, "activityEndAt"), description: str(r, "activityDescription", "description"), source: str(r, "sourceReference"),
});

export const usageKeys = {
  catalog: ["usage", "catalog"] as const, activityTypes: ["usage", "activity-types"] as const, mismatches: ["usage", "mismatches"] as const,
  premises: (id: number | string) => ["usage", "premises", String(id)] as const, segment: (id: number | string) => ["usage", "segment", String(id)] as const,
  usageCase: (id: number | string) => ["usage", "case", String(id)] as const,
};

export const classificationsQuery = (p: PageParams & { search?: string; includeInactive?: boolean }) => pagedQuery(usageKeys.catalog, "property", "/api/v1/usage-classifications", p, mapClassification);
export const classificationTreeQuery = (includeInactive = true) => listQuery([...usageKeys.catalog, "tree"], "property", "/api/v1/usage-classifications/tree", { includeInactive }, mapClassification);
export const activityTypesQuery = (includeInactive = true) => listQuery(usageKeys.activityTypes, "property", "/api/v1/activity-types", { includeInactive }, mapActivityType);
export const mismatchesQuery = (p: PageParams) => pagedQuery(usageKeys.mismatches, "property", "/api/v1/usage-mismatches", p, mapMismatch);
export const premisesMismatchesQuery = (premisesId: number | string, p: PageParams) => pagedQuery([...usageKeys.premises(premisesId), "mismatches"], "property", `/api/v1/premises/${premisesId}/usage-mismatches`, p, mapMismatch);
export const segmentsQuery = (premisesId: number | string) => listQuery([...usageKeys.premises(premisesId), "segments"], "property", `/api/v1/premises/${premisesId}/usage-segments`, undefined, mapSegment);
export const premisesUsageHistoryQuery = (premisesId: number | string) => listQuery([...usageKeys.premises(premisesId), "history"], "property", `/api/v1/premises/${premisesId}/usage-history`, undefined, mapAssignment);
export const premisesLegalUsageQuery = (premisesId: number | string) => listQuery([...usageKeys.premises(premisesId), "legal"], "property", `/api/v1/premises/${premisesId}/legal-usage`, undefined, mapAssignment);
export const segmentAssignmentsQuery = (segmentId: number | string) => listQuery([...usageKeys.segment(segmentId), "assignments"], "property", `/api/v1/usage-segments/${segmentId}/assignments/history`, undefined, mapAssignment);
export const segmentLegalUsageQuery = (segmentId: number | string) => itemQuery([...usageKeys.segment(segmentId), "legal"], "property", `/api/v1/usage-segments/${segmentId}/legal-usage`, mapAssignment);
export const segmentAssertionsQuery = (segmentId: number | string) => pagedQuery([...usageKeys.segment(segmentId), "assertions"], "property", `/api/v1/usage-segments/${segmentId}/assertions`, { includeSuperseded: true, pageSize: 50 }, mapAssertion);
export const segmentActivitiesQuery = (segmentId: number | string) => listQuery([...usageKeys.segment(segmentId), "activities"], "property", `/api/v1/usage-segments/${segmentId}/activities`, { activeOnly: false }, mapActivity);
export const segmentCasesQuery = (segmentId: number | string) => listQuery([...usageKeys.segment(segmentId), "cases"], "property", `/api/v1/usage-segments/${segmentId}/usage-change-cases`, undefined, mapUsageCase);
export const usageCaseQuery = (id: number | string) => itemQuery(usageKeys.usageCase(id), "property", `/api/v1/usage-change-cases/${id}`, mapUsageCase);
export const usageCaseHistoryQuery = (id: number | string) => listQuery([...usageKeys.usageCase(id), "history"], "property", `/api/v1/usage-change-cases/${id}/history`, undefined, (r) => r);

export const usageApi = {
  createClassification: (b: S["CreateUsageClassificationRequest"]) => api.property.post("/api/v1/usage-classifications", b),
  updateClassification: (id: number, b: S["UpdateUsageClassificationRequest"]) => api.property.patch(`/api/v1/usage-classifications/${id}`, b),
  moveClassification: (id: number, b: S["ChangeUsageClassificationParentRequest"]) => api.property.post(`/api/v1/usage-classifications/${id}/change-parent`, b),
  deactivateClassification: (id: number, b: S["DeactivateUsageClassificationRequest"]) => api.property.post(`/api/v1/usage-classifications/${id}/deactivate`, b),
  createActivityType: (b: S["CreateActivityTypeRequest"]) => api.property.post("/api/v1/activity-types", b),
  updateActivityType: (id: number, b: S["UpdateActivityTypeRequest"]) => api.property.patch(`/api/v1/activity-types/${id}`, b),
  deactivateActivityType: (id: number) => api.property.post(`/api/v1/activity-types/${id}/deactivate`),
  createSegment: (premisesId: number, b: S["CreateUsageSegmentRequest"]) => api.property.post(`/api/v1/premises/${premisesId}/usage-segments`, b),
  assign: (segmentId: number, b: S["AssignUsageRequest"]) => api.property.post(`/api/v1/usage-segments/${segmentId}/assignments`, b),
  correct: (segmentId: number, b: S["CorrectUsageAssignmentRequest"]) => api.property.post(`/api/v1/usage-segments/${segmentId}/assignments/corrections`, b),
  reverse: (segmentId: number, assignmentId: number, b: S["ReverseUsageAssignmentRequest"]) => api.property.post(`/api/v1/usage-segments/${segmentId}/assignments/${assignmentId}/reverse`, b),
  addAssertion: (segmentId: number, b: S["CreateUsageAssertionRequest"]) => api.property.post(`/api/v1/usage-segments/${segmentId}/assertions`, b),
  reviewAssertion: (id: number) => api.property.post(`/api/v1/usage-assertions/${id}/review`),
  decideAssertion: (id: number, b: S["DecideUsageAssertionRequest"]) => api.property.post(`/api/v1/usage-assertions/${id}/decide`, b),
  addActivity: (segmentId: number, b: S["CreateUsageActivityRequest"]) => api.property.post(`/api/v1/usage-segments/${segmentId}/activities`, b),
  endActivity: (activityId: number, b: S["EndUsageActivityRequest"]) => api.property.post(`/api/v1/usage-activities/${activityId}/end`, b),
  createCase: (b: S["CreateUsageChangeCaseRequest"]) => api.property.post<Rec>("/api/v1/usage-change-cases", b),
  caseAction: (id: number, action: "review" | "awaiting-execution", ) => api.property.post(`/api/v1/usage-change-cases/${id}/${action}`),
  approveCase: (id: number, b: S["ApproveUsageChangeCaseRequest"]) => api.property.post(`/api/v1/usage-change-cases/${id}/approve`, b),
  rejectCase: (id: number, b: S["RejectUsageChangeCaseRequest"]) => api.property.post(`/api/v1/usage-change-cases/${id}/reject`, b),
  executeCase: (id: number, b: S["ExecuteUsageChangeCaseRequest"]) => api.property.post(`/api/v1/usage-change-cases/${id}/execute`, b),
  cancelCase: (id: number, b: S["CancelUsageChangeCaseRequest"]) => api.property.post(`/api/v1/usage-change-cases/${id}/cancel`, b),
};
