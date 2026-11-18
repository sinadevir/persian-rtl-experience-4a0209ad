import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, tableState } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { StatusBadge } from "@/components/cis/status-badge";
import { Can, useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import {
  premisesListQuery,
  premisesApi,
  premisesKeys,
  structureListQuery,
  structurePrefix,
  type StructureKind,
  type StructureItem,
} from "@/features/premises/api";
import { createdId } from "@/features/parties/api";
import { rawText, text, int, reqInt } from "@/lib/form-values";
import { usePaged } from "@/lib/use-paged";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/premises/")({
  head: () => seo("املاک و ساختار", "جستجو و ثبت املاک، عرصه‌ها، ساختمان‌ها و واحدها"),
  component: PremisesPage,
});
const createFields: Field[] = [
  { name: "premisesCode", label: "کد ملک", required: true, section: "مشخصات ملک", ltr: true },
  { name: "premisesName", label: "نام ملک", section: "مشخصات ملک" },
  { name: "description", label: "توضیحات", type: "textarea", section: "مشخصات ملک" },
  {
    name: "addressType",
    label: "نوع نشانی",
    type: "ref",
    refGroup: "AddressType",
    numeric: true,
    required: true,
    section: "نشانی",
  },
  { name: "addressText", label: "نشانی کامل", type: "textarea", required: true, section: "نشانی" },
  { name: "postalCode", label: "کد پستی", rule: "postalCode", ltr: true, section: "نشانی" },
  ...["provinceCode", "countyCode", "cityCode", "districtCode"].map((name, i): Field => ({
    name,
    label: ["کد استان", "کد شهرستان", "کد شهر", "کد منطقه"][i]!,
    ltr: true,
    section: "نشانی",
  })),
  { name: "latitude", label: "عرض جغرافیایی", type: "number", section: "نشانی" },
  { name: "longitude", label: "طول جغرافیایی", type: "number", section: "نشانی" },
];
function PremisesPage() {
  const pg = usePaged({ Status: "", Address: "", Code: "" });
  const q = useQuery(
    premisesListQuery({ ...pg.filters, Search: pg.search, page: pg.page, pageSize: pg.pageSize }),
  );
  const qc = useQueryClient();
  const nav = useNavigate();
  const add = (
    <Can perm={P.PremisesCreate}>
      <FormSheet
        title="ثبت ملک جدید"
        description="ابتدا مشخصات ملک و سپس نشانی اولیه را وارد کنید."
        trigger={<Button>ثبت ملک جدید</Button>}
        fields={createFields}
        onSubmit={async (v) => {
          const res = await premisesApi.create({
            premisesCode: text(v.premisesCode),
            premisesName: rawText(v.premisesName),
            description: rawText(v.description),
            addressType: reqInt(v.addressType),
            addressText: rawText(v.addressText),
            postalCode: text(v.postalCode),
            provinceCode: text(v.provinceCode),
            countyCode: text(v.countyCode),
            cityCode: text(v.cityCode),
            districtCode: text(v.districtCode),
            latitude: int(v.latitude),
            longitude: int(v.longitude),
          });
          await qc.invalidateQueries({ queryKey: premisesKeys.all });
          const id = createdId(res, "premisesId");
          if (id !== undefined) await nav({ to: "/premises/$id", params: { id: String(id) } });
        }}
      />
    </Can>
  );
  return (
    <>
      <PageHeader
        title="املاک و ساختار"
        desc="مدیریت ملک و کاتالوگ عرصه، ساختمان و واحد"
        actions={add}
      />
      <Tabs defaultValue="premises">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="premises">املاک</TabsTrigger>
          <TabsTrigger value="parcels">عرصه‌ها</TabsTrigger>
          <TabsTrigger value="buildings">ساختمان‌ها</TabsTrigger>
          <TabsTrigger value="units">واحدها</TabsTrigger>
        </TabsList>
        <TabsContent value="premises">
          <DataTable
            {...tableState(q)}
            server={pg.server(q.data?.total ?? 0)}
            rowKey={(r) => r.id}
            exportName="premises"
            emptyText="ملکی با این مشخصات پیدا نشد؛ می‌توانید ملک جدید ثبت کنید."
            emptyAction={add}
            onRowClick={(r) => void nav({ to: "/premises/$id", params: { id: String(r.id) } })}
            columns={[
              { key: "code", header: "کد ملک", filter: { type: "text", param: "Code" } },
              { key: "name", header: "نام ملک" },
              { key: "address", header: "نشانی", filter: { type: "text", param: "Address" } },
              { key: "postalCode", header: "کد پستی" },
              { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} />, filter: { type: "text", param: "Status", placeholder: "کد وضعیت" } },
            ]}
          />
        </TabsContent>
        {(["parcels", "buildings", "units"] as const).map((kind) => (
          <TabsContent key={kind} value={kind}>
            <StructureCatalog kind={kind} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
function StructureCatalog({ kind }: { kind: StructureKind }) {
  const label = { parcels: "عرصه", buildings: "ساختمان", units: "واحد" }[kind];
  const prefix = structurePrefix[kind];
  const pg = usePaged();
  const q = useQuery(
    structureListQuery(kind, { Search: pg.search, page: pg.page, pageSize: pg.pageSize }),
  );
  const qc = useQueryClient();
  const can = useCan(P.PremisesUpdate);
  const [editing, setEditing] = useState<StructureItem | null>(null);
  const [creating, setCreating] = useState(false);
  const fields: Field[] = [
    { name: "code", label: `کد ${label}`, required: true, ltr: true },
    { name: "name", label: `نام ${label}` },
    ...(kind !== "buildings"
      ? [{ name: "area", label: "مساحت (متر مربع)", type: "number" } as Field]
      : ([
          { name: "year", label: "سال ساخت", type: "number", rule: "integer" },
          { name: "floors", label: "تعداد طبقات", type: "number", rule: "integer" },
        ] as Field[])),
    ...(kind === "units"
      ? ([
          { name: "floor", label: "طبقه", type: "number", rule: "integer" },
          { name: "unitNumber", label: "شماره واحد" },
        ] as Field[])
      : []),
    { name: "description", label: "توضیحات", type: "textarea" },
  ];
  const add = (
    <Can perm={P.PremisesCreate}>
      <Button onClick={() => setCreating(true)}>ثبت {label}</Button>
    </Can>
  );
  return (
    <>
      <DataTable
        {...tableState(q)}
        server={pg.server(q.data?.total ?? 0)}
        rowKey={(r) => r.id}
        exportName={kind}
        toolbar={add}
        emptyAction={add}
        emptyText={`هنوز ${label}ی ثبت نشده است؛ از دکمه ثبت استفاده کنید.`}
        columns={[
          { key: "code", header: "کد" },
          { key: "name", header: "نام" },
          { key: "area", header: "مساحت" },
          { key: "description", header: "توضیحات" },
          { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
        ]}
        actions={[{ label: "ویرایش", show: () => can, onClick: setEditing }]}
      />
      <FormSheet
        key={editing?.id ?? (creating ? "new" : "closed")}
        open={creating || editing !== null}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
        title={`${editing ? "ویرایش" : "ثبت"} ${label}`}
        fields={fields}
        initial={
          editing
            ? {
                code: editing.code,
                name: editing.name,
                area: editing.area?.toString(),
                year: editing.year?.toString(),
                floors: editing.floors?.toString(),
                floor: editing.floor?.toString(),
                unitNumber: editing.unitNumber,
                description: editing.description,
              }
            : {}
        }
        onSubmit={async (v) => {
          const body = {
            [`${prefix}Code`]: text(v.code),
            [`${prefix}Name`]: rawText(v.name),
            description: rawText(v.description),
            ...(kind === "buildings"
              ? { constructionYear: int(v.year), floorCount: int(v.floors) }
              : { areaSquareMeters: int(v.area) }),
            ...(kind === "units"
              ? { floorNumber: int(v.floor), unitNumber: text(v.unitNumber) }
              : {}),
          };
          if (editing)
            await premisesApi.updateStructure(kind, editing.id, {
              ...body,
              expectedRowVersion: editing.rowVersion,
            });
          else if (kind === "parcels") await premisesApi.createParcel(body);
          else if (kind === "buildings") await premisesApi.createBuilding(body);
          else await premisesApi.createUnit(body);
          await qc.invalidateQueries({ queryKey: premisesKeys.structure });
        }}
      />
    </>
  );
}
