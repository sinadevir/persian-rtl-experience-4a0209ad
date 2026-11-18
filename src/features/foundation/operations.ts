import { api } from "@/lib/api/client";
import { bool, num, str, type Rec } from "@/lib/api/list";
import { itemQuery, listQuery, pagedQuery, type PageParams } from "@/lib/api/query";
import type { ApiService } from "@/lib/api/config";

/* Audit (A05), calendar, banking and integration monitoring — read-mostly foundation services. */
export type AuditEntry = { id: number; at: string; module: string; entityType: string; entityId: string; action: string; actor: string; correlationId: string; before: string; after: string; raw: Rec };
export const mapAudit = (r: Rec): AuditEntry => ({
  id: num(r, "auditEntryId", "id") ?? 0, at: str(r, "occurredAt", "timestamp", "createdAt"), module: str(r, "module", "moduleCode"), entityType: str(r, "entityType"),
  entityId: str(r, "entityId"), action: str(r, "action"), actor: str(r, "actorDisplayName", "actorUserName", "actorUserId"), correlationId: str(r, "correlationId"),
  before: str(r, "beforeJson", "oldValues", "before"), after: str(r, "afterJson", "newValues", "after"), raw: r,
});
export const auditQuery = (p: PageParams & { module?: string; entityType?: string; entityId?: string; actorUserId?: number; action?: string; from?: string; to?: string }) =>
  pagedQuery(["audit"], "foundation", "/api/v1/audit/entries", p, mapAudit);
export const auditEntryQuery = (id: number | string) => itemQuery(["audit", String(id)], "foundation", `/api/v1/audit/entries/${id}`, mapAudit, undefined, Boolean(id));

export type WorkCalendar = { code: string; name: string; description: string };
export const mapCalendar = (r: Rec): WorkCalendar => ({ code: str(r, "calendarCode", "code"), name: str(r, "calendarName", "name"), description: str(r, "description") });
export type Holiday = { date: string; title: string; type: string; recurring: boolean };
export const mapHoliday = (r: Rec): Holiday => ({ date: str(r, "date", "holidayDate"), title: str(r, "title", "holidayName", "name", "description"), type: str(r, "holidayType", "type"), recurring: bool(r, "isRecurringAnnual", "recurring") });
export const calendarsQuery = (search?: string) => listQuery(["calendar", search ?? ""], "foundation", "/api/v1/calendar", { search }, mapCalendar);
export const holidaysQuery = (code: string, from: string, to: string) => listQuery(["calendar", code, "holidays", from, to], "foundation", `/api/v1/calendar/${encodeURIComponent(code)}/holidays`, { from, to }, mapHoliday, Boolean(code));
export const isWorkingDay = (code: string, date: string) => api.foundation.get<Rec>(`/api/v1/calendar/${encodeURIComponent(code)}/is-working-day`, { date });

export type BankItem = { id: number; code: string; name: string; active: boolean; extra: string };
export const mapBank = (r: Rec): BankItem => ({
  id: num(r, "bankId", "paymentChannelId", "providerId", "id") ?? 0, code: str(r, "bankCode", "channelCode", "providerCode", "code"),
  name: str(r, "bankName", "channelName", "providerName", "name"), active: r.isActive === undefined && r.IsActive === undefined ? true : bool(r, "isActive"),
  extra: str(r, "swiftCode", "channelType", "providerType", "description"),
});
export const banksQuery = () => listQuery(["banking", "banks"], "foundation", "/api/v1/banking/banks", { activeOnly: false }, mapBank);
export const channelsQuery = () => listQuery(["banking", "channels"], "foundation", "/api/v1/banking/payment-channels", { activeOnly: false }, mapBank);
export const providersQuery = () => listQuery(["banking", "providers"], "foundation", "/api/v1/banking/bill-payment-providers", { activeOnly: false }, mapBank);

export type Message = { id: string; type: string; source: string; status: string; occurredAt: string; attempts?: number; error: string; raw: Rec };
export const mapMessage = (r: Rec): Message => ({
  id: str(r, "messageId", "id"), type: str(r, "messageType", "type"), source: str(r, "sourceDomain", "consumerName"), status: str(r, "status", "state"),
  occurredAt: str(r, "occurredAt", "createdAt", "receivedAt"), attempts: num(r, "attemptCount", "retryCount", "attempts"), error: str(r, "lastError", "error", "failureReason"), raw: r,
});
export const foundationOutboxQuery = (kind: "pending" | "dead-letter") => listQuery(["integration", "bf", kind], "foundation", `/api/v1/integration/outbox/${kind}`, undefined, mapMessage);
export const foundationInboxQuery = (take = 100) => listQuery(["integration", "bf", "inbox"], "foundation", "/api/v1/integration/inbox", { take }, mapMessage);
export const propertyOutboxQuery = () => listQuery(["integration", "pd", "outbox"], "property", "/api/operations/integration/outbox", undefined, mapMessage);
export const propertyMetricsQuery = () => itemQuery(["integration", "pd", "metrics"], "property", "/api/operations/metrics/property-domain", (r) => r);
export const retryPropertyOutbox = (messageId: string) => api.property.post(`/api/operations/integration/outbox/${encodeURIComponent(messageId)}/retry`);

/** `/health` is anonymous on both services; used by the connection settings page. */
export async function checkHealth(service: ApiService): Promise<{ ok: boolean; detail: string }> {
  try {
    const r = await (service === "property" ? api.property.get<unknown>("/health") : api.foundation.get<unknown>("/health"));
    return { ok: true, detail: typeof r === "string" ? r : str(r, "status") || "Healthy" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "خطا" };
  }
}
export type { PageParams };
