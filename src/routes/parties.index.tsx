import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, tableState } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { StatusBadge } from "@/components/cis/status-badge";
import { Can } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import {
  partiesQuery,
  duplicatePartiesQuery,
  partyApi,
  partyKeys,
  createdId,
} from "@/features/parties/api";
import { text, rawText, dateOnly } from "@/lib/form-values";
import { pick, str } from "@/lib/api/list";
import { usePaged } from "@/lib/use-paged";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/parties/")({
  head: () => seo("اشخاص", "جستجو و ثبت اشخاص حقیقی و حقوقی و بررسی موارد تکراری"),
  component: PartiesPage,
});
const common: Field[] = [
  { name: "mobilePhone", label: "تلفن همراه", rule: "mobile", ltr: true },
  { name: "partyCode", label: "کد شخص", ltr: true },
];
const individual: Field[] = [
  { name: "givenName", label: "نام", required: true },
  { name: "familyName", label: "نام خانوادگی", required: true },
  { name: "nationalId", label: "کد ملی", required: true, rule: "nationalId", ltr: true },
  ...common,
  { name: "middleName", label: "نام میانی" },
  { name: "birthDate", label: "تاریخ تولد", type: "date" },
  { name: "genderCode", label: "جنسیت", type: "ref", refGroup: "GenderCode" },
];
const organization: Field[] = [
  { name: "organizationName", label: "نام سازمان", required: true },
  { name: "nationalLegalId", label: "شناسه ملی", rule: "legalId", ltr: true },
  ...common,
  { name: "organizationTypeCode", label: "نوع سازمان", type: "ref", refGroup: "OrganizationType" },
  { name: "registrationDate", label: "تاریخ ثبت", type: "date" },
];
function PartiesPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const pg = usePaged({ nationalId: "", name: "", phone: "" });
  const q = useQuery(
    partiesQuery({ ...pg.filters, search: pg.search, page: pg.page, pageSize: pg.pageSize }),
  );
  const [create, setCreate] = useState<"individual" | "organization" | null>(null);
  const open = (id: number | string) => nav({ to: "/parties/$id", params: { id: String(id) } });
  const createAction = (
    <Can perm={P.PartyCreate}>
      <Button onClick={() => setCreate("individual")}>ثبت شخص حقیقی</Button>
      <Button variant="outline" onClick={() => setCreate("organization")}>
        ثبت شخص حقوقی
      </Button>
    </Can>
  );
  return (
    <>
      <PageHeader
        title="اشخاص"
        desc="جستجوی هویت، اطلاعات تماس و موارد مشکوک به تکرار"
        actions={createAction}
      />
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">فهرست اشخاص</TabsTrigger>
          <TabsTrigger value="duplicates">موارد مشکوک به تکرار</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <DataTable
            {...tableState(q)}
            server={pg.server(q.data?.total ?? 0)}
            rowKey={(r) => r.id}
            onRowClick={(r) => void open(r.id)}
            exportName="parties"
            emptyText="شخصی با این مشخصات پیدا نشد؛ می‌توانید شخص جدید ثبت کنید."
            emptyAction={createAction}
            columns={[
              { key: "code", header: "کد شخص" },
              { key: "name", header: "نام", filter: { type: "text", param: "name" } },
              { key: "type", header: "نوع", cell: (r) => (r.isOrganization ? "حقوقی" : "حقیقی") },
              { key: "nationalId", header: "کد / شناسه ملی", filter: { type: "text", param: "nationalId" } },
              { key: "mobile", header: "تلفن همراه", filter: { type: "text", param: "phone" } },
              { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
            actions={[{ label: "مشاهده پرونده", onClick: (r) => void open(r.id) }]}
          />
        </TabsContent>
        <TabsContent value="duplicates">
          <Duplicates />
        </TabsContent>
      </Tabs>
      <FormSheet
        key={create ?? "closed"}
        open={create !== null}
        onOpenChange={(v) => {
          if (!v) setCreate(null);
        }}
        title={create === "organization" ? "ثبت شخص حقوقی" : "ثبت شخص حقیقی"}
        fields={create === "organization" ? organization : individual}
        onSubmit={async (v) => {
          const res =
            create === "organization"
              ? await partyApi.createOrganization({
                  organizationName: rawText(v.organizationName),
                  nationalLegalId: text(v.nationalLegalId),
                  mobilePhone: text(v.mobilePhone),
                  partyCode: text(v.partyCode),
                  organizationTypeCode: text(v.organizationTypeCode),
                  registrationDate: dateOnly(v.registrationDate),
                })
              : await partyApi.createIndividual({
                  givenName: rawText(v.givenName),
                  familyName: rawText(v.familyName),
                  middleName: rawText(v.middleName),
                  nationalId: text(v.nationalId),
                  mobilePhone: text(v.mobilePhone),
                  partyCode: text(v.partyCode),
                  birthDate: dateOnly(v.birthDate),
                  genderCode: text(v.genderCode),
                });
          await qc.invalidateQueries({ queryKey: partyKeys.all });
          const id = createdId(res, "partyId");
          if (id !== undefined) await open(id);
        }}
      />
    </>
  );
}
function Duplicates() {
  const pg = usePaged({ mode: "NationalId" });
  const nav = useNavigate();
  const q = useQuery(
    duplicatePartiesQuery({ mode: pg.filters.mode, page: pg.page, pageSize: pg.pageSize }),
  );
  return (
    <>
      <label className="mb-3 flex items-center gap-3 text-sm">
        مبنای تشخیص
        <select
          className="rounded-md border bg-background p-2"
          value={pg.filters.mode}
          onChange={(e) => pg.setFilter("mode", e.target.value)}
        >
          <option value="NationalId">کد ملی</option>
          <option value="Mobile">تلفن همراه</option>
          <option value="Name">نام</option>
        </select>
      </label>
      <DataTable
        {...tableState(q)}
        server={pg.server(q.data?.total ?? 0)}
        hideSearch
        exportName="duplicate-parties"
        emptyText="مورد مشکوک به تکراری یافت نشد."
        rowKey={(r) =>
          `${str(r, "partyId", "id")}-${str(r, "candidatePartyId", "duplicatePartyId")}-${str(r, "score")}`
        }
        columns={[
          { key: "partyId", header: "شناسه شخص", cell: (r) => str(r, "partyId", "id") },
          { key: "partyCode", header: "کد شخص", cell: (r) => str(r, "partyCode") },
          { key: "name", header: "نام", cell: (r) => str(r, "name", "displayName", "fullName") },
          {
            key: "nationalId",
            header: "کد ملی",
            cell: (r) => str(r, "nationalId", "nationalLegalId"),
          },
          { key: "score", header: "امتیاز", cell: (r) => String(pick(r, "score") ?? "—") },
        ]}
        actions={[
          {
            label: "مشاهده شخص",
            show: (r) => Boolean(pick(r, "partyId", "id")),
            onClick: (r) =>
              void nav({ to: "/parties/$id", params: { id: str(r, "partyId", "id") } }),
          },
        ]}
      />
    </>
  );
}
