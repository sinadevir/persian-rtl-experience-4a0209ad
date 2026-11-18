import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2, Plus, ShieldCheck, ShieldQuestion, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, tableState } from "@/components/cis/data-table";
import { EntityPicker } from "@/components/cis/entity-picker";
import { FormSheet, FieldsGrid, validate, type Field } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { EmptyState } from "@/components/cis/blocks";
import { StatusBadge } from "@/components/cis/status-badge";
import { useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import {
  authorizationTypesQuery, disputesQuery, partyAuthorizationsQuery, partyRelationshipsQuery, relApi, relationshipTypesQuery, relKeys,
  type Authorization, type AuthorizationType, type Dispute, type Relationship, type RelationshipType,
} from "@/features/relationships/api";
import { createdId } from "@/features/parties/api";
import { usePaged } from "@/lib/use-paged";
import { flag, int, isoDate, rawText, reqInt, text, type FormValues } from "@/lib/form-values";
import { errorMessage } from "@/lib/api/messages";
import { faNum, toJalali } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/relationships")({
  head: () => seo("روابط و اختیارات", "رابطه اشخاص با ملک و مشترک، اختیارات، پرونده‌ها و اختلاف‌های رابطه"),
  component: Relationships,
});

function Relationships() {
  const canCatalog = useCan(P.RelationshipCatalogManage);
  return (
    <>
      <PageHeader title="روابط و اختیارات" desc="چه کسی با کدام ملک یا مشترک چه نسبتی دارد و برای چه کاری اختیار دارد." />
      <Tabs defaultValue="party">
        <TabsList className="mb-3 h-auto flex-wrap justify-start">
          <TabsTrigger value="party">روابط یک شخص</TabsTrigger>
          <TabsTrigger value="check">استعلام اختیار</TabsTrigger>
          <TabsTrigger value="disputes">اختلاف‌ها</TabsTrigger>
          <TabsTrigger value="cases">پرونده رابطه</TabsTrigger>
          <TabsTrigger value="types">انواع رابطه</TabsTrigger>
          <TabsTrigger value="authTypes">انواع اختیار</TabsTrigger>
        </TabsList>
        <TabsContent value="party"><PartyRelations /></TabsContent>
        <TabsContent value="check"><CheckAuthorization /></TabsContent>
        <TabsContent value="disputes"><Disputes /></TabsContent>
        <TabsContent value="cases"><RelationshipCases /></TabsContent>
        <TabsContent value="types"><RelTypes canManage={canCatalog} /></TabsContent>
        <TabsContent value="authTypes"><AuthTypes canManage={canCatalog} /></TabsContent>
      </Tabs>
    </>
  );
}

