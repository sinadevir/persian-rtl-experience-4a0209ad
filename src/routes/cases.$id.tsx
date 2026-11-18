import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/cis/app-shell";
import { StatusBadge } from "@/components/cis/status-badge";
import { CaseStepper } from "@/components/cis/workflow";
import { InfoList } from "@/components/cis/blocks";
import { DataTable } from "@/components/cis/data-table";
import { FormSheet } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { ErrorState, LoadingBlock } from "@/components/cis/query-state";
import { usePermissions } from "@/lib/auth/permissions";
import { P, type PermissionCode } from "@/lib/auth/permission-codes";
import {
  actionLabels, changeItemActions, changeRequestActions, changeRequestQuery, lifecycleActions, lifecycleApi, lifecycleCaseQuery, lifecycleKeys, transitionLabel,
  type CaseAction, type ChangeItem, type ItemAction, type RequestAction,
} from "@/features/lifecycle/api";
import { rawText, reqInt, text } from "@/lib/form-values";
import { toJalali, toJalaliDateTime } from "@/lib/jalali";
import { statusLabel } from "@/lib/status";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/cases/$id")({
  head: () => seo("جزئیات درخواست", "مراحل، وضعیت و اقدامات قابل انجام روی درخواست مشترک"),
  component: CaseDetail,
});

const Back = () => <Button variant="ghost" size="sm" asChild className="mb-2"><Link to="/cases"><ArrowRight />بازگشت به کارتابل</Link></Button>;

function CaseDetail() {
  const { id } = Route.useParams();
  const [kind, raw] = id.includes("-") ? [id.split("-")[0], id.split("-").slice(1).join("-")] : ["lc", id];
  if (!/^\d+$/.test(raw ?? "")) return <><Back /><ErrorState error={new Error("شماره درخواست معتبر نیست")} /></>;
  return kind === "cr" ? <ChangeRequestView id={Number(raw)} /> : <LifecycleView id={Number(raw)} />;
}

const CASE_PERM: Record<CaseAction, PermissionCode> = {
  submit: P.LifecycleRequest, cancel: P.LifecycleRequest, review: P.LifecycleReview, approve: P.LifecycleApprove, reject: P.LifecycleApprove,
  execute: P.LifecycleExecute, "retry-execution": P.LifecycleRetry,
};

