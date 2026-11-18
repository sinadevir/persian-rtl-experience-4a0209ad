import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, tableState } from "@/components/cis/data-table";
import { StatusBadge } from "@/components/cis/status-badge";
import { useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { changeRequestsQuery, lifecycleApi, lifecycleCasesQuery, lifecycleKeys, transitionLabel, TRANSITIONS, type ChangeRequest, type LifecycleCase } from "@/features/lifecycle/api";
import { usePaged } from "@/lib/use-paged";
import { toJalali, faNum } from "@/lib/jalali";
import { errorMessage } from "@/lib/api/messages";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/cases/")({
  head: () => seo("کارتابل درخواست‌ها", "درخواست‌های تغییر وضعیت و تغییر اطلاعات مشترکین برای بررسی، تأیید و اجرا"),
  component: Cases,
});

const CASE_STATUS = [
  { value: "Draft", label: "پیش‌نویس" }, { value: "Submitted", label: "ارسال‌شده" }, { value: "UnderReview", label: "در حال بررسی" },
  { value: "Approved", label: "تأییدشده" }, { value: "AwaitingExecution", label: "در انتظار اجرا" }, { value: "Failed", label: "اجرای ناموفق" },
  { value: "Completed", label: "اجراشده" }, { value: "Rejected", label: "ردشده" }, { value: "Cancelled", label: "لغوشده" },
];

function Cases() {
  return (
    <>
      <PageHeader title="کارتابل درخواست‌ها" desc="درخواست‌ها را بر اساس وضعیت فیلتر کنید؛ با باز کردن هر ردیف، مراحل و اقدام بعدی را می‌بینید." />
      <Tabs defaultValue="lifecycle">
        <TabsList className="mb-3 h-auto flex-wrap justify-start">
          <TabsTrigger value="lifecycle">تغییر وضعیت مشترک</TabsTrigger>
          <TabsTrigger value="changes">تغییر اطلاعات مشترک</TabsTrigger>
        </TabsList>
        <TabsContent value="lifecycle"><LifecycleTable /></TabsContent>
        <TabsContent value="changes"><ChangesTable /></TabsContent>
      </Tabs>
      <p className="mt-4 text-xs text-muted-foreground">پرونده‌های تغییر کاربری از پرونده ملک (بخش کاربری) و پرونده‌های رابطه از صفحه «روابط و اختیارات» پیگیری می‌شوند.</p>
    </>
  );
}

/** Runs one server action per selected case (the API has no bulk endpoint) and reports how many succeeded. */
async function runBulk<T>(rows: T[], fn: (r: T) => Promise<unknown>) {
  let ok = 0; const errors: string[] = [];
  for (const r of rows) { try { await fn(r); ok++; } catch (e) { errors.push(errorMessage(e)); } }
  if (ok) toast.success(`${faNum(ok)} مورد با موفقیت انجام شد`);
  if (errors.length) toast.error(`${faNum(errors.length)} مورد انجام نشد`, { description: [...new Set(errors)].slice(0, 2).join(" / ") });
}

function LifecycleTable() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const pg = usePaged({ status: "Submitted", transitionType: "" });
  const q = useQuery(lifecycleCasesQuery({ status: pg.filters.status, transitionType: pg.filters.transitionType, page: pg.page, pageSize: pg.pageSize }));
  const canApprove = useCan(P.LifecycleApprove);
  const canExecute = useCan(P.LifecycleExecute);
  const [busy, setBusy] = useState(false);
  const bulk = async (rows: LifecycleCase[], action: "approve" | "execute", clear: () => void) => {
    setBusy(true);
    await runBulk(rows, (r) => lifecycleApi.caseAction(r.id, action));
    await qc.invalidateQueries({ queryKey: lifecycleKeys.cases });
    setBusy(false); clear();
  };
  return (
    <DataTable<LifecycleCase>
      {...tableState(q)} server={pg.server(q.data?.total ?? 0)} hideSearch rowKey={(r) => r.id} exportName="lifecycle-cases"
      onRowClick={(r) => nav({ to: "/cases/$id", params: { id: `lc-${r.id}` } })}
      filters={[{ key: "status", label: "وضعیت‌ها", options: CASE_STATUS }, { key: "transitionType", label: "انواع تغییر", options: TRANSITIONS }]}
      emptyText="درخواستی با این وضعیت وجود ندارد"
      selectable={canApprove || canExecute}
      bulkActions={(sel, clear) => (
        <>
          {canApprove && <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk(sel, "approve", clear)}>{busy ? <Loader2 className="animate-spin" /> : <CheckCheck />}تأیید گروهی</Button>}
          {canExecute && <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk(sel, "execute", clear)}><Play />اجرای گروهی</Button>}
        </>
      )}
      columns={[
        { key: "number", header: "شماره", cell: (r) => <span className="font-mono text-primary">{r.number || `#${r.id}`}</span> },
        { key: "transitionType", header: "نوع تغییر", cell: (r) => transitionLabel(r.transitionType), value: (r) => transitionLabel(r.transitionType) },
        { key: "customerId", header: "مشترک", cell: (r) => <span className="font-mono">#{r.customerId}</span> },
        { key: "reason", header: "دلیل", className: "max-w-64 truncate" },
        { key: "requestedAt", header: "تاریخ درخواست", cell: (r) => toJalali(r.requestedAt), value: (r) => toJalali(r.requestedAt) },
        { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}

function ChangesTable() {
  const nav = useNavigate();
  const pg = usePaged({ status: "Submitted" });
  const q = useQuery(changeRequestsQuery({ status: pg.filters.status, page: pg.page, pageSize: pg.pageSize }));
  return (
    <DataTable<ChangeRequest>
      {...tableState(q)} server={pg.server(q.data?.total ?? 0)} hideSearch rowKey={(r) => r.id} exportName="information-change-requests"
      onRowClick={(r) => nav({ to: "/cases/$id", params: { id: `cr-${r.id}` } })}
      filters={[{ key: "status", label: "وضعیت‌ها", options: CASE_STATUS }]}
      emptyText="درخواستی با این وضعیت وجود ندارد"
      columns={[
        { key: "number", header: "شماره", cell: (r) => <span className="font-mono text-primary">{r.number || `#${r.id}`}</span> },
        { key: "customerId", header: "مشترک", cell: (r) => <span className="font-mono">#{r.customerId}</span> },
        { key: "reason", header: "موضوع", className: "max-w-64 truncate" },
        { key: "items", header: "اقلام", cell: (r) => faNum(r.items.length), value: (r) => r.items.length },
        { key: "requestedAt", header: "تاریخ درخواست", cell: (r) => toJalali(r.requestedAt), value: (r) => toJalali(r.requestedAt) },
        { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
