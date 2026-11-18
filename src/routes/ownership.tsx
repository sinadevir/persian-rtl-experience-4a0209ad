import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, FilePlus2, Home, KeyRound, Loader2, PenLine, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, tableState } from "@/components/cis/data-table";
import { EntityPicker } from "@/components/cis/entity-picker";
import { FormSheet } from "@/components/cis/form-sheet";
import { JalaliDatePicker } from "@/components/cis/jalali-date-picker";
import { EmptyState, SharesBar } from "@/components/cis/blocks";
import { StatusBadge } from "@/components/cis/status-badge";
import { ErrorState, LoadingBlock } from "@/components/cis/query-state";
import { useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import {
  conflictsQuery, occupancyHistoryQuery, ownershipApi, ownershipKeys, registerCurrentQuery, registersBySubjectQuery, registerVersionsQuery,
  type Conflict, type Occupancy, type Register, type Version,
} from "@/features/ownership/api";
import { InterestsEditor, interestsError, toInterests, type InterestRow } from "@/features/ownership/interests-editor";
import { usePaged } from "@/lib/use-paged";
import { int, isoDate, rawText, reqInt } from "@/lib/form-values";
import { errorMessage } from "@/lib/api/messages";
import { faNum, toJalali } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/ownership")({
  validateSearch: (s: Record<string, unknown>): { premisesId?: string } => (s.premisesId !== undefined && /^\d+$/.test(String(s.premisesId)) ? { premisesId: String(s.premisesId) } : {}),
  head: () => seo("مالکیت و تصرف", "ثبت، انتقال و اصلاح مالکیت املاک و مدیریت حق تصرف و تعارض‌ها"),
  component: Ownership,
});

function Ownership() {
  const { premisesId } = Route.useSearch();
  const nav = useNavigate({ from: "/ownership" });
  const [label, setLabel] = useState("");
  return (
    <>
      <PageHeader title="مالکیت و تصرف" desc="ملک را انتخاب کنید تا مالکان فعلی، سابقه نسخه‌ها و تصرف آن را ببینید و تغییر دهید." />
      <Tabs defaultValue="premises">
        <TabsList className="mb-3"><TabsTrigger value="premises">پرونده مالکیت ملک</TabsTrigger><TabsTrigger value="conflicts">تعارض‌های تصرف</TabsTrigger></TabsList>
        <TabsContent value="premises" className="space-y-4">
          <Card><CardContent className="pt-6">
            <Label htmlFor="own-premises" className="mb-1.5 block">ملک</Label>
            <EntityPicker id="own-premises" kind="premises" value={premisesId} label={label || (premisesId ? `ملک #${premisesId}` : "")} onChange={(v, o) => { setLabel(o?.label ?? v); void nav({ search: { premisesId: v } }); }} />
          </CardContent></Card>
          {premisesId ? <PremisesOwnership premisesId={Number(premisesId)} /> : <EmptyState icon={Home} title="ابتدا ملک را انتخاب کنید">با نام، کد یا نشانی ملک جستجو کنید.</EmptyState>}
        </TabsContent>
        <TabsContent value="conflicts"><Conflicts /></TabsContent>
      </Tabs>
    </>
  );
}

function PremisesOwnership({ premisesId }: { premisesId: number }) {
  const regs = useQuery(registersBySubjectQuery({ premisesId }));
  const [selected, setSelected] = useState<number | null>(null);
  const canManage = useCan(P.OwnershipManage);
  if (regs.isPending) return <LoadingBlock rows={3} />;
  if (regs.error) return <ErrorState error={regs.error} onRetry={() => void regs.refetch()} />;
  const list = regs.data ?? [];
  const reg = list.find((r) => r.id === selected) ?? list[0];
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        {list.length > 1 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="پرونده‌های مالکیت">
            {list.map((r) => <Button key={r.id} size="sm" variant={r.id === reg?.id ? "default" : "outline"} onClick={() => setSelected(r.id)}>{r.code || `#${r.id}`}</Button>)}
          </div>
        )}
        {reg ? <RegisterPanel reg={reg} canManage={canManage} /> : (
          <Card><CardContent className="space-y-3 py-8 text-center">
            <p className="text-muted-foreground">برای این ملک هنوز پرونده مالکیت ثبت نشده است.</p>
            {canManage && <InterestsDialog mode="create" premisesId={premisesId} trigger={<Button><FilePlus2 />ایجاد پرونده مالکیت</Button>} />}
          </CardContent></Card>
        )}
      </div>
      <OccupancyPanel premisesId={premisesId} />
    </div>
  );
}

