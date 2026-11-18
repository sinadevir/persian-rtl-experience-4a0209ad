import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Pencil, Ban, GitMerge, UserPlus, Crown, CircleStop, Unlock, ShieldQuestion, RefreshCw, FilePlus2, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/cis/app-shell";
import { StatusBadge } from "@/components/cis/status-badge";
import { DataTable, tableState } from "@/components/cis/data-table";
import { FormSheet } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { InfoList, Timeline } from "@/components/cis/blocks";
import { ErrorState, LoadingBlock } from "@/components/cis/query-state";
import { Can, useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import {
  customerApi, customerAssociationsQuery, customerKeys, customerMergesQuery, customerQuery, customerRestrictionsQuery,
  customerStatusHistoryQuery, customerTimelineQuery, type Association, type Restriction,
} from "@/features/customers/api";
import { changeRequestsQuery, lifecycleApi, lifecycleCasesQuery, lifecycleKeys, TRANSITIONS, blockedTransitions } from "@/features/lifecycle/api";
import { customerRelationshipsQuery } from "@/features/relationships/api";
import { createdId } from "@/features/parties/api";
import { isoDate, rawText, reqInt, text } from "@/lib/form-values";
import { notifyError } from "@/lib/api/hooks";
import { bool, str } from "@/lib/api/list";
import { usePaged } from "@/lib/use-paged";
import { toJalali, faNum } from "@/lib/jalali";
import { statusLabel } from "@/lib/status";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/customers/$id")({
  head: () => seo("پرونده مشترک", "اطلاعات، اشخاص مرتبط، محدودیت‌ها، درخواست‌ها و سوابق مشترک"),
  component: Detail,
});


