import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/cis/app-shell";
import { InfoList, SharesBar } from "@/components/cis/blocks";
import { DataTable, tableState } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { QueryBoundary } from "@/components/cis/query-state";
import { StatusBadge } from "@/components/cis/status-badge";
import { UsageSegmentsPanel } from "@/components/cis/usage-segments-panel";
import { Can, useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import {
  premisesQuery,
  premisesApi,
  premisesKeys,
  addressesQuery,
  addressHistoryQuery,
  premisesStructureQuery,
  mapLink,
  type Premises,
  type Address,
  type StructureKind,
  type StructureLink,
} from "@/features/premises/api";
import { currentOwnersQuery, occupancyHistoryQuery } from "@/features/ownership/api";
import { premisesRelationshipsQuery } from "@/features/relationships/api";
import { rawText, text, reqInt, int, flag, isoDate } from "@/lib/form-values";
import { pick, toList } from "@/lib/api/list";
import { usePaged } from "@/lib/use-paged";
import { toJalali } from "@/lib/jalali";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/premises/$id")({
  head: () => seo("پرونده ملک", "مشخصات، نشانی، ساختار، کاربری، مالکیت و بهره‌برداری ملک"),
  component: PremisesPage,
});
function PremisesPage() {
  const { id } = Route.useParams();
  const q = useQuery(premisesQuery(id));
  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2">
        <Link to="/premises">
          <ArrowRight />
          بازگشت به املاک
        </Link>
      </Button>
      <QueryBoundary query={q}>{(row) => <Detail row={row} />}</QueryBoundary>
    </>
  );
}
function Detail({ row }: { row: Premises }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: premisesKeys.one(row.id) });
  return (
    <>
      <PageHeader
        title={row.name || row.code}
        desc={`کد ملک: ${row.code}`}
        actions={
          <Can perm={P.PremisesUpdate}>
            <FormSheet
              title="ویرایش ملک"
              trigger={<Button>ویرایش ملک</Button>}
              fields={[
                { name: "premisesName", label: "نام ملک" },
                { name: "description", label: "توضیحات", type: "textarea" },
              ]}
              initial={{ premisesName: row.name, description: row.description }}
              onSubmit={async (v) => {
                await premisesApi.update(row.id, {
                  premisesName: rawText(v.premisesName),
                  description: rawText(v.description),
                  expectedRowVersion: row.rowVersion,
                });
                await refresh();
              }}
            />
            <FormSheet
              title="تغییر وضعیت ملک"
              trigger={<Button variant="outline">تغییر وضعیت</Button>}
              fields={[
                {
                  name: "premisesStatus",
                  label: "وضعیت جدید",
                  type: "ref",
                  refGroup: "PremisesStatus",
                  numeric: true,
                  required: true,
                },
              ]}
              onSubmit={async (v) => {
                await premisesApi.changeStatus(row.id, {
                  premisesStatus: reqInt(v.premisesStatus),
                  expectedRowVersion: row.rowVersion,
                });
                await refresh();
              }}
            />
          </Can>
        }
      />
      <InfoList
        cols={2}
        items={[
          ["کد ملک", row.code],
          ["وضعیت", <StatusBadge status={row.status} />],
          ["نشانی", row.address || "—"],
          ["کد پستی", row.postalCode || "—"],
          ["توضیحات", row.description || "—"],
        ]}
      />
      <Tabs defaultValue="addresses" className="mt-6">
        <TabsList className="flex h-auto flex-wrap">
          {[
            ["addresses", "نشانی‌ها"],
            ["structure", "ساختار"],
            ["usage", "بخش‌های کاربری"],
            ["owners", "مالکان فعلی"],
            ["occupancy", "بهره‌برداران"],
            ["relations", "روابط"],
          ].map(([v, label]) => (
            <TabsTrigger key={v} value={v!}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="addresses">
          <Addresses id={row.id} />
        </TabsContent>
        <TabsContent value="structure">
          <Structure id={row.id} />
        </TabsContent>
        <TabsContent value="usage">
          <UsageSegmentsPanel premisesId={row.id} />
        </TabsContent>
        <TabsContent value="owners">
          <Owners id={row.id} />
        </TabsContent>
        <TabsContent value="occupancy">
          <Occupancies id={row.id} />
        </TabsContent>
        <TabsContent value="relations">
          <Relations id={row.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
const addressFields: Field[] = [
  {
    name: "addressType",
    label: "نوع نشانی",
    type: "ref",
    refGroup: "AddressType",
    numeric: true,
    required: true,
  },
  { name: "addressText", label: "نشانی کامل", type: "textarea", required: true },
  { name: "postalCode", label: "کد پستی", rule: "postalCode", ltr: true },
  ...["provinceCode", "countyCode", "cityCode", "districtCode"].map((name, i): Field => ({
    name,
    label: ["کد استان", "کد شهرستان", "کد شهر", "کد منطقه"][i]!,
    ltr: true,
  })),
  { name: "latitude", label: "عرض جغرافیایی", type: "number" },
  { name: "longitude", label: "طول جغرافیایی", type: "number" },
  { name: "validFrom", label: "شروع اعتبار", type: "date" },
  { name: "isPrimary", label: "نشانی اصلی", type: "switch" },
];
function Addresses({ id }: { id: number }) {
  const [history, setHistory] = useState(false);
  const q = useQuery(history ? addressHistoryQuery(id) : addressesQuery(id));
  const qc = useQueryClient();
  const can = useCan(P.PremisesUpdate);
  const [edit, setEdit] = useState<Address | null>(null);
  const [add, setAdd] = useState(false);
  const [end, setEnd] = useState<Address | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: premisesKeys.one(id) });
  const addButton = (
    <Can perm={P.PremisesUpdate}>
      <Button onClick={() => setAdd(true)}>افزودن نشانی</Button>
    </Can>
  );
  return (
    <>
      <label className="mb-3 flex gap-2 text-sm">
        <input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />
        نمایش تاریخچه نشانی‌ها
      </label>
      <DataTable
        rows={q.data ?? []}
        loading={q.isPending}
        error={q.error ?? undefined}
        onRetry={() => q.refetch()}
        rowKey={(r) => r.id}
        exportName="premises-addresses"
        toolbar={addButton}
        emptyAction={addButton}
        emptyText="نشانی‌ای ثبت نشده است؛ نشانی ملک را اضافه کنید."
        columns={[
          { key: "type", header: "کد نوع" },
          { key: "text", header: "نشانی" },
          { key: "postalCode", header: "کد پستی" },
          { key: "isPrimary", header: "اصلی", cell: (r) => (r.isPrimary ? "بله" : "خیر") },
          { key: "validFrom", header: "شروع اعتبار", cell: (r) => toJalali(r.validFrom) },
          { key: "validTo", header: "پایان اعتبار", cell: (r) => toJalali(r.validTo) },
        ]}
        actions={[
          { label: "جایگزینی نشانی", show: (r) => can && !r.validTo, onClick: setEdit },
          { label: "پایان نشانی", show: (r) => can && !r.validTo, onClick: setEnd },
        ]}
      />
      <FormSheet
        key={edit?.id ?? (add ? "new" : "closed")}
        open={add || edit !== null}
        onOpenChange={(v) => {
          if (!v) {
            setEdit(null);
            setAdd(false);
          }
        }}
        title={edit ? "جایگزینی نشانی" : "افزودن نشانی"}
        fields={addressFields}
        initial={
          edit
            ? {
                addressType: edit.type,
                addressText: edit.text,
                postalCode: edit.postalCode,
                provinceCode: edit.province,
                countyCode: edit.county,
                cityCode: edit.city,
                districtCode: edit.district,
                latitude: edit.lat?.toString(),
                longitude: edit.lng?.toString(),
                isPrimary: edit.isPrimary,
              }
            : {}
        }
        onSubmit={async (v) => {
          const body = {
            addressType: reqInt(v.addressType),
            addressText: rawText(v.addressText),
            postalCode: text(v.postalCode),
            provinceCode: text(v.provinceCode),
            countyCode: text(v.countyCode),
            cityCode: text(v.cityCode),
            districtCode: text(v.districtCode),
            latitude: int(v.latitude),
            longitude: int(v.longitude),
            validFrom: isoDate(v.validFrom),
            isPrimary: flag(v.isPrimary),
          };
          if (edit) await premisesApi.replaceAddress(id, edit.id, body);
          else await premisesApi.addAddress(id, body);
          await refresh();
        }}
      />
      <FormSheet
        open={end !== null}
        onOpenChange={(v) => {
          if (!v) setEnd(null);
        }}
        title="پایان اعتبار نشانی"
        fields={[{ name: "validTo", label: "زمان پایان", type: "date", required: true }]}
        onSubmit={async (v) => {
          if (end) {
            await premisesApi.endAddress(id, end.id, { validTo: isoDate(v.validTo)! });
            await refresh();
          }
        }}
      />
    </>
  );
}
function Structure({ id }: { id: number }) {
  const q = useQuery(premisesStructureQuery(id));
  const qc = useQueryClient();
  const can = useCan(P.PremisesUpdate);
  const [kind, setKind] = useState<StructureKind>("parcels");
  const [end, setEnd] = useState<(StructureLink & { catalog: StructureKind }) | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: premisesKeys.one(id) });
  return (
    <>
      <Can perm={P.PremisesUpdate}>
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            نوع ساختار
            <select
              className="rounded border bg-background p-2"
              value={kind}
              onChange={(e) => setKind(e.target.value as StructureKind)}
            >
              <option value="parcels">عرصه</option>
              <option value="buildings">ساختمان</option>
              <option value="units">واحد</option>
            </select>
          </label>
          <FormSheet
            key={kind}
            title="اتصال ساختار به ملک"
            trigger={<Button>افزودن اتصال</Button>}
            fields={[
              {
                name: "targetId",
                label: "ساختار مقصد",
                type: "entity",
                entity: kind === "parcels" ? "parcel" : kind === "buildings" ? "building" : "unit",
                required: true,
              },
              {
                name: "linkRole",
                label: "نقش اتصال",
                type: "ref",
                refGroup: "StructureLinkRole",
                numeric: true,
                required: true,
              },
              { name: "validFrom", label: "شروع اعتبار", type: "date", required: true },
            ]}
            onSubmit={async (v) => {
              await premisesApi.addLink(id, kind, {
                targetId: reqInt(v.targetId),
                linkRole: reqInt(v.linkRole),
                validFrom: isoDate(v.validFrom)!,
              });
              await refresh();
            }}
          />
        </div>
      </Can>
      <QueryBoundary query={q}>
        {(raw) => (
          <div className="space-y-4">
            {(["parcels", "buildings", "units"] as const).map((catalog) => (
              <section key={catalog}>
                <h2 className="mb-2 font-bold">
                  {{ parcels: "عرصه‌ها", buildings: "ساختمان‌ها", units: "واحدها" }[catalog]}
                </h2>
                <DataTable
                  rows={toList(pick(raw, catalog)).map((r) => ({ ...mapLink(r), catalog }))}
                  rowKey={(r) => `${catalog}-${r.linkId}-${r.targetId}`}
                  exportName={`premises-${catalog}`}
                  emptyText="اتصالی ثبت نشده است؛ از افزودن اتصال استفاده کنید."
                  columns={[
                    { key: "targetCode", header: "کد مقصد" },
                    { key: "targetId", header: "شناسه مقصد" },
                    { key: "role", header: "کد نقش" },
                    { key: "validFrom", header: "شروع اعتبار", cell: (r) => toJalali(r.validFrom) },
                    { key: "validTo", header: "پایان اعتبار", cell: (r) => toJalali(r.validTo) },
                  ]}
                  actions={[
                    { label: "پایان اتصال", show: (r) => can && !r.validTo, onClick: setEnd },
                  ]}
                />
              </section>
            ))}
          </div>
        )}
      </QueryBoundary>
      <ConfirmAction
        open={end !== null}
        onOpenChange={(v) => {
          if (!v) setEnd(null);
        }}
        title="پایان اتصال ساختاری"
        description="اعتبار اتصال از اکنون پایان می‌یابد؛ سوابق آن حفظ می‌شود."
        onConfirm={async () => {
          if (end) {
            await premisesApi.endLink(id, end.catalog, end.linkId, {
              validTo: new Date().toISOString(),
            });
            await refresh();
          }
        }}
      />
    </>
  );
}
function Owners({ id }: { id: number }) {
  const q = useQuery(currentOwnersQuery(id));
  return (
    <>
      <Button asChild variant="outline" className="mb-4">
        <Link to="/ownership">مدیریت مالکیت</Link>
      </Button>
      <QueryBoundary query={q}>
        {(rows) => <SharesBar parts={rows.map((r) => ({ label: r.partyName, value: r.share }))} />}
      </QueryBoundary>
      <DataTable
        rows={q.data ?? []}
        loading={q.isPending}
        error={q.error ?? undefined}
        onRetry={() => q.refetch()}
        rowKey={(r) => `${r.partyId}-${r.validFrom}`}
        exportName="premises-owners"
        emptyText="مالک فعلی برای این ملک ثبت نشده است."
        columns={[
          {
            key: "partyName",
            header: "مالک",
            cell: (r) => (
              <Link
                className="text-primary underline"
                to="/parties/$id"
                params={{ id: String(r.partyId) }}
              >
                {r.partyName}
              </Link>
            ),
          },
          { key: "share", header: "سهم (درصد)" },
          { key: "validFrom", header: "شروع اعتبار", cell: (r) => toJalali(r.validFrom) },
        ]}
      />
    </>
  );
}
function Occupancies({ id }: { id: number }) {
  const q = useQuery(occupancyHistoryQuery(id));
  return (
    <DataTable
      rows={q.data ?? []}
      loading={q.isPending}
      error={q.error ?? undefined}
      onRetry={() => q.refetch()}
      rowKey={(r) => `${r.kind}-${r.id}`}
      exportName="premises-occupancy"
      emptyText="سابقه بهره‌برداری ثبت نشده است."
      columns={[
        { key: "partyName", header: "بهره‌بردار" },
        { key: "type", header: "نوع" },
        { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
        { key: "from", header: "شروع", cell: (r) => toJalali(r.from) },
        { key: "to", header: "پایان", cell: (r) => toJalali(r.to) },
      ]}
    />
  );
}
function Relations({ id }: { id: number }) {
  const pg = usePaged();
  const q = useQuery(
    premisesRelationshipsQuery(id, { search: pg.search, page: pg.page, pageSize: pg.pageSize }),
  );
  return (
    <DataTable
      {...tableState(q)}
      server={pg.server(q.data?.total ?? 0)}
      rowKey={(r) => r.id}
      exportName="premises-relationships"
      emptyText="رابطه‌ای برای این ملک ثبت نشده است."
      columns={[
        { key: "typeName", header: "نوع رابطه" },
        {
          key: "partyName",
          header: "شخص",
          cell: (r) => (
            <Link
              className="text-primary underline"
              to="/parties/$id"
              params={{ id: String(r.partyId) }}
            >
              {r.partyName}
            </Link>
          ),
        },
        { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
        { key: "validFrom", header: "شروع", cell: (r) => toJalali(r.validFrom) },
        { key: "validTo", header: "پایان", cell: (r) => toJalali(r.validTo) },
      ]}
    />
  );
}