function RegisterPanel({ reg, canManage }: { reg: Register; canManage: boolean }) {
  const cur = useQuery(registerCurrentQuery(reg.id));
  const versions = useQuery(registerVersionsQuery(reg.id));
  const version = cur.data?.number ?? reg.currentVersion ?? 0;
  return (
    <>
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div><CardTitle className="text-base">مالکان فعلی</CardTitle><CardDescription>پرونده {reg.code || `#${reg.id}`} · نسخه {faNum(version)}</CardDescription></div>
          {canManage && cur.data && (
            <div className="flex flex-wrap gap-2">
              <InterestsDialog mode="transfer" registerId={reg.id} version={version} current={cur.data} trigger={<Button size="sm"><ArrowLeftRight />انتقال مالکیت</Button>} />
              <InterestsDialog mode="correct" registerId={reg.id} version={version} current={cur.data} versions={versions.data ?? []} trigger={<Button size="sm" variant="outline"><PenLine />اصلاح</Button>} />
              <AddInterest registerId={reg.id} version={version} />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {cur.isPending ? <LoadingBlock rows={2} /> : cur.error ? <ErrorState error={cur.error} onRetry={() => void cur.refetch()} compact /> : (
            <>
              <SharesBar parts={(cur.data?.interests ?? []).map((o) => ({ label: o.partyName || `#${o.partyId}`, value: o.share }))} />
              <ul className="divide-y text-sm">{cur.data?.interests.map((o) => (
                <li key={o.partyId} className="flex justify-between py-2"><Link to="/parties/$id" params={{ id: String(o.partyId) }} className="text-primary hover:underline">{o.partyName || `شخص #${o.partyId}`}</Link><b>{faNum(o.share)}٪</b></li>
              ))}</ul>
              <p className="text-xs text-muted-foreground">معتبر از {toJalali(cur.data?.validFrom)}</p>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">سابقه نسخه‌ها</CardTitle></CardHeader>
        <CardContent>
          <DataTable<Version> rows={versions.data ?? []} loading={versions.isPending} error={versions.error ?? undefined} onRetry={() => void versions.refetch()} hideSearch dense rowKey={(v) => v.id || v.number} exportName="ownership-versions"
            columns={[
              { key: "number", header: "نسخه", cell: (v) => faNum(v.number) }, { key: "validFrom", header: "از", cell: (v) => toJalali(v.validFrom) }, { key: "validTo", header: "تا", cell: (v) => toJalali(v.validTo) },
              { key: "interests", header: "مالکان", cell: (v) => v.interests.map((i) => `${i.partyName || `#${i.partyId}`} (${faNum(i.share)}٪)`).join("، ") || "—", value: (v) => v.interests.map((i) => `${i.partyId}:${i.share}`).join(" ") },
              { key: "reason", header: "علت" }, { key: "recordedFrom", header: "زمان ثبت", cell: (v) => toJalali(v.recordedFrom), hidden: true },
            ]} />
        </CardContent>
      </Card>
    </>
  );
}

type DialogMode = "create" | "transfer" | "correct";
const TITLES: Record<DialogMode, string> = { create: "ایجاد پرونده مالکیت", transfer: "انتقال مالکیت", correct: "اصلاح سابقه مالکیت" };

function InterestsDialog({ mode, trigger, premisesId, registerId, version = 0, current, versions = [] }: { mode: DialogMode; trigger: React.ReactElement; premisesId?: number; registerId?: number; version?: number; current?: Version; versions?: Version[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const init = (): InterestRow[] => (mode === "correct" && current ? current.interests.map((o) => ({ partyId: String(o.partyId), label: o.partyName, share: String(o.share) })) : [{ partyId: "", label: "", share: "100" }]);
  const [rows, setRows] = useState<InterestRow[]>(init);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");
  const [target, setTarget] = useState(String(version));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reset = (o: boolean) => { setOpen(o); if (o) { setRows(init()); setErr(null); setReason(""); setDate(new Date()); setTarget(String(version)); } };
  const submit = async () => {
    const e = interestsError(rows) ?? (mode !== "correct" && !date ? "تاریخ را وارد کنید" : mode !== "create" && !reason.trim() ? "علت را بنویسید" : null);
    if (e) { setErr(e); return; }
    setBusy(true); setErr(null);
    try {
      const interests = toInterests(rows);
      if (mode === "create") await ownershipApi.createRegister({ registerCode: code.trim() || undefined, premisesId, validFrom: isoDate(date), description: reason.trim() || undefined, interests });
      if (mode === "transfer") await ownershipApi.transfer(registerId!, { expectedVersionNumber: version, effectiveAt: isoDate(date), reason: reason.trim(), newInterests: interests, correlationId: crypto.randomUUID() });
      if (mode === "correct") await ownershipApi.correct(registerId!, { targetVersionNumber: Number(target), expectedLatestVersionNumber: version, reason: reason.trim(), interests });
      await qc.invalidateQueries({ queryKey: ownershipKeys.all });
      toast.success(mode === "create" ? "پرونده مالکیت ایجاد شد" : mode === "transfer" ? "انتقال مالکیت ثبت شد" : "اصلاح ثبت شد");
      setOpen(false);
    } catch (x) { setErr(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <>
      <span onClick={() => reset(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{TITLES[mode]}</DialogTitle>
            <DialogDescription>{mode === "transfer" ? "مالکان جدید را بعد از انتقال وارد کنید؛ جمع سهم‌ها باید ۱۰۰ درصد باشد." : mode === "correct" ? "اصلاح، نسخه انتخاب‌شده را با مالکان صحیح بازنویسی می‌کند و سابقه آن حفظ می‌شود." : "مالکان و سهم هر کدام را وارد کنید."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {mode === "create" && <div className="space-y-1.5"><Label htmlFor="reg-code">کد پرونده (اختیاری)</Label><Input id="reg-code" dir="rtl" value={code} onChange={(e) => setCode(e.target.value)} /></div>}
            {mode === "correct" ? (
              <div className="space-y-1.5"><Label htmlFor="target-v">نسخه‌ای که اصلاح می‌شود</Label>
                <select id="target-v" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {(versions.length ? versions : current ? [current] : []).map((v) => <option key={v.number} value={v.number}>نسخه {faNum(v.number)} — از {toJalali(v.validFrom)}</option>)}
                </select></div>
            ) : (
              <div className="space-y-1.5"><Label>{mode === "transfer" ? "تاریخ انتقال" : "تاریخ شروع"}</Label><JalaliDatePicker value={date} onChange={setDate} /></div>
            )}
            <InterestsEditor rows={rows} onChange={setRows} />
            <div className="space-y-1.5"><Label htmlFor="own-reason">{mode === "create" ? "توضیح" : "علت / مستند"}</Label><Textarea id="own-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
            {err && <Alert variant="destructive" role="alert"><AlertDescription>{err}</AlertDescription></Alert>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={async () => { const e = interestsError(rows); if (e) return setErr(e); try { await ownershipApi.validate({ interests: toInterests(rows) }); setErr(null); toast.success("ترکیب مالکان از نظر سرور معتبر است"); } catch (x) { setErr(errorMessage(x)); } }}>بررسی اعتبار</Button>
            <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="animate-spin" />}ثبت</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddInterest({ registerId, version }: { registerId: number; version: number }) {
  const qc = useQueryClient();
  return (
    <FormSheet title="افزودن سهم مالک" description="برای افزودن یک مالک به ترکیب فعلی. اگر جمع سهم‌ها از ۱۰۰ بیشتر شود، سرور درخواست را رد می‌کند." trigger={<Button size="sm" variant="outline"><UserPlus />افزودن مالک</Button>} successMessage="سهم مالک افزوده شد"
      fields={[{ name: "partyId", label: "مالک", type: "entity", entity: "party", required: true }, { name: "sharePercent", label: "سهم (٪)", type: "number", required: true, validate: (v) => { const n = Number(v); return n > 0 && n <= 100 ? undefined : "بین ۰ تا ۱۰۰"; } }, { name: "validFrom", label: "از تاریخ", type: "date", required: true }, { name: "description", label: "توضیح", type: "textarea" }]}
      initial={{ validFrom: new Date() }}
      onSubmit={async (v) => { await ownershipApi.addInterest(registerId, { expectedVersionNumber: version, partyId: reqInt(v.partyId), sharePercent: Number(v.sharePercent), validFrom: isoDate(v.validFrom), description: rawText(v.description) }); await qc.invalidateQueries({ queryKey: ownershipKeys.all }); }} />
  );
}

function OccupancyPanel({ premisesId }: { premisesId: number }) {
  const qc = useQueryClient();
  const q = useQuery(occupancyHistoryQuery(premisesId));
  const canManage = useCan(P.OccupancyManage);
  const [ending, setEnding] = useState<Occupancy | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ownershipKeys.premises(premisesId) });
  return (
    <Card className="h-fit">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div><CardTitle className="text-base">تصرف و بهره‌برداری</CardTitle><CardDescription>حق تصرف (مثلاً اجاره) و تصرف واقعی ملک</CardDescription></div>
        {canManage && (
          <div className="flex gap-2">
            <FormSheet title="ثبت حق تصرف" trigger={<Button size="sm"><KeyRound />حق تصرف</Button>} successMessage="حق تصرف ثبت شد" initial={{ validFrom: new Date() }}
              fields={[{ name: "partyId", label: "متصرف", type: "entity", entity: "party", required: true }, { name: "rightType", label: "نوع حق", type: "ref", refGroup: "OccupancyRightType", numeric: true, required: true }, { name: "validFrom", label: "از تاریخ", type: "date", required: true }, { name: "validTo", label: "تا تاریخ", type: "date" }, { name: "sourceContractId", label: "شناسه قرارداد", type: "number" }, { name: "description", label: "توضیح", type: "textarea" }]}
              onSubmit={async (v) => { await ownershipApi.grantRight({ premisesId, partyId: reqInt(v.partyId), rightType: reqInt(v.rightType), validFrom: isoDate(v.validFrom), validTo: isoDate(v.validTo), sourceContractId: int(v.sourceContractId), description: rawText(v.description) }); await refresh(); }} />
            <FormSheet title="ثبت تصرف واقعی" trigger={<Button size="sm" variant="outline">تصرف واقعی</Button>} successMessage="تصرف ثبت شد" initial={{ actualStartDate: new Date() }}
              fields={[{ name: "partyId", label: "متصرف", type: "entity", entity: "party", required: true }, { name: "actualStartDate", label: "تاریخ شروع", type: "date", required: true }, { name: "description", label: "توضیح", type: "textarea" }]}
              onSubmit={async (v) => { await ownershipApi.recordOccupancy({ premisesId, partyId: reqInt(v.partyId), actualStartDate: isoDate(v.actualStartDate), description: rawText(v.description) }); await refresh(); }} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <DataTable<Occupancy> rows={q.data ?? []} loading={q.isPending} error={q.error ?? undefined} onRetry={() => void q.refetch()} hideSearch dense rowKey={(r) => `${r.kind}-${r.id}`} exportName="occupancy" emptyText="تصرفی ثبت نشده است"
          columns={[
            { key: "kind", header: "نوع", cell: (r) => (r.kind === "right" ? "حق تصرف" : "تصرف واقعی") },
            { key: "partyName", header: "متصرف", cell: (r) => <Link to="/parties/$id" params={{ id: String(r.partyId) }} className="text-primary hover:underline">{r.partyName || `#${r.partyId}`}</Link> },
            { key: "from", header: "از", cell: (r) => toJalali(r.from) }, { key: "to", header: "تا", cell: (r) => toJalali(r.to) },
            { key: "status", header: "وضعیت", cell: (r) => (r.status ? <StatusBadge status={r.status} /> : r.to ? "پایان‌یافته" : "جاری") },
          ]}
          actions={canManage ? [{ label: "پایان دادن", destructive: true, show: (r) => !r.to, onClick: setEnding }] : undefined} />
      </CardContent>
      <FormSheet open={ending !== null} onOpenChange={(o) => !o && setEnding(null)} title={ending?.kind === "right" ? "پایان حق تصرف" : "پایان تصرف واقعی"} successMessage="پایان تصرف ثبت شد" initial={{ at: new Date() }}
        fields={[{ name: "at", label: "تاریخ پایان", type: "date", required: true }, ...(ending?.kind === "right" ? [{ name: "endStatus", label: "نوع پایان", type: "ref" as const, refGroup: "OccupancyRightEndStatus", numeric: true, required: true }] : []), { name: "reason", label: "علت", type: "textarea", required: true }]}
        onSubmit={async (v) => {
          if (ending!.kind === "right") await ownershipApi.endRight(ending!.id, { endedAt: isoDate(v.at), endStatus: reqInt(v.endStatus), reason: rawText(v.reason) });
          else await ownershipApi.endRecord(ending!.id, { actualEndDate: isoDate(v.at), reason: rawText(v.reason) });
          await refresh();
        }} />
    </Card>
  );
}

function Conflicts() {
  const pg = usePaged();
  const q = useQuery(conflictsQuery({ page: pg.page, pageSize: pg.pageSize }));
  const nav = useNavigate();
  return (
    <DataTable<Conflict> {...tableState(q)} server={pg.server(q.data?.total ?? 0)} hideSearch rowKey={(r) => r.key} exportName="occupancy-conflicts" emptyText="تعارضی در تصرف املاک وجود ندارد"
      onRowClick={(r) => nav({ to: "/ownership", search: { premisesId: String(r.premisesId) } })}
      columns={[
        { key: "premisesCode", header: "ملک", cell: (r) => <span className="font-mono">{r.premisesCode || `#${r.premisesId}`}</span> },
        { key: "type", header: "نوع تعارض" }, { key: "parties", header: "اشخاص درگیر" }, { key: "description", header: "شرح", className: "max-w-72 truncate" },
        { key: "detectedAt", header: "تاریخ", cell: (r) => toJalali(r.detectedAt) },
      ]} />
  );
}