function LifecycleView({ id }: { id: number }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const q = useQuery(lifecycleCaseQuery(id));
  const [act, setAct] = useState<CaseAction | null>(null);
  if (q.isPending) return <LoadingBlock rows={6} />;
  if (q.error || !q.data) return <><Back /><ErrorState error={q.error} onRetry={() => void q.refetch()} /></>;
  const c = q.data;
  const actions = lifecycleActions(c.status).filter((a) => perms.can(CASE_PERM[a]));
  const done = async () => { await qc.invalidateQueries({ queryKey: lifecycleKeys.cases }); toast.success("وضعیت درخواست به‌روزرسانی شد"); };
  return (
    <>
      <Back />
      <PageHeader code={`درخواست ${c.number || `#${c.id}`}`} title={`تغییر وضعیت مشترک: ${transitionLabel(c.transitionType)}`}
        actions={actions.map((a) => <Button key={a} variant={a === "reject" || a === "cancel" ? "outline" : "default"} onClick={() => setAct(a)}>{actionLabels[a]}</Button>)} />
      <Card className="mb-4"><CardContent className="pt-6"><CaseStepper status={c.status} /></CardContent></Card>
      {c.failureReason && <Alert variant="destructive" className="mb-4"><AlertDescription>علت ناموفق بودن اجرا: {c.failureReason}</AlertDescription></Alert>}
      {lifecycleActions(c.status).length > 0 && actions.length === 0 && perms.status === "enforced" && <Alert className="mb-4"><AlertDescription>اقدام بعدی این درخواست با نقش شما امکان‌پذیر نیست؛ درخواست در کارتابل همکار مسئول قرار دارد.</AlertDescription></Alert>}
      <Card>
        <CardHeader><CardTitle className="text-base">مشخصات درخواست</CardTitle></CardHeader>
        <CardContent>
          <InfoList cols={2} items={[
            ["مشترک", <Link key="c" to="/customers/$id" params={{ id: String(c.customerId) }} className="text-primary hover:underline">مشاهده پرونده #{c.customerId}</Link>],
            ["وضعیت", <StatusBadge key="s" status={c.status} />],
            ["وضعیت قبلی مشترک", statusLabel(c.fromStatus)], ["وضعیت مقصد", statusLabel(c.toStatus)],
            ["تاریخ درخواست", toJalaliDateTime(c.requestedAt)], ["تاریخ ارسال", toJalaliDateTime(c.submittedAt)],
            ["تاریخ تأیید", toJalaliDateTime(c.approvedAt)], ["تاریخ اجرا", toJalaliDateTime(c.executedAt)],
            ["تاریخ اثر", toJalali(c.effectiveAt)], ["دلیل", c.reason || "—"],
          ]} />
        </CardContent>
      </Card>
      <ConfirmAction open={act !== null} onOpenChange={(o) => !o && setAct(null)} title={act ? `${actionLabels[act]} درخواست` : ""}
        description={act === "execute" ? "با اجرا، وضعیت مشترک در سامانه تغییر می‌کند." : act === "approve" ? "طبق قاعده تفکیک وظایف، تأییدکننده نباید ثبت‌کننده درخواست باشد." : undefined}
        requireReason={act === "reject"} destructive={act === "reject" || act === "cancel"} confirmLabel={act ? actionLabels[act] : "تأیید"}
        onConfirm={async (reason) => { await lifecycleApi.caseAction(id, act!, reason); await done(); }} />
    </>
  );
}

const REQ_PERM: Record<RequestAction, PermissionCode> = { submit: P.ChangeRequest, cancel: P.ChangeRequest, review: P.ChangeApprove };
const ITEM_PERM: Record<ItemAction, PermissionCode> = { approve: P.ChangeApprove, reject: P.ChangeApprove, execute: P.ChangeExecute, retry: P.ChangeRetry };
const DOMAINS = [
  { value: "B01", label: "اشخاص (B01)" }, { value: "B02", label: "مالکیت و تصرف (B02)" }, { value: "B03", label: "ملک (B03)" },
  { value: "B04", label: "کاربری (B04)" }, { value: "B05", label: "مشترک (B05)" }, { value: "B06", label: "روابط (B06)" },
];

function ChangeRequestView({ id }: { id: number }) {
  const qc = useQueryClient();
  const perms = usePermissions();
  const q = useQuery(changeRequestQuery(id));
  const [reqAct, setReqAct] = useState<RequestAction | null>(null);
  const [itemAct, setItemAct] = useState<{ item: ChangeItem; action: ItemAction } | null>(null);
  const [supersede, setSupersede] = useState<ChangeItem | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: lifecycleKeys.changes });
  if (q.isPending) return <LoadingBlock rows={6} />;
  if (q.error || !q.data) return <><Back /><ErrorState error={q.error} onRetry={() => void q.refetch()} /></>;
  const r = q.data;
  const isDraft = /draft/i.test(r.status);
  const actions = changeRequestActions(r.status).filter((a) => perms.can(REQ_PERM[a]));
  return (
    <>
      <Back />
      <PageHeader code={`درخواست ${r.number || `#${r.id}`}`} title="تغییر اطلاعات مشترک" desc={r.reason}
        actions={actions.map((a) => <Button key={a} variant={a === "cancel" ? "outline" : "default"} disabled={a === "submit" && r.items.length === 0} onClick={() => setReqAct(a)}>{actionLabels[a]}</Button>)} />
      {isDraft && r.items.length === 0 && <Alert className="mb-4"><AlertDescription>این درخواست هنوز قلمی ندارد. ابتدا تغییرات موردنظر را اضافه و سپس درخواست را برای بررسی ارسال کنید.</AlertDescription></Alert>}
      <Card className="mb-4"><CardContent className="pt-6"><CaseStepper status={r.status} steps={["Draft", "Submitted", "UnderReview", "Approved", "AwaitingExecution", "Completed"]} /></CardContent></Card>
      {r.failureReason && <Alert variant="destructive" className="mb-4"><AlertDescription>{r.failureReason}</AlertDescription></Alert>}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit"><CardContent className="pt-6">
          <InfoList items={[
            ["مشترک", <Link key="c" to="/customers/$id" params={{ id: String(r.customerId) }} className="text-primary hover:underline">#{r.customerId}</Link>],
            ["وضعیت", <StatusBadge key="s" status={r.status} />], ["نسخه", String(r.revision)],
            ["تاریخ درخواست", toJalali(r.requestedAt)], ["تاریخ ارسال", toJalali(r.submittedAt)], ["تاریخ تکمیل", toJalali(r.completedAt)],
          ]} />
        </CardContent></Card>
        <DataTable<ChangeItem> rows={r.items} rowKey={(x) => x.id} hideSearch dense exportName="change-items" emptyText="قلمی ثبت نشده است"
          toolbar={isDraft && perms.can(P.ChangeRequest) ? (
            <FormSheet title="افزودن قلم تغییر" description="مقدار پیشنهادی همان قالبی است که حوزه مقصد برای اجرای تغییر می‌پذیرد (معمولاً JSON)." trigger={<Button size="sm" className="h-9"><Plus />افزودن قلم</Button>} successMessage="قلم تغییر اضافه شد"
              fields={[
                { name: "targetDomain", label: "حوزه مقصد", type: "select", options: DOMAINS, required: true },
                { name: "targetReferenceType", label: "نوع رکورد مقصد", required: true, ltr: true, placeholder: "Party, PartyContact, Premises…" },
                { name: "targetReferenceId", label: "شناسه رکورد مقصد", type: "number", required: true },
                { name: "changeType", label: "نوع تغییر", required: true, ltr: true, placeholder: "UpdateMobile, ChangeAddress…" },
                { name: "proposedValue", label: "مقدار پیشنهادی", type: "textarea", required: true, ltr: true },
                { name: "proposedValueVersion", label: "نسخه مقدار", type: "number", hint: "پیش‌فرض ۱" },
                { name: "proposedValueSchemaVersion", label: "نسخه قالب مقدار", type: "number", hint: "پیش‌فرض ۱" },
              ]}
              onSubmit={async (v) => {
                await lifecycleApi.addChangeItem(id, { targetDomain: text(v.targetDomain), targetReferenceType: text(v.targetReferenceType), targetReferenceId: reqInt(v.targetReferenceId), changeType: text(v.changeType), proposedValue: rawText(v.proposedValue), proposedValueVersion: reqInt(v.proposedValueVersion) || 1, proposedValueSchemaVersion: reqInt(v.proposedValueSchemaVersion) || 1 });
                await refresh();
              }} />
          ) : undefined}
          columns={[
            { key: "number", header: "ردیف" }, { key: "targetDomain", header: "حوزه" }, { key: "targetType", header: "رکورد", cell: (x) => <span className="font-mono text-xs">{x.targetType} #{x.targetId}</span> },
            { key: "changeType", header: "نوع تغییر" }, { key: "proposedValue", header: "مقدار پیشنهادی", cell: (x) => <span className="block max-w-56 truncate text-right font-mono text-xs" title={x.proposedValue}>{x.proposedValue}</span> },
            { key: "status", header: "وضعیت", cell: (x) => <StatusBadge status={x.status} /> }, { key: "failureReason", header: "علت خطا", hidden: true },
          ]}
          actions={[
            ...(["approve", "reject", "execute", "retry"] as ItemAction[]).map((a) => ({ label: actionLabels[a]!, destructive: a === "reject", show: (x: ChangeItem) => changeItemActions(x.status).includes(a) && perms.can(ITEM_PERM[a]), onClick: (x: ChangeItem) => setItemAct({ item: x, action: a }) })),
            { label: "جایگزینی مقدار", icon: RefreshCcw, show: (x: ChangeItem) => /submit|review|pending/i.test(x.status) && perms.can(P.ChangeRequest), onClick: setSupersede },
          ]} />
      </div>
      <ConfirmAction open={reqAct !== null} onOpenChange={(o) => !o && setReqAct(null)} title={reqAct ? `${actionLabels[reqAct]} درخواست` : ""} destructive={reqAct === "cancel"} confirmLabel={reqAct ? actionLabels[reqAct] : ""}
        onConfirm={async () => { await lifecycleApi.requestAction(id, reqAct!); toast.success("وضعیت درخواست به‌روزرسانی شد"); await refresh(); }} />
      <ConfirmAction open={itemAct !== null} onOpenChange={(o) => !o && setItemAct(null)} title={itemAct ? `${actionLabels[itemAct.action]} قلم ${itemAct.item.number}` : ""}
        requireReason={itemAct?.action === "reject"} destructive={itemAct?.action === "reject"} confirmLabel={itemAct ? actionLabels[itemAct.action] : ""}
        description={itemAct?.action === "execute" ? "تغییر برای اجرا به حوزه مقصد ارسال می‌شود؛ نتیجه پس از پاسخ آن حوزه نمایش داده می‌شود." : undefined}
        onConfirm={async (reason) => { await lifecycleApi.itemAction(itemAct!.item.id, itemAct!.action, reason); toast.success("قلم تغییر به‌روزرسانی شد"); await refresh(); }} />
      <FormSheet open={supersede !== null} onOpenChange={(o) => !o && setSupersede(null)} title="جایگزینی مقدار پیشنهادی" successMessage="مقدار جدید جایگزین شد"
        initial={{ proposedValue: supersede?.proposedValue ?? "", changeType: supersede?.changeType ?? "" }}
        fields={[{ name: "changeType", label: "نوع تغییر", ltr: true, required: true }, { name: "proposedValue", label: "مقدار پیشنهادی جدید", type: "textarea", ltr: true, required: true }]}
        onSubmit={async (v) => { await lifecycleApi.supersedeItem(supersede!.id, { proposedValue: rawText(v.proposedValue), changeType: text(v.changeType) }); await refresh(); }} />
    </>
  );
}
