import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, tableState } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { StatusBadge } from "@/components/cis/status-badge";
import { EmptyState, InfoList, TreeView, type TreeNode } from "@/components/cis/blocks";
import { ErrorState, LoadingBlock } from "@/components/cis/query-state";
import { useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { activityTypesQuery, classificationTreeQuery, mismatchesQuery, usageApi, usageKeys, type ActivityType, type Classification, type Mismatch } from "@/features/usage/api";
import { usePaged } from "@/lib/use-paged";
import { int, rawText, text, type FormValues } from "@/lib/form-values";
import { toJalali } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/usage")({
  head: () => seo("کاربری ملک", "طبقه‌بندی کاربری، انواع فعالیت و ناسازگاری‌های کاربری املاک"),
  component: Usage,
});

function Usage() {
  const canCatalog = useCan(P.UsageCatalogManage);
  return (
    <>
      <PageHeader title="کاربری ملک" desc="ثبت و تغییر کاربری هر بخش از ملک از پرونده همان ملک انجام می‌شود؛ اینجا مرجع کاربری‌ها و ناسازگاری‌ها را مدیریت می‌کنید." />
      <Tabs defaultValue="mismatches">
        <TabsList className="mb-3 h-auto flex-wrap justify-start">
          <TabsTrigger value="mismatches">ناسازگاری‌ها</TabsTrigger>
          <TabsTrigger value="catalog">طبقه‌بندی کاربری</TabsTrigger>
          <TabsTrigger value="activities">انواع فعالیت</TabsTrigger>
        </TabsList>
        <TabsContent value="mismatches"><Mismatches /></TabsContent>
        <TabsContent value="catalog"><Catalog canManage={canCatalog} /></TabsContent>
        <TabsContent value="activities"><Activities canManage={canCatalog} /></TabsContent>
      </Tabs>
    </>
  );
}

function Mismatches() {
  const nav = useNavigate();
  const pg = usePaged();
  const q = useQuery(mismatchesQuery({ page: pg.page, pageSize: pg.pageSize }));
  return (
    <DataTable<Mismatch> {...tableState(q)} server={pg.server(q.data?.total ?? 0)} hideSearch rowKey={(m) => m.key} exportName="usage-mismatches" emptyText="ناسازگاری کاربری وجود ندارد"
      onRowClick={(m) => nav({ to: "/premises/$id", params: { id: String(m.premisesId) } })}
      columns={[
        { key: "premisesId", header: "ملک", cell: (m) => <span className="font-mono text-primary">#{m.premisesId}</span> },
        { key: "segmentCode", header: "بخش کاربری", cell: (m) => m.segmentCode || `#${m.segmentId}` },
        { key: "legal", header: "کاربری قانونی" }, { key: "declared", header: "کاربری اعلامی" }, { key: "observed", header: "کاربری مشاهده‌شده" },
        { key: "detectedAt", header: "تاریخ", cell: (m) => toJalali(m.detectedAt) },
      ]} />
  );
}

const toNodes = (cs: Classification[]): TreeNode[] => cs.map((c) => ({ id: String(c.id), title: c.name, badge: c.code, icon: Tag, inactive: /inactive|deactiv/i.test(c.status), children: toNodes(c.children) }));
const flatten = (cs: Classification[]): Classification[] => cs.flatMap((c) => [c, ...flatten(c.children)]);
const clsFields: Field[] = [{ name: "classificationCode", label: "کد", ltr: true, required: true }, { name: "classificationName", label: "عنوان", required: true }, { name: "description", label: "توضیح", type: "textarea" }];

function Catalog({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery(classificationTreeQuery(true));
  const [sel, setSel] = useState<string | undefined>();
  const nodes = useMemo(() => toNodes(q.data ?? []), [q.data]);
  const all = useMemo(() => flatten(q.data ?? []), [q.data]);
  const c = all.find((x) => String(x.id) === sel);
  const [edit, setEdit] = useState(false);
  const [move, setMove] = useState(false);
  const [off, setOff] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: usageKeys.catalog });
  const create = (parent?: Classification) => (
    <FormSheet title={parent ? `زیرشاخه جدید برای ${parent.name}` : "کاربری ریشه جدید"} trigger={<Button size="sm" variant={parent ? "outline" : "default"}><Plus />{parent ? "زیرشاخه" : "کاربری جدید"}</Button>} fields={clsFields} successMessage="کاربری ثبت شد"
      onSubmit={async (v) => { await usageApi.createClassification({ classificationCode: text(v.classificationCode), classificationName: rawText(v.classificationName), description: rawText(v.description), parentUsageClassificationId: parent?.id }); await refresh(); }} />
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card className="h-fit">
        <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">درخت کاربری‌ها</CardTitle>{canManage && create()}</CardHeader>
        <CardContent>{q.isPending ? <LoadingBlock rows={6} /> : q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} compact /> : nodes.length ? <TreeView nodes={nodes} selected={sel} onSelect={(n) => setSel(n.id)} /> : <p className="py-6 text-center text-sm text-muted-foreground">کاربری تعریف نشده است.</p>}</CardContent>
      </Card>
      {!c ? <EmptyState icon={FolderTree} title="یک کاربری را انتخاب کنید" /> : (
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <CardTitle className="text-base">{c.name}</CardTitle>
            {canManage && <div className="flex flex-wrap gap-2">{create(c)}<Button size="sm" variant="outline" onClick={() => setEdit(true)}>ویرایش</Button><Button size="sm" variant="outline" onClick={() => setMove(true)}>جابجایی</Button>{!/inactive|deactiv/i.test(c.status) && <Button size="sm" variant="outline" onClick={() => setOff(true)}>غیرفعال‌سازی</Button>}</div>}
          </CardHeader>
          <CardContent>
            <InfoList cols={2} items={[["کد", <span key="c" className="font-mono">{c.code}</span>], ["وضعیت", <StatusBadge key="s" status={c.status || "Active"} />], ["والد", all.find((x) => x.id === c.parentId)?.name ?? "ریشه"], ["زیرشاخه‌ها", String(c.children.length)], ["توضیح", c.description || "—"]]} />
          </CardContent>
          <FormSheet open={edit} onOpenChange={setEdit} title={`ویرایش ${c.name}`} fields={clsFields} successMessage="ذخیره شد" initial={{ classificationCode: c.code, classificationName: c.name, description: c.description }}
            onSubmit={async (v) => { await usageApi.updateClassification(c.id, { classificationCode: text(v.classificationCode), classificationName: rawText(v.classificationName), description: rawText(v.description), expectedRowVersion: c.rowVersion }); await refresh(); }} />
          <FormSheet open={move} onOpenChange={setMove} title={`جابجایی ${c.name}`} successMessage="جابجا شد"
            fields={[{ name: "parent", label: "والد جدید", type: "select", options: [{ value: "", label: "ریشه" }, ...all.filter((x) => x.id !== c.id).map((x) => ({ value: String(x.id), label: `${x.name} (${x.code})` }))] }]}
            initial={{ parent: c.parentId ? String(c.parentId) : "" }}
            onSubmit={async (v: FormValues) => { await usageApi.moveClassification(c.id, { parentUsageClassificationId: int(v.parent), expectedRowVersion: c.rowVersion }); await refresh(); }} />
          <ConfirmAction open={off} onOpenChange={setOff} title={`غیرفعال‌سازی ${c.name}`} description="تخصیص‌های موجود حفظ می‌شوند اما این کاربری برای تخصیص جدید قابل انتخاب نیست." destructive confirmLabel="غیرفعال‌سازی"
            onConfirm={async () => { await usageApi.deactivateClassification(c.id, { expectedRowVersion: c.rowVersion }); toast.success("غیرفعال شد"); await refresh(); }} />
        </Card>
      )}
    </div>
  );
}

