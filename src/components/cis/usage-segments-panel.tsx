import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Undo2,
  PenLine,
  Tag,
  FileSearch,
  Gavel,
  Activity as ActivityIcon,
  CircleStop,
  FilePlus2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/cis/data-table";
import { FormSheet } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { StatusBadge } from "@/components/cis/status-badge";
import { CaseStepper } from "@/components/cis/workflow";
import { EmptyState } from "@/components/cis/blocks";
import { ErrorState, LoadingBlock } from "@/components/cis/query-state";
import { Can, useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import {
  segmentActivitiesQuery,
  segmentAssertionsQuery,
  segmentAssignmentsQuery,
  segmentCasesQuery,
  segmentLegalUsageQuery,
  segmentsQuery,
  usageApi,
  usageKeys,
  type Assertion,
  type Assignment,
  type Activity,
  type UsageCase,
} from "@/features/usage/api";
import { int, isoDate, rawText, reqInt, text } from "@/lib/form-values";
import { notifyError } from "@/lib/api/hooks";
import { toJalali } from "@/lib/jalali";
import { statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** B04 per premises: usage segments, their legal usage history, assertions, observed activities and change cases. */
export function UsageSegmentsPanel({ premisesId }: { premisesId: number }) {
  const qc = useQueryClient();
  const segs = useQuery(segmentsQuery(premisesId));
  const [sel, setSel] = useState<number | null>(null);
  if (segs.isPending) return <LoadingBlock rows={3} />;
  if (segs.error) return <ErrorState error={segs.error} onRetry={() => void segs.refetch()} />;
  const list = segs.data ?? [];
  const current = list.find((s) => s.id === sel) ?? list[0];
  const add = (
    <Can perm={P.UsageManage}>
      <FormSheet
        title="افزودن بخش کاربری"
        description="هر بخش، قسمتی از ملک است که کاربری مستقل دارد (مثلاً مغازه همکف)."
        trigger={
          <Button size="sm">
            <Plus />
            بخش جدید
          </Button>
        }
        successMessage="بخش کاربری ایجاد شد"
        fields={[
          { name: "segmentCode", label: "کد بخش", required: true, ltr: true },
          { name: "segmentName", label: "عنوان" },
          { name: "description", label: "توضیحات", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          await usageApi.createSegment(premisesId, {
            segmentCode: text(v.segmentCode),
            segmentName: rawText(v.segmentName),
            description: rawText(v.description),
          });
          await qc.invalidateQueries({ queryKey: usageKeys.premises(premisesId) });
        }}
      />
    </Can>
  );
  if (list.length === 0)
    return (
      <EmptyState icon={Tag} title="برای این ملک بخش کاربری ثبت نشده است">
        {add}
      </EmptyState>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">بخش‌ها</span>
          {add}
        </div>
        <ul className="space-y-1" role="listbox" aria-label="بخش‌های کاربری">
          {list.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={current?.id === s.id}
                onClick={() => setSel(s.id)}
                className={cn(
                  "w-full rounded-md border p-2 text-right text-sm hover:bg-muted",
                  current?.id === s.id && "border-primary bg-accent",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">{s.code}</span>
                  <StatusBadge status={s.status} />
                </div>
                {s.name && <div className="text-xs text-muted-foreground">{s.name}</div>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {current && <SegmentDetail key={current.id} segmentId={current.id} />}
    </div>
  );
}

function SegmentDetail({ segmentId }: { segmentId: number }) {
  const qc = useQueryClient();
  const legal = useQuery({ ...segmentLegalUsageQuery(segmentId), retry: false });
  const inval = () => qc.invalidateQueries({ queryKey: usageKeys.segment(segmentId) });
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          کاربری قانونی فعلی:{" "}
          <span className="text-primary">
            {legal.data?.classificationName || (legal.isPending ? "…" : "تعیین نشده")}
          </span>
        </CardTitle>
        {legal.data?.validFrom && (
          <span className="text-xs text-muted-foreground">از {toJalali(legal.data.validFrom)}</span>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="assign">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="assign">تخصیص‌ها</TabsTrigger>
            <TabsTrigger value="assert">اظهارات</TabsTrigger>
            <TabsTrigger value="activity">فعالیت‌های مشاهده‌شده</TabsTrigger>
            <TabsTrigger value="cases">پرونده تغییر کاربری</TabsTrigger>
          </TabsList>
          <TabsContent value="assign" className="pt-3">
            <Assignments segmentId={segmentId} onChange={inval} />
          </TabsContent>
          <TabsContent value="assert" className="pt-3">
            <Assertions segmentId={segmentId} onChange={inval} />
          </TabsContent>
          <TabsContent value="activity" className="pt-3">
            <Activities segmentId={segmentId} onChange={inval} />
          </TabsContent>
          <TabsContent value="cases" className="pt-3">
            <Cases segmentId={segmentId} onChange={inval} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

const after = (key: string) => (x: unknown, all: Record<string, unknown>) =>
  x instanceof Date && all[key] instanceof Date && x <= (all[key] as Date)
    ? "تاریخ پایان باید بعد از تاریخ شروع باشد"
    : undefined;

function Assignments({
  segmentId,
  onChange,
}: {
  segmentId: number;
  onChange: () => Promise<unknown>;
}) {
  const q = useQuery(segmentAssignmentsQuery(segmentId));
  const can = useCan(P.UsageManage);
  const [reverse, setReverse] = useState<Assignment | null>(null);
  const [correct, setCorrect] = useState(false);
  return (
    <>
      <DataTable<Assignment>
        rows={q.data ?? []}
        loading={q.isPending}
        error={q.error ?? undefined}
        onRetry={() => void q.refetch()}
        rowKey={(r) => r.id}
        dense
        hideSearch
        exportName="usage-assignments"
        emptyText="هنوز کاربری برای این بخش تخصیص نیافته است"
        toolbar={
          <Can perm={P.UsageManage}>
            <FormSheet
              title="تخصیص کاربری"
              trigger={
                <Button size="sm" className="h-9">
                  <Tag />
                  تخصیص
                </Button>
              }
              successMessage="کاربری تخصیص یافت"
              fields={[
                {
                  name: "usageClassificationId",
                  label: "کاربری",
                  type: "entity",
                  entity: "usageClassification",
                  required: true,
                },
                {
                  name: "assignmentType",
                  label: "نوع تخصیص",
                  type: "ref",
                  refGroup: "UsageAssignmentType",
                  numeric: true,
                  required: true,
                },
                { name: "validFrom", label: "از تاریخ", type: "date", required: true },
                {
                  name: "assignmentReason",
                  label: "علت تخصیص",
                  type: "ref",
                  refGroup: "UsageAssignmentReason",
                  numeric: true,
                  required: true,
                },
                { name: "sourceAssertionId", label: "شناسه اظهار مبنا (اختیاری)", type: "number" },
                { name: "description", label: "توضیحات", type: "textarea" },
              ]}
              onSubmit={async (v) => {
                await usageApi.assign(segmentId, {
                  usageClassificationId: reqInt(v.usageClassificationId),
                  assignmentType: reqInt(v.assignmentType),
                  validFrom: isoDate(v.validFrom)!,
                  assignmentReason: reqInt(v.assignmentReason),
                  sourceAssertionId: int(v.sourceAssertionId),
                  description: rawText(v.description),
                });
                await onChange();
              }}
            />
            <Button size="sm" variant="outline" className="h-9" onClick={() => setCorrect(true)}>
              <PenLine />
              اصلاح بازه
            </Button>
          </Can>
        }
        columns={[
          { key: "classificationName", header: "کاربری" },
          { key: "type", header: "نوع", cell: (r) => statusLabel(r.type) },
          { key: "validFrom", header: "از", cell: (r) => toJalali(r.validFrom) },
          { key: "validTo", header: "تا", cell: (r) => toJalali(r.validTo) },
          { key: "recordedFrom", header: "ثبت", cell: (r) => toJalali(r.recordedFrom) },
          {
            key: "state",
            header: "وضعیت",
            cell: (r) => (
              <StatusBadge status={r.recordedTo ? "Superseded" : r.validTo ? "Ended" : "Active"} />
            ),
          },
          { key: "description", header: "توضیحات", hidden: true },
        ]}
        actions={[
          {
            label: "برگشت این تخصیص",
            icon: Undo2,
            destructive: true,
            show: (r) => can && !r.recordedTo && !r.validTo,
            onClick: setReverse,
          },
        ]}
      />
      <FormSheet
        open={reverse !== null}
        onOpenChange={(o) => !o && setReverse(null)}
        title={`برگشت تخصیص «${reverse?.classificationName ?? ""}»`}
        description="تخصیص قبلی (در صورت وجود) دوباره جاری می‌شود. سابقه حذف نمی‌شود."
        submitLabel="برگشت"
        successMessage="تخصیص برگشت خورد"
        initial={{ effectiveFrom: new Date() }}
        fields={[
          { name: "effectiveFrom", label: "از تاریخ", type: "date", required: true },
          { name: "reason", label: "دلیل", type: "textarea", required: true },
        ]}
        onSubmit={async (v) => {
          await usageApi.reverse(segmentId, reverse!.id, {
            effectiveFrom: isoDate(v.effectiveFrom)!,
            reason: rawText(v.reason),
            correlationId: crypto.randomUUID(),
          });
          await onChange();
        }}
      />
      <FormSheet
        open={correct}
        onOpenChange={setCorrect}
        title="اصلاح کاربری در یک بازه"
        description="برای بازه‌ای که اشتباه ثبت شده، کاربری درست را بر اساس یک اظهار تأییدشده جایگزین کنید."
        submitLabel="ثبت اصلاح"
        successMessage="اصلاح ثبت شد"
        fields={[
          {
            name: "assignmentType",
            label: "نوع تخصیص",
            type: "ref",
            refGroup: "UsageAssignmentType",
            numeric: true,
            required: true,
          },
          { name: "correctionFrom", label: "اصلاح از تاریخ", type: "date", required: true },
          {
            name: "correctionTo",
            label: "اصلاح تا تاریخ",
            type: "date",
            required: true,
            validate: after("correctionFrom"),
          },
          {
            name: "usageClassificationId",
            label: "کاربری درست",
            type: "entity",
            entity: "usageClassification",
            required: true,
            section: "کاربری جایگزین",
          },
          {
            name: "assignmentReason",
            label: "علت",
            type: "ref",
            refGroup: "UsageAssignmentReason",
            numeric: true,
            required: true,
            section: "کاربری جایگزین",
          },
          {
            name: "approvedAssertionId",
            label: "شناسه اظهار تأییدشده",
            type: "number",
            required: true,
            section: "کاربری جایگزین",
            hint: "از زبانه «اظهارات» قابل مشاهده است",
          },
          { name: "reason", label: "دلیل اصلاح", type: "textarea", required: true },
        ]}
        onSubmit={async (v) => {
          await usageApi.correct(segmentId, {
            assignmentType: reqInt(v.assignmentType),
            correctionFrom: isoDate(v.correctionFrom)!,
            correctionTo: isoDate(v.correctionTo)!,
            reason: rawText(v.reason),
            correlationId: crypto.randomUUID(),
            replacementSlices: [
              {
                usageClassificationId: reqInt(v.usageClassificationId),
                validFrom: isoDate(v.correctionFrom)!,
                validTo: isoDate(v.correctionTo)!,
                assignmentReason: reqInt(v.assignmentReason),
                approvedAssertionId: reqInt(v.approvedAssertionId),
              },
            ],
          });
          await onChange();
        }}
      />
    </>
  );
}

function Assertions({
  segmentId,
  onChange,
}: {
  segmentId: number;
  onChange: () => Promise<unknown>;
}) {
  const q = useQuery(segmentAssertionsQuery(segmentId));
  const canDecide = useCan(P.UsageCaseDecide);
  const [decide, setDecide] = useState<Assertion | null>(null);
  const review = async (a: Assertion) => {
    try {
      await usageApi.reviewAssertion(a.id);
      toast.success("بررسی اظهار آغاز شد");
      await onChange();
    } catch (e) {
      notifyError(e);
    }
  };
  return (
    <>
      <DataTable<Assertion>
        rows={q.data?.items ?? []}
        loading={q.isPending}
        error={q.error ?? undefined}
        onRetry={() => void q.refetch()}
        rowKey={(r) => r.id}
        dense
        hideSearch
        exportName="usage-assertions"
        emptyText="اظهاری برای این بخش ثبت نشده است"
        toolbar={
          <Can perm={P.UsageManage}>
            <FormSheet
              title="ثبت اظهار کاربری"
              description="اظهار مالک، گزارش بازدید یا مستند رسمی درباره کاربری این بخش."
              trigger={
                <Button size="sm" className="h-9">
                  <FilePlus2 />
                  ثبت اظهار
                </Button>
              }
              successMessage="اظهار ثبت شد"
              fields={[
                {
                  name: "usageClassificationId",
                  label: "کاربری اظهارشده",
                  type: "entity",
                  entity: "usageClassification",
                  required: true,
                },
                {
                  name: "assertionType",
                  label: "نوع اظهار",
                  type: "ref",
                  refGroup: "UsageAssertionType",
                  numeric: true,
                  required: true,
                },
                { name: "assertionDate", label: "تاریخ اظهار", type: "date", required: true },
                { name: "effectiveFrom", label: "اعتبار از", type: "date" },
                {
                  name: "effectiveTo",
                  label: "اعتبار تا",
                  type: "date",
                  validate: after("effectiveFrom"),
                },
                { name: "sourceReference", label: "شماره مستند / منبع" },
                { name: "assertionDescription", label: "شرح", type: "textarea" },
              ]}
              onSubmit={async (v) => {
                await usageApi.addAssertion(segmentId, {
                  usageClassificationId: reqInt(v.usageClassificationId),
                  assertionType: reqInt(v.assertionType),
                  assertionDate: isoDate(v.assertionDate)!,
                  effectiveFrom: isoDate(v.effectiveFrom),
                  effectiveTo: isoDate(v.effectiveTo),
                  sourceReference: rawText(v.sourceReference),
                  assertionDescription: rawText(v.assertionDescription),
                });
                await onChange();
              }}
            />
          </Can>
        }
        columns={[
          { key: "id", header: "شناسه", cell: (r) => <span className="font-mono">{r.id}</span> },
          {
            key: "classificationName",
            header: "کاربری",
            cell: (r) => r.classificationName || `#${r.classificationId}`,
          },
          { key: "type", header: "نوع", cell: (r) => statusLabel(r.type) },
          { key: "date", header: "تاریخ", cell: (r) => toJalali(r.date) },
          { key: "source", header: "منبع" },
          { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "decisionReason", header: "دلیل تصمیم", hidden: true },
        ]}
        actions={[
          {
            label: "شروع بررسی",
            icon: FileSearch,
            show: (r) => canDecide && /submit|pending|draft|^1$/i.test(r.status),
            onClick: review,
          },
          { label: "ثبت تصمیم", icon: Gavel, show: () => canDecide, onClick: setDecide },
        ]}
      />
      <FormSheet
        open={decide !== null}
        onOpenChange={(o) => !o && setDecide(null)}
        title="تصمیم درباره اظهار"
        successMessage="تصمیم ثبت شد"
        fields={[
          {
            name: "decision",
            label: "تصمیم",
            type: "ref",
            refGroup: "UsageAssertionDecision",
            numeric: true,
            required: true,
          },
          { name: "decisionReason", label: "دلیل", type: "textarea", required: true },
        ]}
        onSubmit={async (v) => {
          await usageApi.decideAssertion(decide!.id, {
            decision: reqInt(v.decision),
            decisionReason: rawText(v.decisionReason),
            expectedRowVersion: decide!.rowVersion,
          });
          await onChange();
        }}
      />
    </>
  );
}

function Activities({
  segmentId,
  onChange,
}: {
  segmentId: number;
  onChange: () => Promise<unknown>;
}) {
  const q = useQuery(segmentActivitiesQuery(segmentId));
  const can = useCan(P.UsageManage);
  const [end, setEnd] = useState<Activity | null>(null);
  return (
    <>
      <DataTable<Activity>
        rows={q.data ?? []}
        loading={q.isPending}
        error={q.error ?? undefined}
        onRetry={() => void q.refetch()}
        rowKey={(r) => r.id}
        dense
        hideSearch
        exportName="usage-activities"
        emptyText="فعالیتی ثبت نشده است"
        toolbar={
          <Can perm={P.UsageManage}>
            <FormSheet
              title="ثبت فعالیت مشاهده‌شده"
              trigger={
                <Button size="sm" className="h-9">
                  <ActivityIcon />
                  ثبت فعالیت
                </Button>
              }
              successMessage="فعالیت ثبت شد"
              fields={[
                {
                  name: "activityTypeId",
                  label: "نوع فعالیت",
                  type: "entity",
                  entity: "activityType",
                  required: true,
                },
                { name: "activityStartAt", label: "از تاریخ", type: "date", required: true },
                { name: "sourceReference", label: "منبع (گزارش بازدید…)" },
                { name: "description", label: "شرح", type: "textarea" },
              ]}
              onSubmit={async (v) => {
                await usageApi.addActivity(segmentId, {
                  activityTypeId: reqInt(v.activityTypeId),
                  activityStartAt: isoDate(v.activityStartAt)!,
                  sourceReference: rawText(v.sourceReference),
                  description: rawText(v.description),
                });
                await onChange();
              }}
            />
          </Can>
        }
        columns={[
          { key: "typeName", header: "فعالیت", cell: (r) => r.typeName || `#${r.typeId}` },
          { key: "start", header: "از", cell: (r) => toJalali(r.start) },
          { key: "end", header: "تا", cell: (r) => toJalali(r.end) },
          { key: "source", header: "منبع" },
          { key: "description", header: "شرح" },
        ]}
        actions={[
          { label: "پایان فعالیت", icon: CircleStop, show: (r) => can && !r.end, onClick: setEnd },
        ]}
      />
      <FormSheet
        open={end !== null}
        onOpenChange={(o) => !o && setEnd(null)}
        title="پایان فعالیت"
        successMessage="پایان فعالیت ثبت شد"
        initial={{ activityEndAt: new Date() }}
        fields={[{ name: "activityEndAt", label: "تاریخ پایان", type: "date", required: true }]}
        onSubmit={async (v) => {
          await usageApi.endActivity(end!.id, { activityEndAt: isoDate(v.activityEndAt)! });
          await onChange();
        }}
      />
    </>
  );
}

type CaseOp = "review" | "approve" | "awaiting-execution" | "reject" | "execute" | "cancel";
const CASE_OPS: { op: CaseOp; label: string; when: RegExp; destructive?: boolean }[] = [
  { op: "review", label: "شروع بررسی", when: /^(draft|submitted|requested|open)$/i },
  { op: "approve", label: "تأیید", when: /review/i },
  { op: "reject", label: "رد", when: /review/i, destructive: true },
  { op: "awaiting-execution", label: "آماده اجرا", when: /^approved$/i },
  { op: "execute", label: "اجرا", when: /awaiting|^approved$|failed/i },
  {
    op: "cancel",
    label: "لغو",
    when: /^(draft|submitted|requested|open|underreview|inreview)$/i,
    destructive: true,
  },
];

function Cases({ segmentId, onChange }: { segmentId: number; onChange: () => Promise<unknown> }) {
  const q = useQuery(segmentCasesQuery(segmentId));
  const canDecide = useCan(P.UsageCaseDecide);
  const [act, setAct] = useState<{ c: UsageCase; op: CaseOp } | null>(null);
  const run = async (c: UsageCase, op: CaseOp, v: Record<string, unknown> = {}) => {
    const r = rawText(v.reason as string | undefined);
    if (op === "review" || op === "awaiting-execution") await usageApi.caseAction(c.id, op);
    if (op === "approve") await usageApi.approveCase(c.id, { decisionReason: r });
    if (op === "reject") await usageApi.rejectCase(c.id, { decisionReason: r });
    if (op === "cancel") await usageApi.cancelCase(c.id, { reason: r });
    if (op === "execute")
      await usageApi.executeCase(c.id, {
        assignmentReason: reqInt(v.assignmentReason as string | undefined),
      });
    await onChange();
  };
  if (q.isPending) return <LoadingBlock rows={2} />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Can perm={P.UsageManage}>
          <FormSheet
            title="پرونده تغییر کاربری"
            description="پس از ثبت، پرونده بررسی، تأیید و اجرا می‌شود؛ کاربری قانونی فقط پس از اجرا تغییر می‌کند."
            trigger={
              <Button size="sm">
                <Plus />
                پرونده جدید
              </Button>
            }
            successMessage="پرونده تغییر کاربری ثبت شد"
            fields={[
              {
                name: "targetUsageClassificationId",
                label: "کاربری درخواستی",
                type: "entity",
                entity: "usageClassification",
                required: true,
              },
              {
                name: "caseType",
                label: "نوع پرونده",
                type: "ref",
                refGroup: "UsageChangeCaseType",
                numeric: true,
                required: true,
              },
              {
                name: "proposedEffectiveFrom",
                label: "تاریخ اثر پیشنهادی",
                type: "date",
                required: true,
              },
              { name: "caseNumber", label: "شماره پرونده (اختیاری)", ltr: true },
              { name: "description", label: "شرح", type: "textarea" },
            ]}
            onSubmit={async (v) => {
              await usageApi.createCase({
                usageSegmentId: segmentId,
                targetUsageClassificationId: reqInt(v.targetUsageClassificationId),
                caseType: reqInt(v.caseType),
                proposedEffectiveFrom: isoDate(v.proposedEffectiveFrom)!,
                caseNumber: text(v.caseNumber),
                description: rawText(v.description),
              });
              await onChange();
            }}
          />
        </Can>
      </div>
      {(q.data ?? []).length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          پرونده تغییر کاربری برای این بخش ثبت نشده است.
        </p>
      )}
      {(q.data ?? []).map((c) => (
        <div key={c.id} className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">پرونده {c.number || `#${c.id}`}</div>
              <div className="text-xs text-muted-foreground">
                ثبت {toJalali(c.requestedAt)} · اثر از {toJalali(c.effectiveFrom)}
              </div>
            </div>
            <StatusBadge status={c.status} />
          </div>
          <CaseStepper
            status={c.status}
            steps={["Submitted", "UnderReview", "Approved", "AwaitingExecution", "Completed"]}
          />
          {(c.failureReason || c.decisionReason) && (
            <p className="text-sm text-muted-foreground">{c.failureReason || c.decisionReason}</p>
          )}
          {canDecide && (
            <div className="flex flex-wrap gap-2">
              {CASE_OPS.filter((o) => o.when.test(c.status.replace(/[\s_-]/g, ""))).map((o) => (
                <Button
                  key={o.op}
                  size="sm"
                  variant={o.destructive ? "outline" : "default"}
                  className={cn(o.destructive && "text-destructive")}
                  onClick={() => setAct({ c, op: o.op })}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
      {act && act.op === "execute" ? (
        <FormSheet
          open
          onOpenChange={(o) => !o && setAct(null)}
          title="اجرای پرونده تغییر کاربری"
          submitLabel="اجرا"
          successMessage="پرونده اجرا شد"
          fields={[
            {
              name: "assignmentReason",
              label: "علت تخصیص",
              type: "ref",
              refGroup: "UsageAssignmentReason",
              numeric: true,
              required: true,
            },
          ]}
          onSubmit={(v) => run(act.c, "execute", v)}
        />
      ) : act ? (
        <ConfirmAction
          open
          onOpenChange={(o) => !o && setAct(null)}
          title={`${CASE_OPS.find((o) => o.op === act.op)?.label} پرونده ${act.c.number || `#${act.c.id}`}`}
          requireReason={act.op === "reject" || act.op === "cancel"}
          destructive={act.op === "reject" || act.op === "cancel"}
          onConfirm={async (reason) => {
            await run(act.c, act.op, { reason });
            toast.success("وضعیت پرونده به‌روزرسانی شد");
          }}
        />
      ) : null}
    </div>
  );
}
