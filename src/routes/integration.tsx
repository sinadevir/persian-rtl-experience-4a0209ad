import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  foundationOutboxQuery,
  foundationInboxQuery,
  propertyOutboxQuery,
  propertyMetricsQuery,
  retryPropertyOutbox,
  type Message,
} from "@/features/foundation/operations";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, type Column } from "@/components/cis/data-table";
import { StatCard, InfoList } from "@/components/cis/blocks";
import { QueryBoundary } from "@/components/cis/query-state";
import { StatusBadge } from "@/components/cis/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/lib/api/hooks";
import { useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { toJalaliDateTime, faNum } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/integration")({
  head: () => seo("پایش یکپارچگی", "پایش پیام‌ها و شاخص‌های سرویس‌ها"),
  component: IntegrationPage,
});

const columns: Column<Message>[] = [
  { key: "id", header: "شناسه" },
  { key: "type", header: "نوع پیام" },
  { key: "source", header: "مبدأ / مصرف‌کننده" },
  { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
  {
    key: "occurredAt",
    header: "زمان",
    cell: (r) => (r.occurredAt ? toJalaliDateTime(r.occurredAt) : "—"),
  },
  {
    key: "attempts",
    header: "تلاش‌ها",
    cell: (r) => (r.attempts === undefined ? "—" : faNum(r.attempts)),
  },
  { key: "error", header: "آخرین خطا" },
];

function IntegrationPage() {
  const allowedRetry = useCan(P.IntegrationMonitor);
  const pending = useQuery({ ...foundationOutboxQuery("pending"), refetchInterval: 30_000 });
  const dead = useQuery({ ...foundationOutboxQuery("dead-letter"), refetchInterval: 30_000 });
  const inbox = useQuery({ ...foundationInboxQuery(), refetchInterval: 30_000 });
  const property = useQuery({ ...propertyOutboxQuery(), refetchInterval: 30_000 });
  const metrics = useQuery({ ...propertyMetricsQuery(), refetchInterval: 30_000 });
  const [detail, setDetail] = useState<Message>();
  const retry = useApiMutation(retryPropertyOutbox, {
    success: "درخواست تلاش مجدد ثبت شد",
    invalidate: [["integration", "pd"]],
  });
  const refreshing = [pending, dead, inbox, property, metrics].some((q) => q.isFetching);

  const list = (q: typeof pending, name: string, emptyText: string, canRetry = false) => (
    <DataTable
      rows={q.data ?? []}
      loading={q.isPending}
      fetching={q.isFetching}
      error={q.error ?? undefined}
      onRetry={() => void q.refetch()}
      rowKey={(r) => r.id}
      columns={columns}
      onRowClick={setDetail}
      actions={
        canRetry && allowedRetry
          ? [
              {
                label: retry.isPending ? "در حال ثبت درخواست…" : "تلاش مجدد",
                onClick: (r) => {
                  if (!retry.isPending) retry.mutate(r.id);
                },
              },
            ]
          : []
      }
      emptyText={emptyText}
      exportName={name}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="پایش یکپارچگی"
        desc="به‌روزرسانی خودکار هر ۳۰ ثانیه؛ شمارش‌ها مربوط به پاسخ فعلی سرویس هستند."
        actions={
          <Button
            variant="outline"
            disabled={refreshing}
            onClick={() => {
              void Promise.all([
                pending.refetch(),
                dead.refetch(),
                inbox.refetch(),
                property.refetch(),
                metrics.refetch(),
              ]);
            }}
          >
            {refreshing ? "در حال به‌روزرسانی…" : "به‌روزرسانی"}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="پیام‌های در انتظار بنیاد"
          value={pending.data ? faNum(pending.data.length) : "—"}
        />
        <StatCard title="پیام‌های ناموفق بنیاد" value={dead.data ? faNum(dead.data.length) : "—"} />
        <StatCard
          title="پیام‌های ورودی بنیاد"
          value={inbox.data ? faNum(inbox.data.length) : "—"}
          hint="حداکثر ۱۰۰ پیام اخیر"
        />
        <StatCard
          title="پیام‌های خروجی املاک"
          value={property.data ? faNum(property.data.length) : "—"}
        />
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="pending">در انتظار بنیاد</TabsTrigger>
          <TabsTrigger value="dead">ناموفق بنیاد</TabsTrigger>
          <TabsTrigger value="inbox">ورودی بنیاد</TabsTrigger>
          <TabsTrigger value="property">خروجی املاک</TabsTrigger>
          <TabsTrigger value="metrics">شاخص‌های املاک</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {list(pending, "foundation-pending", "پیام در انتظاری وجود ندارد.")}
        </TabsContent>
        <TabsContent value="dead">
          {list(dead, "foundation-dead-letter", "پیام ناموفقی وجود ندارد.")}
        </TabsContent>
        <TabsContent value="inbox">
          {list(inbox, "foundation-inbox", "پیام ورودی دریافت نشده است.")}
        </TabsContent>
        <TabsContent value="property">
          {list(property, "property-outbox", "پیام خروجی املاک وجود ندارد.", true)}
        </TabsContent>
        <TabsContent value="metrics">
          <QueryBoundary query={metrics}>
            {(data) => {
              const numeric = Object.entries(data).filter(
                (entry): entry is [string, number] => typeof entry[1] === "number",
              );
              const strings = Object.entries(data).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              );
              return (
                <div className="space-y-4">
                  {numeric.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {numeric.map(([key, value]) => (
                        <StatCard key={key} title={`شاخص: ${key}`} value={faNum(value)} />
                      ))}
                    </div>
                  )}
                  {strings.length > 0 && (
                    <InfoList
                      cols={2}
                      items={strings.map(([key, value]) => [`شاخص: ${key}`, value])}
                    />
                  )}
                  {!numeric.length && !strings.length && (
                    <p className="text-sm text-muted-foreground">
                      شاخص عددی یا متنی در سطح اول پاسخ ارائه نشده است.
                    </p>
                  )}
                </div>
              );
            }}
          </QueryBoundary>
        </TabsContent>
      </Tabs>

      <Sheet
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(undefined);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>جزئیات پیام</SheetTitle>
            <SheetDescription>پاسخ خام سرویس برای بررسی فنی</SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="space-y-4 p-4">
              <InfoList
                cols={2}
                items={[
                  ["شناسه", detail.id],
                  ["نوع", detail.type],
                  ["وضعیت", <StatusBadge status={detail.status} />],
                  ["خطا", detail.error || "—"],
                ]}
              />
              <pre
                dir="ltr"
                className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-left text-xs"
              >
                {JSON.stringify(detail.raw, null, 2)}
              </pre>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
