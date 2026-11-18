import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  banksQuery,
  channelsQuery,
  providersQuery,
  type BankItem,
} from "@/features/foundation/operations";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, type Column } from "@/components/cis/data-table";
import { StatusBadge } from "@/components/cis/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/banking")({
  head: () => seo("اطلاعات بانکی", "بانک‌ها، کانال‌های پرداخت و ارائه‌دهندگان پرداخت قبض"),
  component: BankingPage,
});

const columns: Column<BankItem>[] = [
  { key: "code", header: "کد" },
  { key: "name", header: "نام" },
  { key: "extra", header: "اطلاعات تکمیلی" },
  {
    key: "active",
    header: "وضعیت",
    cell: (r) => <StatusBadge status={r.active ? "Active" : "Inactive"} />,
    value: (r) => (r.active ? "فعال" : "غیرفعال"),
  },
];
const filters = [
  {
    key: "active",
    label: "وضعیت",
    options: [
      { value: "true", label: "فعال" },
      { value: "false", label: "غیرفعال" },
    ],
  },
];

function BankingPage() {
  const banks = useQuery(banksQuery());
  const channels = useQuery(channelsQuery());
  const providers = useQuery(providersQuery());

  return (
    <div className="space-y-6">
      <PageHeader
        title="اطلاعات بانکی"
        desc="این بخش فقط‌خواندنی است و از سرور مرکزی تغذیه می‌شود"
      />
      <Tabs defaultValue="banks">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="banks">بانک‌ها</TabsTrigger>
          <TabsTrigger value="channels">کانال‌های پرداخت</TabsTrigger>
          <TabsTrigger value="providers">ارائه‌دهندگان پرداخت قبض</TabsTrigger>
        </TabsList>
        <TabsContent value="banks">
          <DataTable
            rows={banks.data ?? []}
            loading={banks.isPending}
            error={banks.error ?? undefined}
            onRetry={() => void banks.refetch()}
            columns={columns}
            filters={filters}
            rowKey={(r) => r.id}
            emptyText="بانکی با این شرایط پیدا نشد."
            exportName="banks"
          />
        </TabsContent>
        <TabsContent value="channels">
          <DataTable
            rows={channels.data ?? []}
            loading={channels.isPending}
            error={channels.error ?? undefined}
            onRetry={() => void channels.refetch()}
            columns={columns}
            filters={filters}
            rowKey={(r) => r.id}
            emptyText="کانال پرداختی با این شرایط پیدا نشد."
            exportName="payment-channels"
          />
        </TabsContent>
        <TabsContent value="providers">
          <DataTable
            rows={providers.data ?? []}
            loading={providers.isPending}
            error={providers.error ?? undefined}
            onRetry={() => void providers.refetch()}
            columns={columns}
            filters={filters}
            rowKey={(r) => r.id}
            emptyText="ارائه‌دهنده‌ای با این شرایط پیدا نشد."
            exportName="bill-payment-providers"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
