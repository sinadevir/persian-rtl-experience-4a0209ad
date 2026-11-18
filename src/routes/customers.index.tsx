import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, tableState } from "@/components/cis/data-table";
import { StatusBadge } from "@/components/cis/status-badge";
import { Can } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { customersQuery, type Customer } from "@/features/customers/api";
import { usePaged } from "@/lib/use-paged";
import { toJalali } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/customers/")({
  head: () => seo("جستجوی مشترک", "جستجوی مشترکین با شماره اشتراک، نام یا کد ملی مشترک اصلی"),
  component: CustomersPage,
});

const STATUS = [{ value: "Active", label: "فعال" }, { value: "Suspended", label: "معلق" }, { value: "Inactive", label: "غیرفعال" }, { value: "Terminated", label: "خاتمه‌یافته" }, { value: "Merged", label: "ادغام‌شده" }];

function CustomersPage() {
  const nav = useNavigate();
  const pg = usePaged({ Status: "" });
  const q = useQuery(customersQuery({ Search: pg.search, Status: pg.filters.Status, page: pg.page, pageSize: pg.pageSize }));
  const open = (c: Customer) => nav({ to: "/customers/$id", params: { id: String(c.id) } });
  return (
    <>
      <PageHeader title="جستجوی مشترک" desc="با شماره اشتراک، نام مشترک اصلی یا کد ملی جستجو کنید؛ برای دیدن پرونده روی ردیف بزنید."
        actions={<Can perm={P.CustomerCreate}><Button asChild><Link to="/registration"><UserPlus />ثبت مشترک جدید</Link></Button></Can>} />
      <DataTable<Customer>
        {...tableState(q)}
        server={pg.server(q.data?.total ?? 0)}
        rowKey={(r) => r.id}
        onRowClick={open}
        exportName="customers"
        searchPlaceholder="شماره اشتراک، نام یا کد ملی…"
        filters={[{ key: "Status", label: "وضعیت‌ها", options: STATUS }]}
        emptyText={pg.search ? "مشترکی با این مشخصات پیدا نشد" : "هنوز مشترکی ثبت نشده است"}
        emptyAction={<Can perm={P.CustomerCreate}><Button size="sm" asChild><Link to="/registration"><UserPlus />ثبت مشترک جدید</Link></Button></Can>}
        columns={[
          { key: "number", header: "شماره اشتراک", cell: (r) => <span className="font-mono">{r.number || "—"}</span> },
          { key: "principalName", header: "مشترک اصلی" },
          { key: "nationalId", header: "کد ملی", cell: (r) => <span className="font-mono">{r.nationalId || "—"}</span> },
          { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
          { key: "createdAt", header: "تاریخ ثبت", cell: (r) => toJalali(r.createdAt), value: (r) => toJalali(r.createdAt) },
        ]}
        actions={[{ label: "مشاهده پرونده", icon: Eye, onClick: open }]}
      />
    </>
  );
}