function Detail() {
  const { id } = Route.useParams();
  const cid = Number(id);
  const qc = useQueryClient();
  const q = useQuery(customerQuery(id));
  const assoc = useQuery(customerAssociationsQuery(id));
  const rest = useQuery(customerRestrictionsQuery(id));
  const [endRow, setEndRow] = useState<Association | null>(null);
  const [principalRow, setPrincipalRow] = useState<Association | null>(null);
  const [liftRow, setLiftRow] = useState<Restriction | null>(null);
  const canUpdate = useCan(P.CustomerUpdate);
  const canRestrict = useCan(P.CustomerRestrict);
  const inval = (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [...customerKeys.one(id), ...(k ? [k] : [])] })));

  if (q.isPending) return <LoadingBlock rows={8} />;
  if (q.error || !q.data) return <><BackLink /><ErrorState error={q.error} onRetry={() => void q.refetch()} /></>;
  const c = q.data;
  const activeRestrictions = (rest.data ?? []).filter((r) => !r.to && !/lift|release|cancel|expire/i.test(r.status));
  const principal = (assoc.data ?? []).find((a) => a.isPrincipal && !a.validTo);

  const blocked = blockedTransitions(activeRestrictions.map((r) => r.type));
  const checkRestriction = async () => {
    try {
      const r = await customerApi.checkRestriction({ customerId: cid, asOf: new Date().toISOString() });
      const restricted = bool(r, "isRestricted", "restricted", "hasRestriction", "blocked");
      const reason = str(r, "reason", "message", "restrictionType");
      if (restricted) toast.warning(`برای این مشترک محدودیت فعال وجود دارد${reason ? `: ${reason}` : ""}`);
      else toast.success("هیچ محدودیت فعالی مانع عملیات نیست");
    } catch (e) { notifyError(e); }
  };

  return (
    <>
      <BackLink />
      <PageHeader code={`اشتراک ${c.number || `#${c.id}`}`} title={principal?.partyName || c.principalName || "مشترک"} actions={<>
        <Can perm={P.LifecycleRequest}>
          <FormSheet title="درخواست تغییر وضعیت مشترک" description="درخواست پس از ارسال، در کارتابل بررسی و تأیید قرار می‌گیرد و پس از تأیید اجرا می‌شود."
            trigger={<Button><Repeat />تغییر وضعیت</Button>} submitLabel="ثبت درخواست" successMessage={null}
            fields={[{ name: "transitionType", label: "نوع تغییر", type: "select", options: TRANSITIONS.filter((t) => !blocked.has(t.value)), required: true, hint: blocked.size ? `به دلیل محدودیت فعال، ${[...blocked].map((b) => TRANSITIONS.find((t) => t.value === b)?.label ?? b).join("، ")} مجاز نیست` : undefined }, { name: "effectiveAt", label: "تاریخ اثر", type: "date" }, { name: "reason", label: "دلیل", type: "textarea", required: true }]}
            onSubmit={async (v) => {
              const r = await lifecycleApi.createCase({ customerId: cid, transitionType: text(v.transitionType), expectedStatus: c.status || undefined, expectedCustomerVersion: c.rowVersion, effectiveAt: isoDate(v.effectiveAt), reason: rawText(v.reason) });
              await qc.invalidateQueries({ queryKey: lifecycleKeys.cases });
              const newId = createdId(r, "customerLifecycleCaseId", "caseId");
              toast.success("درخواست تغییر وضعیت ثبت شد", newId ? { action: { label: "مشاهده", onClick: () => window.location.assign(`/cases/lc-${newId}`) } } : undefined);
            }} />
        </Can>
        <Can perm={P.CustomerUpdate}>
          <FormSheet title="ویرایش شماره اشتراک" trigger={<Button variant="outline"><Pencil />شماره اشتراک</Button>} initial={{ customerNumber: c.number }}
            fields={[{ name: "customerNumber", label: "شماره اشتراک", required: true, ltr: true }]} successMessage="شماره اشتراک به‌روزرسانی شد"
            onSubmit={async (v) => { await customerApi.updateNumber(cid, { customerNumber: text(v.customerNumber), expectedRowVersion: c.rowVersion }); await inval(""); }} />
        </Can>
        <Can perm={P.ChangeRequest}>
          <FormSheet title="درخواست تغییر اطلاعات" description="یک درخواست پیش‌نویس ساخته می‌شود؛ اقلام تغییر را در صفحه درخواست اضافه و سپس ارسال کنید."
            trigger={<Button variant="outline"><FilePlus2 />تغییر اطلاعات</Button>} submitLabel="ایجاد درخواست" successMessage={null}
            fields={[{ name: "reason", label: "موضوع / دلیل درخواست", type: "textarea", required: true }]}
            onSubmit={async (v) => {
              const r = await lifecycleApi.createChange({ customerId: cid, reason: rawText(v.reason), items: [] });
              await qc.invalidateQueries({ queryKey: lifecycleKeys.changes });
              const newId = createdId(r, "informationChangeRequestId", "requestId");
              toast.success("درخواست تغییر اطلاعات ایجاد شد", newId ? { action: { label: "افزودن اقلام", onClick: () => window.location.assign(`/cases/cr-${newId}`) } } : undefined);
            }} />
        </Can>
        <Can perm={P.CustomerMerge}>
          <FormSheet title="ادغام مشترک" description="این مشترک (مبدأ) در مشترک مقصد ادغام و غیرفعال می‌شود. این کار برگشت‌پذیر نیست." trigger={<Button variant="outline"><GitMerge />ادغام</Button>}
            fields={[{ name: "target", label: "مشترک مقصد", type: "entity", entity: "customer", required: true, validate: (x) => (x === id ? "مقصد نمی‌تواند همین مشترک باشد" : undefined) }, { name: "reason", label: "دلیل ادغام", type: "textarea", required: true }]}
            submitLabel="ادغام" successMessage="درخواست ادغام ثبت شد"
            onSubmit={async (v) => { await customerApi.merge(cid, { targetCustomerId: reqInt(v.target), reason: rawText(v.reason), idempotencyKey: crypto.randomUUID() }); await inval("", "merges"); }} />
        </Can>
        <Can perm={P.CustomerRestrict}>
          <FormSheet title="اعمال محدودیت" trigger={<Button variant="destructive"><Ban />محدودیت</Button>} successMessage="محدودیت اعمال شد"
            fields={[{ name: "restrictionType", label: "نوع محدودیت", type: "ref", refGroup: "CustomerRestrictionType", required: true }, { name: "validFrom", label: "از تاریخ", type: "date", required: true }, { name: "validTo", label: "تا تاریخ", type: "date", validate: (x, all) => (x instanceof Date && all.validFrom instanceof Date && x <= all.validFrom ? "تاریخ پایان باید بعد از شروع باشد" : undefined) }, { name: "referenceDocument", label: "شماره مستند / حکم" }, { name: "reason", label: "دلیل", type: "textarea", required: true }]}
            onSubmit={async (v) => { await customerApi.applyRestriction(cid, { restrictionType: text(v.restrictionType), validFrom: isoDate(v.validFrom)!, validTo: isoDate(v.validTo), referenceDocument: rawText(v.referenceDocument), reason: rawText(v.reason) }); await inval("restrictions"); }} />
        </Can>
      </>} />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0"><StatusBadge status={c.status} />{activeRestrictions.length > 0 && <StatusBadge status="محدود" />}</CardHeader>
          <CardContent>
            <InfoList items={[
              ["شماره اشتراک", <span key="n" className="font-mono">{c.number || "—"}</span>],
              ["مشترک اصلی", principal ? <Link key="p" to="/parties/$id" params={{ id: String(principal.partyId) }} className="text-primary hover:underline">{principal.partyName}</Link> : c.principalName || "—"],
              ["کد ملی", c.nationalId || "—"],
              ["تاریخ ثبت", toJalali(c.createdAt)],
              ["محدودیت فعال", faNum(activeRestrictions.length)],
              ...(c.mergedInto ? [["ادغام‌شده در", <Link key="m" to="/customers/$id" params={{ id: String(c.mergedInto) }} className="text-primary">#{c.mergedInto}</Link>] as [string, React.ReactNode]] : []),
            ]} />
          </CardContent>
        </Card>
        <Card><CardContent className="pt-6">
          <Tabs defaultValue="assoc">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="assoc">اشخاص مرتبط</TabsTrigger><TabsTrigger value="rest">محدودیت‌ها</TabsTrigger><TabsTrigger value="requests">درخواست‌ها</TabsTrigger>
              <TabsTrigger value="timeline">خط زمانی</TabsTrigger><TabsTrigger value="status">تاریخچه وضعیت</TabsTrigger><TabsTrigger value="rel">روابط با ملک</TabsTrigger><TabsTrigger value="merge">ادغام‌ها</TabsTrigger>
            </TabsList>
            <TabsContent value="assoc" className="pt-3">
              <DataTable<Association> rows={assoc.data ?? []} loading={assoc.isPending} error={assoc.error ?? undefined} onRetry={() => void assoc.refetch()} rowKey={(r) => r.id} dense exportName="customer-parties" hideSearch
                emptyText="شخص مرتبطی ثبت نشده است"
                toolbar={<Can perm={P.CustomerUpdate}><FormSheet title="افزودن شخص مرتبط" trigger={<Button size="sm" className="h-9"><UserPlus />افزودن</Button>} successMessage="شخص به مشترک افزوده شد"
                  fields={[{ name: "partyId", label: "شخص", type: "entity", entity: "party", required: true }, { name: "role", label: "نقش", type: "ref", refGroup: "CustomerAssociationRole", required: true }, { name: "validFrom", label: "از تاریخ", type: "date", required: true }, { name: "validTo", label: "تا تاریخ", type: "date" }, { name: "isPrincipal", label: "مشترک اصلی شود", type: "switch" }]}
                  onSubmit={async (v) => { await customerApi.addAssociation(cid, { partyId: reqInt(v.partyId), role: text(v.role), isPrincipal: v.isPrincipal === true, validFrom: isoDate(v.validFrom)!, validTo: isoDate(v.validTo) }); await inval("associations", ""); }} /></Can>}
                columns={[
                  { key: "partyName", header: "شخص", cell: (r) => <Link to="/parties/$id" params={{ id: String(r.partyId) }} className="text-primary hover:underline">{r.partyName}</Link> },
                  { key: "role", header: "نقش", cell: (r) => <>{statusLabel(r.role)}{r.isPrincipal && <span className="mr-2 inline-flex items-center gap-1 text-xs text-primary"><Crown className="size-3" />اصلی</span>}</> },
                  { key: "validFrom", header: "از", cell: (r) => toJalali(r.validFrom) }, { key: "validTo", header: "تا", cell: (r) => toJalali(r.validTo) },
                  { key: "state", header: "وضعیت", cell: (r) => <StatusBadge status={r.validTo && new Date(r.validTo) < new Date() ? "Ended" : "Active"} /> },
                ]}
                actions={[
                  { label: "تعیین به‌عنوان مشترک اصلی", icon: Crown, show: (r) => canUpdate && !r.isPrincipal && !r.validTo, onClick: setPrincipalRow },
                  { label: "پایان ارتباط", icon: CircleStop, destructive: true, show: (r) => canUpdate && !r.validTo, onClick: setEndRow },
                ]} />
              <FormSheet open={endRow !== null} onOpenChange={(o) => !o && setEndRow(null)} title={`پایان ارتباط ${endRow?.partyName ?? ""}`} successMessage="ارتباط پایان یافت"
                fields={[{ name: "validTo", label: "تاریخ پایان", type: "date", required: true }, { name: "reason", label: "دلیل", type: "textarea", required: true }]} initial={{ validTo: new Date() }}
                onSubmit={async (v) => { await customerApi.endAssociation(cid, endRow!.id, { validTo: isoDate(v.validTo)!, reason: rawText(v.reason) }); await inval("associations"); }} />
              <FormSheet open={principalRow !== null} onOpenChange={(o) => !o && setPrincipalRow(null)} title={`تعیین ${principalRow?.partyName ?? ""} به‌عنوان مشترک اصلی`} successMessage="مشترک اصلی تغییر کرد"
                fields={[{ name: "effectiveFrom", label: "از تاریخ", type: "date", required: true }, { name: "reason", label: "دلیل", type: "textarea", required: true }]} initial={{ effectiveFrom: new Date() }}
                onSubmit={async (v) => { await customerApi.changePrincipal(cid, { newPrincipalPartyId: principalRow!.partyId, effectiveFrom: isoDate(v.effectiveFrom)!, reason: rawText(v.reason), expectedRowVersion: c.rowVersion }); await inval("associations", ""); }} />
            </TabsContent>
            <TabsContent value="rest" className="pt-3">
              <DataTable<Restriction> rows={rest.data ?? []} loading={rest.isPending} error={rest.error ?? undefined} onRetry={() => void rest.refetch()} rowKey={(r) => r.id} dense hideSearch exportName="customer-restrictions"
                emptyText="محدودیتی برای این مشترک ثبت نشده است"
                toolbar={<Button size="sm" variant="outline" className="h-9" onClick={checkRestriction}><ShieldQuestion />بررسی مجاز بودن عملیات</Button>}
                columns={[{ key: "type", header: "نوع", cell: (r) => statusLabel(r.type) }, { key: "from", header: "از", cell: (r) => toJalali(r.from) }, { key: "to", header: "تا", cell: (r) => toJalali(r.to) }, { key: "reference", header: "مستند" }, { key: "reason", header: "دلیل" }, { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> }]}
                actions={[{ label: "رفع محدودیت", icon: Unlock, show: (r) => canRestrict && activeRestrictions.includes(r), onClick: setLiftRow }]} />
              <ConfirmAction open={liftRow !== null} onOpenChange={(o) => !o && setLiftRow(null)} title="رفع محدودیت" description={`محدودیت «${statusLabel(liftRow?.type)}» از امروز رفع می‌شود.`} requireReason confirmLabel="رفع محدودیت"
                onConfirm={async (reason) => { await customerApi.liftRestriction(liftRow!.id, { liftedAt: new Date().toISOString(), reason }); toast.success("محدودیت رفع شد"); await inval("restrictions"); }} />
            </TabsContent>
            <TabsContent value="requests" className="pt-3"><CustomerRequests customerId={cid} /></TabsContent>
            <TabsContent value="timeline" className="pt-4"><CustomerTimeline id={id} /></TabsContent>
            <TabsContent value="status" className="pt-3"><StatusHistory id={id} /></TabsContent>
            <TabsContent value="rel" className="pt-3"><CustomerRelationships id={id} /></TabsContent>
            <TabsContent value="merge" className="pt-3"><Merges id={id} /></TabsContent>
          </Tabs>
        </CardContent></Card>
      </div>
    </>
  );
}

const BackLink = () => <Button variant="ghost" size="sm" asChild className="mb-2"><Link to="/customers"><ArrowRight />بازگشت به جستجو</Link></Button>;

function CustomerRequests({ customerId }: { customerId: number }) {
  const cases = useQuery(lifecycleCasesQuery({ customerId, page: 1, pageSize: 20 }));
  const changes = useQuery(changeRequestsQuery({ customerId, page: 1, pageSize: 20 }));
  const rows = [
    ...(cases.data?.items ?? []).map((x) => ({ key: `lc-${x.id}`, title: `تغییر وضعیت: ${statusLabel(x.transitionType)}`, no: x.number || `#${x.id}`, at: x.requestedAt, status: x.status })),
    ...(changes.data?.items ?? []).map((x) => ({ key: `cr-${x.id}`, title: `تغییر اطلاعات${x.reason ? `: ${x.reason}` : ""}`, no: x.number || `#${x.id}`, at: x.requestedAt, status: x.status })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  if (cases.isPending || changes.isPending) return <LoadingBlock rows={3} />;
  if (cases.error && changes.error) return <ErrorState error={cases.error} onRetry={() => { void cases.refetch(); void changes.refetch(); }} />;
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">درخواستی برای این مشترک ثبت نشده است.</p>;
  return (
    <div className="space-y-2">{rows.map((x) => (
      <Link key={x.key} to="/cases/$id" params={{ id: x.key }} className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted">
        <div className="min-w-0"><div className="truncate font-medium">{x.title}</div><div className="text-xs text-muted-foreground">{x.no} · {toJalali(x.at)}</div></div><StatusBadge status={x.status} />
      </Link>))}
    </div>
  );
}

function CustomerTimeline({ id }: { id: string }) {
  const pg = usePaged({}, 30);
  const q = useQuery(customerTimelineQuery(id, { page: pg.page, pageSize: pg.pageSize }));
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (q.isPending) return <LoadingBlock rows={5} />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const items = q.data?.items ?? [];
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Can perm={P.TimelineRebuild}><Button size="sm" variant="ghost" disabled={busy} onClick={async () => { setBusy(true); try { await customerApi.rebuildTimeline(Number(id)); toast.success("بازسازی خط زمانی آغاز شد"); await qc.invalidateQueries({ queryKey: [...customerKeys.one(id), "timeline"] }); } catch (e) { notifyError(e); } finally { setBusy(false); } }}><RefreshCw />بازسازی خط زمانی</Button></Can></div>
      {items.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">رویدادی ثبت نشده است.</p> : <Timeline items={items.map((t) => ({ date: t.occurredAt, title: t.display || statusLabel(t.type), by: t.domain, note: t.display ? statusLabel(t.type) : undefined }))} />}
      {(q.data?.total ?? 0) > pg.pageSize && (
        <div className="flex justify-center gap-2"><Button size="sm" variant="outline" disabled={pg.page === 1} onClick={() => pg.setPage(pg.page - 1)}>جدیدتر</Button><Button size="sm" variant="outline" disabled={pg.page * pg.pageSize >= (q.data?.total ?? 0)} onClick={() => pg.setPage(pg.page + 1)}>قدیمی‌تر</Button></div>
      )}
    </div>
  );
}

function StatusHistory({ id }: { id: string }) {
  const q = useQuery(customerStatusHistoryQuery(id));
  return <DataTable rows={q.data ?? []} loading={q.isPending} error={q.error ?? undefined} onRetry={() => void q.refetch()} rowKey={(r) => r.id} dense hideSearch exportName="customer-status-history" emptyText="تغییر وضعیتی ثبت نشده است"
    columns={[{ key: "from", header: "از وضعیت", cell: (r) => (r.from ? <StatusBadge status={r.from} /> : "—") }, { key: "to", header: "به وضعیت", cell: (r) => <StatusBadge status={r.to} /> }, { key: "effectiveFrom", header: "تاریخ اثر", cell: (r) => toJalali(r.effectiveFrom) }, { key: "reason", header: "دلیل" }]} />;
}

function CustomerRelationships({ id }: { id: string }) {
  const pg = usePaged({}, 10);
  const q = useQuery(customerRelationshipsQuery(id, { activeOnly: false, page: pg.page, pageSize: pg.pageSize }));
  return <DataTable {...tableState(q)} server={pg.server(q.data?.total ?? 0)} hideSearch rowKey={(r) => r.id} dense exportName="customer-relationships" emptyText="رابطه‌ای ثبت نشده است"
    columns={[{ key: "typeName", header: "نوع رابطه" }, { key: "partyName", header: "شخص" }, { key: "premisesId", header: "ملک", cell: (r) => (r.premisesId ? <Link to="/premises/$id" params={{ id: String(r.premisesId) }} className="text-primary">#{r.premisesId}</Link> : "—") }, { key: "validFrom", header: "از", cell: (r) => toJalali(r.validFrom) }, { key: "validTo", header: "تا", cell: (r) => toJalali(r.validTo) }, { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> }]} />;
}

function Merges({ id }: { id: string }) {
  const q = useQuery(customerMergesQuery(id));
  return <DataTable rows={q.data ?? []} loading={q.isPending} error={q.error ?? undefined} onRetry={() => void q.refetch()} rowKey={(r) => r.id} dense hideSearch exportName="customer-merges" emptyText="ادغامی ثبت نشده است"
    columns={[{ key: "source", header: "مبدأ", cell: (r) => <Link to="/customers/$id" params={{ id: String(r.source) }} className="text-primary">#{r.source}</Link> }, { key: "target", header: "مقصد", cell: (r) => <Link to="/customers/$id" params={{ id: String(r.target) }} className="text-primary">#{r.target}</Link> }, { key: "requestedAt", header: "تاریخ درخواست", cell: (r) => toJalali(r.requestedAt) }, { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> }, { key: "reason", header: "دلیل" }]} />;
}