/* ---------- one party's relationships & authorizations ---------- */
function PartyRelations() {
  const qc = useQueryClient();
  const [party, setParty] = useState<{ id: string; label: string } | null>(null);
  const canManage = useCan(P.RelationshipManage);
  const pg = usePaged({ activeOnly: "true" });
  const rels = useQuery({ ...partyRelationshipsQuery(party?.id ?? "0", { page: pg.page, pageSize: pg.pageSize, activeOnly: pg.filters.activeOnly === "true" }), enabled: Boolean(party) });
  const auths = useQuery({ ...partyAuthorizationsQuery(party?.id ?? "0", { page: 1, pageSize: 50, activeOnly: false }), enabled: Boolean(party) });
  const [ending, setEnding] = useState<Relationship | null>(null);
  const [granting, setGranting] = useState<Relationship | null>(null);
  const [revoking, setRevoking] = useState<Authorization | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: relKeys.all });
  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-end gap-3 pt-6">
        <div className="min-w-72 flex-1 space-y-1.5"><Label htmlFor="rel-party">شخص</Label><EntityPicker id="rel-party" kind="party" value={party?.id} label={party?.label} onChange={(v, o) => setParty({ id: v, label: o?.label ?? v })} /></div>
        {party && canManage && (
          <FormSheet title="ثبت رابطه جدید" description={`برای ${party.label}`} trigger={<Button><Link2 />ثبت رابطه</Button>} successMessage="رابطه ثبت شد" initial={{ validFrom: new Date() }}
            fields={[
              { name: "relationshipTypeId", label: "نوع رابطه", type: "entity", entity: "relationshipType", required: true },
              { name: "premisesId", label: "ملک", type: "entity", entity: "premises", validate: (v, all) => (!v && !all.customerId ? "ملک یا مشترک را انتخاب کنید" : undefined) },
              { name: "customerId", label: "مشترک", type: "entity", entity: "customer" },
              { name: "validFrom", label: "از تاریخ", type: "date", required: true }, { name: "validTo", label: "تا تاریخ", type: "date" },
              { name: "reason", label: "علت / مستند", type: "textarea" },
            ]}
            onSubmit={async (v) => { await relApi.establish({ relationshipTypeId: reqInt(v.relationshipTypeId), partyId: Number(party.id), premisesId: int(v.premisesId), customerId: int(v.customerId), validFrom: isoDate(v.validFrom)!, validTo: isoDate(v.validTo), reason: rawText(v.reason) }); await refresh(); }} />
        )}
      </CardContent></Card>
      {!party ? <EmptyState icon={Users} title="شخص را انتخاب کنید">روابط او با املاک و مشترکین و اختیاراتش نمایش داده می‌شود.</EmptyState> : (
        <>
          <DataTable<Relationship> {...tableState(rels)} server={pg.server(rels.data?.total ?? 0)} hideSearch rowKey={(r) => r.id} exportName="party-relationships" emptyText="رابطه‌ای ثبت نشده است"
            filters={[{ key: "activeOnly", label: "همه روابط", options: [{ value: "true", label: "فقط روابط جاری" }] }]}
            columns={[
              { key: "typeName", header: "نوع رابطه" },
              { key: "premisesId", header: "ملک", cell: (r) => (r.premisesId ? <Link to="/premises/$id" params={{ id: String(r.premisesId) }} className="text-primary hover:underline">#{r.premisesId}</Link> : "—") },
              { key: "customerId", header: "مشترک", cell: (r) => (r.customerId ? <Link to="/customers/$id" params={{ id: String(r.customerId) }} className="text-primary hover:underline">#{r.customerId}</Link> : "—") },
              { key: "validFrom", header: "از", cell: (r) => toJalali(r.validFrom) }, { key: "validTo", header: "تا", cell: (r) => toJalali(r.validTo) },
              { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status || (r.validTo ? "Ended" : "Active")} /> },
            ]}
            actions={canManage ? [
              { label: "اعطای اختیار", icon: ShieldCheck, show: (r) => !r.validTo, onClick: setGranting },
              { label: "پایان رابطه", destructive: true, show: (r) => !r.validTo, onClick: setEnding },
            ] : undefined} />
          <Card>
            <CardHeader><CardTitle className="text-base">اختیارات</CardTitle><CardDescription>اختیاراتی که این شخص دریافت یا اعطا کرده است</CardDescription></CardHeader>
            <CardContent>
              <DataTable<Authorization> rows={auths.data?.items ?? []} loading={auths.isPending} error={auths.error ?? undefined} onRetry={() => void auths.refetch()} hideSearch dense rowKey={(a) => a.id} exportName="party-authorizations" emptyText="اختیاری ثبت نشده است"
                columns={[
                  { key: "typeName", header: "نوع اختیار" }, { key: "grantee", header: "گیرنده" }, { key: "grantor", header: "اعطاکننده" },
                  { key: "validFrom", header: "از", cell: (a) => toJalali(a.validFrom) }, { key: "validTo", header: "تا", cell: (a) => toJalali(a.validTo) },
                  { key: "reference", header: "مستند", hidden: true }, { key: "status", header: "وضعیت", cell: (a) => <StatusBadge status={a.status} /> },
                ]}
                actions={canManage ? [{ label: "لغو اختیار", destructive: true, show: (a) => !/revok|ended|expired/i.test(a.status), onClick: setRevoking }] : undefined} />
            </CardContent>
          </Card>
        </>
      )}
      <FormSheet open={ending !== null} onOpenChange={(o) => !o && setEnding(null)} title="پایان رابطه" successMessage="رابطه پایان یافت" initial={{ effectiveAt: new Date() }}
        fields={[{ name: "effectiveAt", label: "تاریخ پایان", type: "date", required: true }, { name: "reason", label: "علت", type: "textarea", required: true }]}
        onSubmit={async (v) => { await relApi.end(ending!.id, { effectiveAt: isoDate(v.effectiveAt), reason: rawText(v.reason) }); await refresh(); }} />
      <FormSheet open={granting !== null} onOpenChange={(o) => !o && setGranting(null)} title="اعطای اختیار" description="اختیار بر پایه این رابطه به شخص گیرنده داده می‌شود." successMessage="اختیار ثبت شد" initial={{ validFrom: new Date(), grantorPartyId: party?.id }}
        fields={[
          { name: "authorizationTypeId", label: "نوع اختیار", type: "entity", entity: "authorizationType", required: true },
          { name: "granteePartyId", label: "گیرنده اختیار", type: "entity", entity: "party", required: true },
          { name: "grantorPartyId", label: "اعطاکننده", type: "entity", entity: "party", entityLabel: party?.label, required: true },
          { name: "validFrom", label: "از تاریخ", type: "date", required: true }, { name: "validTo", label: "تا تاریخ", type: "date" },
          { name: "authorizationReference", label: "شماره وکالت‌نامه / مستند", ltr: true },
        ]}
        onSubmit={async (v) => { await relApi.grant({ relationshipId: granting!.id, authorizationTypeId: reqInt(v.authorizationTypeId), granteePartyId: reqInt(v.granteePartyId), grantorPartyId: int(v.grantorPartyId), validFrom: isoDate(v.validFrom), validTo: isoDate(v.validTo), authorizationReference: text(v.authorizationReference), scopes: granting!.premisesId || granting!.customerId ? [{ scopeType: granting!.customerId ? "Customer" : "Premises", premisesId: granting!.premisesId, customerId: granting!.customerId }] : undefined }); await refresh(); }} />
      <ConfirmAction open={revoking !== null} onOpenChange={(o) => !o && setRevoking(null)} title="لغو اختیار" destructive requireReason confirmLabel="لغو اختیار"
        onConfirm={async (reason) => { await relApi.revoke(revoking!.id, { revokedAt: new Date().toISOString(), reason }); toast.success("اختیار لغو شد"); await refresh(); }} />
    </div>
  );
}

/* ---------- authorization check ---------- */
const checkFields: Field[] = [
  { name: "partyId", label: "شخص", type: "entity", entity: "party", required: true },
  { name: "operationCode", label: "عملیات", required: true, ltr: true, placeholder: "مثلاً RequestDisconnect", hint: "کد عملیاتی که در نوع اختیار تعریف شده است" },
  { name: "premisesId", label: "ملک", type: "entity", entity: "premises" }, { name: "customerId", label: "مشترک", type: "entity", entity: "customer" },
  { name: "at", label: "در تاریخ", type: "date" },
];
function CheckAuthorization() {
  const [v, setV] = useState<FormValues>({ at: new Date() });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ allowed: boolean; detail: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const e = validate(checkFields, v); setErrors(e); if (Object.keys(e).length) return;
    setBusy(true); setResult(null);
    try {
      const r = await relApi.check({ partyId: reqInt(v.partyId), operationCode: text(v.operationCode), premisesId: int(v.premisesId), customerId: int(v.customerId), at: isoDate(v.at) });
      const allowed = Boolean(r?.isAuthorized ?? r?.authorized ?? r?.allowed ?? r?.IsAuthorized);
      const detail = String(r?.reason ?? r?.message ?? r?.basis ?? r?.Reason ?? "");
      setResult({ allowed, detail });
    } catch (x) { toast.error(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle className="text-base">آیا این شخص اجازه این کار را دارد؟</CardTitle><CardDescription>پیش از ثبت درخواست از طرف شخص، اختیار او را استعلام کنید.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <FieldsGrid fields={checkFields} values={v} setValues={setV} errors={errors} />
        <Button onClick={run} disabled={busy}><ShieldQuestion />استعلام</Button>
        {result && (
          <Alert variant={result.allowed ? "default" : "destructive"} role="status">
            {result.allowed ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4" />}
            <AlertDescription><b>{result.allowed ? "مجاز است" : "مجاز نیست"}</b>{result.detail && ` — ${result.detail}`}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- disputes ---------- */
function Disputes() {
  const qc = useQueryClient();
  const canManage = useCan(P.RelationshipManage);
  const pg = usePaged({ status: "" });
  const q = useQuery(disputesQuery({ page: pg.page, pageSize: pg.pageSize, status: pg.filters.status }));
  const [resolving, setResolving] = useState<Dispute | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: relKeys.disputes });
  return (
    <>
      <DataTable<Dispute> {...tableState(q)} server={pg.server(q.data?.total ?? 0)} hideSearch rowKey={(d) => d.id} exportName="relationship-disputes" emptyText="اختلافی ثبت نشده است"
        filters={[{ key: "status", label: "همه وضعیت‌ها", options: [{ value: "Open", label: "باز" }, { value: "Resolved", label: "حل‌شده" }, { value: "Closed", label: "بسته" }] }]}
        toolbar={canManage ? (
          <FormSheet title="ثبت اختلاف" trigger={<Button size="sm" className="h-9"><Plus />ثبت اختلاف</Button>} successMessage="اختلاف ثبت شد"
            fields={[
              { name: "disputeType", label: "نوع اختلاف", required: true, placeholder: "مثلاً ادعای مالکیت" },
              { name: "premisesId", label: "ملک", type: "entity", entity: "premises" }, { name: "customerId", label: "مشترک", type: "entity", entity: "customer" },
              { name: "relationshipId", label: "شناسه رابطه", type: "number" }, { name: "description", label: "شرح", type: "textarea", required: true },
            ]}
            onSubmit={async (v) => { await relApi.openDispute({ disputeType: rawText(v.disputeType), premisesId: int(v.premisesId), customerId: int(v.customerId), relationshipId: int(v.relationshipId), description: rawText(v.description) }); await refresh(); }} />
        ) : undefined}
        columns={[
          { key: "number", header: "شماره", cell: (d) => <span className="font-mono">{d.number || `#${d.id}`}</span> }, { key: "type", header: "نوع" },
          { key: "premisesId", header: "ملک", cell: (d) => (d.premisesId ? <Link to="/premises/$id" params={{ id: String(d.premisesId) }} className="text-primary hover:underline">#{d.premisesId}</Link> : "—") },
          { key: "description", header: "شرح", className: "max-w-72 truncate" }, { key: "openedAt", header: "تاریخ", cell: (d) => toJalali(d.openedAt) },
          { key: "resolution", header: "نتیجه", hidden: true }, { key: "status", header: "وضعیت", cell: (d) => <StatusBadge status={d.status} /> },
        ]}
        actions={canManage ? [{ label: "رسیدگی و حل", show: (d) => !/resolved|closed/i.test(d.status), onClick: setResolving }] : undefined} />
      <FormSheet open={resolving !== null} onOpenChange={(o) => !o && setResolving(null)} title="حل اختلاف" successMessage="نتیجه رسیدگی ثبت شد" initial={{ close: true }}
        fields={[{ name: "resolutionType", label: "نوع رسیدگی", required: true, placeholder: "مثلاً رأی مرجع قضایی" }, { name: "result", label: "نتیجه", required: true }, { name: "description", label: "توضیح", type: "textarea" }, { name: "close", label: "بستن پرونده اختلاف", type: "switch" }]}
        onSubmit={async (v) => { await relApi.resolveDispute(resolving!.id, { resolutionType: rawText(v.resolutionType), result: rawText(v.result), description: rawText(v.description), close: flag(v.close) }); await refresh(); }} />
    </>
  );
}

/* ---------- relationship cases (create + act by number; the API has no case list) ---------- */
function RelationshipCases() {
  const canManage = useCan(P.RelationshipManage);
  const [caseId, setCaseId] = useState("");
  const [act, setAct] = useState<"approve" | "reject" | "execute" | null>(null);
  const id = Number(caseId);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">درخواست ایجاد یا تغییر رابطه</CardTitle><CardDescription>وقتی ثبت مستقیم رابطه نیاز به بررسی و تأیید دارد.</CardDescription></CardHeader>
        <CardContent>
          {canManage ? (
            <FormSheet title="پرونده رابطه جدید" trigger={<Button><Plus />پرونده جدید</Button>} successMessage={null}
              fields={[
                { name: "caseType", label: "نوع پرونده", required: true, ltr: true, placeholder: "Establish / End / Change" },
                { name: "targetPartyId", label: "شخص", type: "entity", entity: "party", required: true },
                { name: "targetPremisesId", label: "ملک", type: "entity", entity: "premises" },
                { name: "targetRelationshipTypeId", label: "نوع رابطه", type: "entity", entity: "relationshipType" },
                { name: "reason", label: "علت", type: "textarea", required: true },
              ]}
              onSubmit={async (v) => {
                const r = await relApi.createCase({ caseType: text(v.caseType), targetPartyId: int(v.targetPartyId), targetPremisesId: int(v.targetPremisesId), targetRelationshipTypeId: int(v.targetRelationshipTypeId), reason: rawText(v.reason) });
                const nid = createdId(r, "relationshipCaseId");
                if (nid) setCaseId(String(nid));
                toast.success(nid ? `پرونده رابطه شماره ${faNum(nid)} ثبت شد` : "پرونده رابطه ثبت شد");
              }} />
          ) : <p className="text-sm text-muted-foreground">ثبت پرونده رابطه برای نقش شما فعال نیست.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">اقدام روی پرونده رابطه</CardTitle><CardDescription>شماره پرونده را وارد کنید.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="rc-id">شماره پرونده</Label><Input id="rc-id" dir="rtl" inputMode="numeric" value={caseId} onChange={(e) => setCaseId(e.target.value.replace(/\D/g, ""))} /></div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!id || !canManage} onClick={() => setAct("approve")}>تأیید</Button>
            <Button variant="outline" disabled={!id || !canManage} onClick={() => setAct("reject")}>رد</Button>
            <Button variant="outline" disabled={!id || !canManage} onClick={() => setAct("execute")}>اجرا</Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmAction open={act !== null} onOpenChange={(o) => !o && setAct(null)} title={act === "approve" ? "تأیید پرونده رابطه" : act === "reject" ? "رد پرونده رابطه" : "اجرای پرونده رابطه"}
        requireReason={act === "reject"} destructive={act === "reject"}
        onConfirm={async (reason) => {
          if (act === "approve") await relApi.approveCase(id); else if (act === "reject") await relApi.rejectCase(id, { reason }); else await relApi.executeCase(id);
          toast.success("پرونده رابطه به‌روزرسانی شد");
        }} />
    </div>
  );
}

/* ---------- catalogs ---------- */
const relTypeFields: Field[] = [
  { name: "relationshipCode", label: "کد", required: true, ltr: true }, { name: "relationshipName", label: "عنوان", required: true },
  { name: "cardinalityPolicy", label: "سیاست تعداد", ltr: true, hint: "مقدار مجاز طبق قواعد سرور" }, { name: "exclusivityPolicy", label: "سیاست انحصار", ltr: true },
  { name: "overlapPolicy", label: "سیاست هم‌پوشانی زمانی", ltr: true },
  { name: "allowMultipleParties", label: "چند شخص هم‌زمان مجاز است", type: "switch" }, { name: "allowMultiplePremises", label: "چند ملک هم‌زمان مجاز است", type: "switch" },
];
const relTypeBody = (v: FormValues) => ({ relationshipCode: text(v.relationshipCode), relationshipName: rawText(v.relationshipName), cardinalityPolicy: text(v.cardinalityPolicy), exclusivityPolicy: text(v.exclusivityPolicy), overlapPolicy: text(v.overlapPolicy), allowMultipleParties: flag(v.allowMultipleParties), allowMultiplePremises: flag(v.allowMultiplePremises) });

function RelTypes({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const pg = usePaged();
  const q = useQuery(relationshipTypesQuery({ page: pg.page, pageSize: pg.pageSize, search: pg.search, includeInactive: true }));
  const [edit, setEdit] = useState<RelationshipType | null>(null);
  const [off, setOff] = useState<RelationshipType | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: relKeys.types });
  return (
    <>
      <DataTable<RelationshipType> {...tableState(q)} server={pg.server(q.data?.total ?? 0)} rowKey={(r) => r.id} exportName="relationship-types" searchPlaceholder="جستجوی کد یا عنوان…"
        toolbar={canManage ? <FormSheet title="نوع رابطه جدید" trigger={<Button size="sm" className="h-9"><Plus />نوع جدید</Button>} fields={relTypeFields} successMessage="نوع رابطه ثبت شد" onSubmit={async (v) => { await relApi.createType(relTypeBody(v)); await refresh(); }} /> : undefined}
        columns={[
          { key: "code", header: "کد", cell: (r) => <span className="font-mono">{r.code}</span> }, { key: "name", header: "عنوان" },
          { key: "cardinality", header: "تعداد" }, { key: "exclusivity", header: "انحصار" }, { key: "overlap", header: "هم‌پوشانی", hidden: true },
          { key: "active", header: "وضعیت", cell: (r) => <StatusBadge status={r.active ? "Active" : "Inactive"} />, value: (r) => (r.active ? "فعال" : "غیرفعال") },
        ]}
        actions={canManage ? [{ label: "ویرایش", onClick: setEdit }, { label: "غیرفعال‌سازی", destructive: true, show: (r) => r.active, onClick: setOff }] : undefined} />
      <FormSheet open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} title="ویرایش نوع رابطه" fields={relTypeFields} successMessage="ذخیره شد"
        initial={edit ? { relationshipCode: edit.code, relationshipName: edit.name, cardinalityPolicy: edit.cardinality, exclusivityPolicy: edit.exclusivity, overlapPolicy: edit.overlap, allowMultipleParties: edit.multiParties, allowMultiplePremises: edit.multiPremises } : {}}
        onSubmit={async (v) => { await relApi.updateType(edit!.id, relTypeBody(v)); await refresh(); }} />
      <ConfirmAction open={off !== null} onOpenChange={(o) => !o && setOff(null)} title={`غیرفعال‌سازی «${off?.name ?? ""}»`} description="روابط موجود حفظ می‌شوند اما رابطه جدیدی با این نوع ثبت نمی‌شود." destructive confirmLabel="غیرفعال‌سازی"
        onConfirm={async () => { await relApi.deactivateType(off!.id); toast.success("غیرفعال شد"); await refresh(); }} />
    </>
  );
}

const authTypeFields: Field[] = [
  { name: "authorizationCode", label: "کد", required: true, ltr: true }, { name: "authorizationName", label: "عنوان", required: true },
  { name: "operationCodes", label: "کدهای عملیات مجاز", required: true, ltr: true, full: true, hint: "با ویرگول جدا کنید؛ مثلاً RequestDisconnect, ChangeContact" },
  { name: "allowedRelationshipTypeIds", label: "شناسه انواع رابطه مجاز", ltr: true, full: true, hint: "با ویرگول جدا کنید؛ خالی یعنی بدون محدودیت" },
  { name: "description", label: "توضیح", type: "textarea" },
];
const csv = (v: unknown) => (typeof v === "string" ? v.split(/[,،\s]+/).map((s) => s.trim()).filter(Boolean) : []);
const authTypeBody = (v: FormValues) => ({ authorizationCode: text(v.authorizationCode), authorizationName: rawText(v.authorizationName), description: rawText(v.description), operationCodes: csv(text(v.operationCodes)), allowedRelationshipTypeIds: csv(text(v.allowedRelationshipTypeIds)).map(Number).filter(Number.isFinite) });

function AuthTypes({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const pg = usePaged();
  const q = useQuery(authorizationTypesQuery({ page: pg.page, pageSize: pg.pageSize, search: pg.search, includeInactive: true }));
  const [edit, setEdit] = useState<AuthorizationType | null>(null);
  const [off, setOff] = useState<AuthorizationType | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: relKeys.authTypes });
  return (
    <>
      <DataTable<AuthorizationType> {...tableState(q)} server={pg.server(q.data?.total ?? 0)} rowKey={(r) => r.id} exportName="authorization-types" searchPlaceholder="جستجوی کد یا عنوان…"
        toolbar={canManage ? <FormSheet title="نوع اختیار جدید" trigger={<Button size="sm" className="h-9"><Plus />نوع جدید</Button>} fields={authTypeFields} successMessage="نوع اختیار ثبت شد" onSubmit={async (v) => { await relApi.createAuthType(authTypeBody(v)); await refresh(); }} /> : undefined}
        columns={[
          { key: "code", header: "کد", cell: (r) => <span className="font-mono">{r.code}</span> }, { key: "name", header: "عنوان" },
          { key: "operations", header: "عملیات مجاز", cell: (r) => <div className="flex flex-wrap gap-1">{r.operations.map((o) => <Badge key={o} variant="secondary" className="font-mono text-[10px]">{o}</Badge>)}</div>, value: (r) => r.operations.join(" ") },
          { key: "active", header: "وضعیت", cell: (r) => <StatusBadge status={r.active ? "Active" : "Inactive"} />, value: (r) => (r.active ? "فعال" : "غیرفعال") },
        ]}
        actions={canManage ? [{ label: "ویرایش", onClick: setEdit }, { label: "غیرفعال‌سازی", destructive: true, show: (r) => r.active, onClick: setOff }] : undefined} />
      <FormSheet open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} title="ویرایش نوع اختیار" fields={authTypeFields} successMessage="ذخیره شد"
        initial={edit ? { authorizationCode: edit.code, authorizationName: edit.name, description: edit.description, operationCodes: edit.operations.join(", "), allowedRelationshipTypeIds: edit.relationshipTypeIds.join(", ") } : {}}
        onSubmit={async (v) => { await relApi.updateAuthType(edit!.id, authTypeBody(v)); await refresh(); }} />
      <ConfirmAction open={off !== null} onOpenChange={(o) => !o && setOff(null)} title={`غیرفعال‌سازی «${off?.name ?? ""}»`} destructive confirmLabel="غیرفعال‌سازی"
        onConfirm={async () => { await relApi.deactivateAuthType(off!.id); toast.success("غیرفعال شد"); await refresh(); }} />
    </>
  );
}
