import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  regulationsQuery,
  parameterQuery,
  parameterVersionsQuery,
  parameterValueQuery,
  regApi,
  regKeys,
  type Regulation,
} from "@/features/foundation/regulations";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { QueryBoundary } from "@/components/cis/query-state";
import { InfoList } from "@/components/cis/blocks";
import { StatusBadge } from "@/components/cis/status-badge";
import { JalaliDatePicker } from "@/components/cis/jalali-date-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Can, useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { usePaged } from "@/lib/use-paged";
import { text, rawText, int, dateOnly } from "@/lib/form-values";
import { toJalali, toDateOnly } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/regulations")({
  head: () => seo("مقررات و پارامترها", "مقررات و نسخه‌های پارامترهای کسب‌وکار"),
  component: RegulationsPage,
});

const f = (name: string, label: string, extra: Partial<Field> = {}): Field => ({
  name,
  label,
  ...extra,
});
const scopeFields: Field[] = [
  f("scopeCompanyId", "شرکت", { type: "entity", entity: "company" }),
  f("relatedRegulationId", "شناسه مقرره مرتبط", { type: "number" }),
];

function RegulationsPage() {
  const client = useQueryClient();
  const manage = useCan(P.RegulationManage);
  const pg = usePaged({ status: "" });
  const regulations = useQuery(
    regulationsQuery({
      search: pg.search,
      page: pg.page,
      pageSize: pg.pageSize,
      status: pg.filters.status || undefined,
    }),
  );
  const [detail, setDetail] = useState<Regulation>();
  const [publishing, setPublishing] = useState<Regulation>();
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [asOf, setAsOf] = useState<Date>();
  const [companyInput, setCompanyInput] = useState("");
  const [check, setCheck] = useState<{ code: string; date: string; companyId?: number }>();

  const parameter = useQuery(parameterQuery(code));
  const versions = useQuery(parameterVersionsQuery(code));
  const value = useQuery({
    ...parameterValueQuery(check?.code ?? "", check?.date, check?.companyId),
    enabled: !!check,
  });

  const lookup = (next: string) => {
    const clean = next.trim();
    if (!clean) return;
    setCode(clean);
    setInput(clean);
    setCheck(undefined);
    setRecent((old) => [clean, ...old.filter((x) => x !== clean)].slice(0, 8));
    if (clean === code) {
      void parameter.refetch();
      void versions.refetch();
    }
  };
  const refresh = () => client.invalidateQueries({ queryKey: regKeys.all });

  const createRegulation = (
    <Can perm={P.RegulationManage}>
      <FormSheet
        title="مقرره جدید"
        trigger={<Button>مقرره جدید</Button>}
        fields={[
          f("regulationCode", "کد مقرره", { required: true }),
          f("title", "عنوان", { required: true }),
          f("titleEn", "عنوان انگلیسی"),
          f("regulationType", "نوع مقرره", { required: true }),
          f("issuingAuthority", "مرجع صادرکننده", { required: true }),
          f("issueDate", "تاریخ صدور", { type: "date", required: true }),
          f("effectiveDate", "تاریخ اجرا", { type: "date", required: true }),
          f("summary", "خلاصه", { type: "textarea" }),
        ]}
        onSubmit={async (v) => {
          await regApi.create({
            regulationCode: text(v.regulationCode),
            title: rawText(v.title),
            titleEn: text(v.titleEn),
            regulationType: text(v.regulationType),
            issuingAuthority: rawText(v.issuingAuthority),
            issueDate: dateOnly(v.issueDate),
            effectiveDate: dateOnly(v.effectiveDate),
            summary: rawText(v.summary),
          });
          await refresh();
        }}
      />
    </Can>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="مقررات و پارامترهای کسب‌وکار" />
      <Tabs defaultValue="regulations">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="regulations">مقررات</TabsTrigger>
          <TabsTrigger value="parameters">پارامترهای کسب‌وکار</TabsTrigger>
        </TabsList>
        <TabsContent value="regulations" className="space-y-4">
          <DataTable
            rows={regulations.data?.items ?? []}
            loading={regulations.isPending}
            fetching={regulations.isFetching}
            error={regulations.error ?? undefined}
            onRetry={() => void regulations.refetch()}
            server={pg.server(regulations.data?.total ?? 0)}
            filters={[
              {
                key: "status",
                label: "وضعیت",
                options: [
                  { value: "Draft", label: "پیش‌نویس" },
                  { value: "Published", label: "منتشرشده" },
                ],
              },
            ]}
            rowKey={(r) => r.id}
            onRowClick={setDetail}
            columns={[
              { key: "code", header: "کد" },
              { key: "title", header: "عنوان" },
              { key: "authority", header: "مرجع" },
              {
                key: "effectiveDate",
                header: "تاریخ اجرا",
                cell: (r) => toJalali(r.effectiveDate),
              },
              { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
            actions={
              manage
                ? [
                    {
                      label: "انتشار",
                      onClick: setPublishing,
                      show: (r) => r.status === "Draft",
                    },
                  ]
                : []
            }
            toolbar={createRegulation}
            emptyAction={createRegulation}
            emptyText="مقرره‌ای با این شرایط پیدا نشد."
            exportName="regulations"
          />
          {detail && (
            <section className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">جزئیات مقرره</h2>
                <Button variant="ghost" onClick={() => setDetail(undefined)}>
                  بستن
                </Button>
              </div>
              <InfoList
                cols={2}
                items={[
                  ["کد", detail.code],
                  ["عنوان", detail.title],
                  ["نوع", detail.type],
                  ["مرجع", detail.authority],
                  ["تاریخ صدور", toJalali(detail.issueDate)],
                  ["تاریخ اجرا", toJalali(detail.effectiveDate)],
                  ["وضعیت", <StatusBadge status={detail.status} />],
                  ["خلاصه", detail.summary || "—"],
                ]}
              />
            </section>
          )}
        </TabsContent>

        <TabsContent value="parameters" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            سرویس فهرست پارامترها ارائه نشده است؛ برای مشاهده، کد پارامتر را جستجو کنید.
          </p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              lookup(input);
            }}
          >
            <Input
              className="min-w-48 flex-1"
              aria-label="کد پارامتر"
              placeholder="کد پارامتر"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button disabled={!input.trim()} type="submit">
              جستجو
            </Button>
            <Can perm={P.RegulationManage}>
              <FormSheet
                title="پارامتر جدید"
                trigger={
                  <Button type="button" variant="outline">
                    پارامتر جدید
                  </Button>
                }
                fields={[
                  f("parameterCode", "کد", { required: true }),
                  f("parameterName", "نام", { required: true }),
                  f("parameterNameEn", "نام انگلیسی"),
                  f("dataType", "نوع داده", {
                    type: "select",
                    required: true,
                    options: [
                      { value: "String", label: "متن" },
                      { value: "Integer", label: "عدد صحیح" },
                      { value: "Decimal", label: "عدد اعشاری" },
                      { value: "Boolean", label: "منطقی" },
                      { value: "Date", label: "تاریخ" },
                    ],
                  }),
                  f("category", "دسته"),
                  f("description", "توضیح", { type: "textarea" }),
                  f("initialValue", "مقدار اولیه", { required: true }),
                  f("validFrom", "شروع اعتبار", { type: "date", required: true }),
                  ...scopeFields,
                ]}
                onSubmit={async (v) => {
                  await regApi.createParameter({
                    parameterCode: text(v.parameterCode),
                    parameterName: rawText(v.parameterName),
                    parameterNameEn: text(v.parameterNameEn),
                    dataType: text(v.dataType),
                    category: rawText(v.category),
                    description: rawText(v.description),
                    initialValue: rawText(v.initialValue),
                    validFrom: dateOnly(v.validFrom),
                    scopeCompanyId: int(v.scopeCompanyId),
                    relatedRegulationId: int(v.relatedRegulationId),
                  });
                  await refresh();
                  lookup(text(v.parameterCode)!);
                }}
              />
            </Can>
          </form>
          {recent.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">جستجوهای اخیر:</span>
              {recent.map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={item === code ? "secondary" : "outline"}
                  onClick={() => lookup(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          )}
          {code && (
            <>
              <QueryBoundary query={parameter}>
                {(p) => (
                  <InfoList
                    cols={2}
                    items={[
                      ["کد", p.code],
                      ["نام", p.name],
                      ["نوع داده", p.dataType],
                      ["دسته", p.category || "—"],
                      ["توضیح", p.description || "—"],
                      ["مقدار فعلی", p.currentValue || "—"],
                    ]}
                  />
                )}
              </QueryBoundary>
              <DataTable
                key={code}
                rows={versions.data ?? []}
                loading={versions.isPending}
                error={versions.error ?? undefined}
                onRetry={() => void versions.refetch()}
                rowKey={(r) => r.id}
                columns={[
                  { key: "value", header: "مقدار" },
                  { key: "validFrom", header: "از تاریخ", cell: (r) => toJalali(r.validFrom) },
                  {
                    key: "validTo",
                    header: "تا تاریخ",
                    cell: (r) => (r.validTo ? toJalali(r.validTo) : "—"),
                  },
                  { key: "companyId", header: "شناسه شرکت" },
                  { key: "reason", header: "دلیل تغییر" },
                  {
                    key: "status",
                    header: "وضعیت",
                    cell: (r) => <StatusBadge status={r.status} />,
                  },
                ]}
                toolbar={
                  <Can perm={P.RegulationManage}>
                    <FormSheet
                      key={code}
                      title="انتشار نسخه جدید"
                      trigger={<Button>انتشار نسخه جدید</Button>}
                      fields={[
                        f("value", "مقدار", { required: true }),
                        f("validFrom", "شروع اعتبار", { type: "date", required: true }),
                        f("changeReason", "دلیل تغییر", { type: "textarea", required: true }),
                        ...scopeFields,
                      ]}
                      onSubmit={async (v) => {
                        await regApi.publishVersion(code, {
                          value: rawText(v.value),
                          validFrom: dateOnly(v.validFrom),
                          changeReason: rawText(v.changeReason),
                          scopeCompanyId: int(v.scopeCompanyId),
                          relatedRegulationId: int(v.relatedRegulationId),
                        });
                        await client.invalidateQueries({ queryKey: regKeys.param(code) });
                      }}
                    />
                  </Can>
                }
                emptyText="نسخه‌ای برای این پارامتر ثبت نشده است."
                exportName="parameter-versions"
              />

              <section className="space-y-3 rounded-lg border bg-card p-4">
                <h2 className="font-semibold">مقدار در تاریخ</h2>
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!asOf) return;
                    const companyId = int(companyInput);
                    if (companyInput.trim() && (!companyId || companyId < 1)) return;
                    const next = { code, date: toDateOnly(asOf), companyId };
                    if (JSON.stringify(next) === JSON.stringify(check)) void value.refetch();
                    else setCheck(next);
                  }}
                >
                  <JalaliDatePicker value={asOf} onChange={setAsOf} placeholder="تاریخ بررسی" />
                  <Input
                    className="w-48"
                    aria-label="شناسه شرکت اختیاری"
                    placeholder="شناسه شرکت (اختیاری)"
                    inputMode="numeric"
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                  />
                  <Button
                    disabled={
                      !asOf ||
                      (!!companyInput.trim() && (!int(companyInput) || int(companyInput)! < 1))
                    }
                  >
                    بررسی
                  </Button>
                </form>
                {check && (
                  <QueryBoundary query={value}>
                    {(result) => (
                      <InfoList
                        cols={2}
                        items={Object.entries(result).map(([key, v]) => [
                          key,
                          typeof v === "boolean"
                            ? v
                              ? "بله"
                              : "خیر"
                            : v == null
                              ? "—"
                              : typeof v === "object"
                                ? JSON.stringify(v)
                                : String(v),
                        ])}
                      />
                    )}
                  </QueryBoundary>
                )}
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
      <Can perm={P.RegulationManage}>
        <ConfirmAction
          open={!!publishing}
          onOpenChange={(open) => {
            if (!open) setPublishing(undefined);
          }}
          title="انتشار مقرره"
          description={`مقرره «${publishing?.title ?? ""}» منتشر شود؟`}
          onConfirm={async () => {
            if (!publishing) return;
            await regApi.publish(publishing.id);
            if (detail?.id === publishing.id) setDetail({ ...publishing, status: "Published" });
            await refresh();
          }}
        />
      </Can>
    </div>
  );
}
