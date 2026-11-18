import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { auditQuery, type AuditEntry } from "@/features/foundation/operations";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable } from "@/components/cis/data-table";
import { InfoList } from "@/components/cis/blocks";
import { ForbiddenState } from "@/components/cis/query-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { usePaged } from "@/lib/use-paged";
import { toJalaliDateTime } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/audit")({
  head: () => seo("ردپای حسابرسی", "جستجو و مشاهده رویدادهای حسابرسی"),
  component: AuditPage,
});

function pretty(value: string) {
  if (!value) return "—";
  try {
    return JSON.stringify(JSON.parse(value) as unknown, null, 2);
  } catch {
    return value;
  }
}

function AuditPage() {
  const permitted = useCan(P.AuditRead);
  if (!permitted) return <ForbiddenState />;
  return <AuditEntries />;
}

function AuditEntries() {
  const pg = usePaged({
    module: "",
    entityType: "",
    entityId: "",
    action: "",
    from: "",
    to: "",
  });
  const [selected, setSelected] = useState<AuditEntry>();
  const invalidRange = !!pg.filters.from && !!pg.filters.to && pg.filters.from > pg.filters.to;
  const query = useQuery({
    ...auditQuery({
      page: pg.page,
      pageSize: pg.pageSize,
      module: pg.filters.module || undefined,
      entityType: pg.filters.entityType || undefined,
      entityId: pg.filters.entityId || undefined,
      action: pg.filters.action || undefined,
      from: pg.filters.from || undefined,
      to: pg.filters.to || undefined,
    }),
    enabled: !invalidRange,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="ردپای حسابرسی"
        desc="رویدادها فقط‌خواندنی هستند و امکان تغییر یا حذف آن‌ها وجود ندارد."
      />
      {invalidRange && (
        <p role="alert" className="text-sm text-destructive">
          تاریخ پایان نباید پیش از تاریخ شروع باشد.
        </p>
      )}
      <DataTable
          rows={invalidRange ? [] : (query.data?.items ?? [])}
          loading={!invalidRange && query.isPending}
          fetching={query.isFetching}
          error={query.error ?? undefined}
          onRetry={() => void query.refetch()}
          server={pg.server(query.data?.total ?? 0)}
          hideSearch
          rowKey={(r) => r.id}
          onRowClick={setSelected}
          columns={[
            { key: "at", header: "زمان", cell: (r) => (r.at ? toJalaliDateTime(r.at) : "—"), filter: { type: "dateRange", from: "from", to: "to" } },
            { key: "module", header: "ماژول", filter: { type: "text" } },
            { key: "entityType", header: "نوع موجودیت", filter: { type: "text" } },
            { key: "entityId", header: "شناسه موجودیت", filter: { type: "text" } },
            { key: "action", header: "عملیات", filter: { type: "text" } },
            { key: "actor", header: "عامل" },
          ]}
          emptyText="رویدادی با این شرایط پیدا نشد."
          exportName="audit-entries"
        />

      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-5xl">
          <SheetHeader>
            <SheetTitle>جزئیات رویداد حسابرسی</SheetTitle>
            <SheetDescription>مقادیر پیش و پس از عملیات، مطابق پاسخ سرور</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-5 p-4">
              <InfoList
                cols={2}
                items={[
                  ["شناسه", String(selected.id)],
                  ["زمان", selected.at ? toJalaliDateTime(selected.at) : "—"],
                  ["ماژول", selected.module],
                  ["نوع موجودیت", selected.entityType],
                  ["شناسه موجودیت", selected.entityId],
                  ["عملیات", selected.action],
                  ["عامل", selected.actor || "—"],
                  ["شناسه همبستگی", selected.correlationId || "—"],
                ]}
              />
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <section className="min-w-0 space-y-2">
                  <h2 className="font-semibold">پیش از تغییر</h2>
                  <pre
                    dir="ltr"
                    className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-left text-xs"
                  >
                    {pretty(selected.before)}
                  </pre>
                </section>
                <section className="min-w-0 space-y-2">
                  <h2 className="font-semibold">پس از تغییر</h2>
                  <pre
                    dir="ltr"
                    className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-left text-xs"
                  >
                    {pretty(selected.after)}
                  </pre>
                </section>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