const actFields: Field[] = [{ name: "activityCode", label: "کد", ltr: true, required: true }, { name: "activityName", label: "عنوان", required: true }, { name: "description", label: "توضیح", type: "textarea" }];
function Activities({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery(activityTypesQuery(true));
  const [edit, setEdit] = useState<ActivityType | null>(null);
  const [off, setOff] = useState<ActivityType | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: usageKeys.activityTypes });
  return (
    <>
      <DataTable<ActivityType> rows={q.data ?? []} loading={q.isPending} error={q.error ?? undefined} onRetry={() => void q.refetch()} rowKey={(a) => a.id} exportName="activity-types" searchPlaceholder="جستجوی فعالیت…" emptyText="نوع فعالیتی تعریف نشده است"
        toolbar={canManage ? <FormSheet title="نوع فعالیت جدید" trigger={<Button size="sm" className="h-9"><Plus />نوع جدید</Button>} fields={actFields} successMessage="ثبت شد" onSubmit={async (v) => { await usageApi.createActivityType({ activityCode: text(v.activityCode), activityName: rawText(v.activityName), description: rawText(v.description) }); await refresh(); }} /> : undefined}
        columns={[{ key: "code", header: "کد", cell: (a) => <span className="font-mono">{a.code}</span> }, { key: "name", header: "عنوان" }, { key: "description", header: "توضیح", className: "max-w-80 truncate" }, { key: "status", header: "وضعیت", cell: (a) => <StatusBadge status={a.status || "Active"} /> }]}
        actions={canManage ? [{ label: "ویرایش", onClick: setEdit }, { label: "غیرفعال‌سازی", destructive: true, show: (a) => !/inactive|deactiv/i.test(a.status), onClick: setOff }] : undefined} />
      <FormSheet open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} title="ویرایش نوع فعالیت" fields={actFields} successMessage="ذخیره شد" initial={edit ? { activityCode: edit.code, activityName: edit.name, description: edit.description } : {}}
        onSubmit={async (v) => { await usageApi.updateActivityType(edit!.id, { activityCode: text(v.activityCode), activityName: rawText(v.activityName), description: rawText(v.description), expectedRowVersion: edit!.rowVersion }); await refresh(); }} />
      <ConfirmAction open={off !== null} onOpenChange={(o) => !o && setOff(null)} title={`غیرفعال‌سازی ${off?.name ?? ""}`} destructive confirmLabel="غیرفعال‌سازی"
        onConfirm={async () => { await usageApi.deactivateActivityType(off!.id); toast.success("غیرفعال شد"); await refresh(); }} />
    </>
  );
}
