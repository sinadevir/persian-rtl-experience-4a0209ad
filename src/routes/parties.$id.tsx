import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/cis/app-shell";
import { InfoList } from "@/components/cis/blocks";
import { DataTable, tableState } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { QueryBoundary } from "@/components/cis/query-state";
import { StatusBadge } from "@/components/cis/status-badge";
import { Can, useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import {
  partyQuery,
  partyContactsQuery,
  partyIdentityHistoryQuery,
  partyKeys,
  partyApi,
  type Party,
  type Contact,
} from "@/features/parties/api";
import { partyRelationshipsQuery, partyAuthorizationsQuery } from "@/features/relationships/api";
import { rawText, text, reqInt, isoDate, dateOnly, flag } from "@/lib/form-values";
import { usePaged } from "@/lib/use-paged";
import { toJalali, toJalaliDateTime } from "@/lib/jalali";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/parties/$id")({
  head: () => seo("پرونده شخص", "هویت، اطلاعات تماس، روابط و اختیارات شخص"),
  component: PartyPage,
});
function PartyPage() {
  const { id } = Route.useParams();
  const q = useQuery(partyQuery(id));
  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2">
        <Link to="/parties">
          <ArrowRight />
          بازگشت به اشخاص
        </Link>
      </Button>
      <QueryBoundary query={q}>{(row) => <PartyDetail key={row.id} row={row} />}</QueryBoundary>
    </>
  );
}
type Action = "identity" | "identifier" | "verification" | "merge";
function PartyDetail({ row }: { row: Party }) {
  const qc = useQueryClient();
  const [action, setAction] = useState<Action | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: partyKeys.all });
  const forms: Record<Action, { title: string; fields: Field[] }> = {
    identity: {
      title: "ویرایش هویت",
      fields: [
        ...(row.isOrganization
          ? [{ name: "organizationName", label: "نام سازمان", required: true }]
          : [
              { name: "givenName", label: "نام", required: true },
              { name: "middleName", label: "نام میانی" },
              { name: "familyName", label: "نام خانوادگی", required: true },
            ]),
        { name: "reason", label: "دلیل تغییر", type: "textarea", required: true },
      ],
    },
    identifier: {
      title: "افزودن شناسه",
      fields: [
        {
          name: "identifierTypeCode",
          label: "نوع شناسه",
          type: "ref",
          refGroup: "IdentifierType",
          required: true,
        },
        { name: "identifierValue", label: "مقدار شناسه", required: true, ltr: true },
        { name: "issuedAt", label: "تاریخ صدور", type: "date" },
        { name: "expiresAt", label: "تاریخ انقضا", type: "date" },
      ],
    },
    verification: {
      title: "درخواست احراز هویت",
      fields: [
        { name: "verificationSubjectType", label: "نوع موضوع احراز", required: true },
        { name: "providerCode", label: "کد ارائه‌دهنده", required: true, ltr: true },
      ],
    },
    merge: {
      title: "ادغام در شخص دیگر",
      fields: [
        {
          name: "targetPartyId",
          label: "شخص مقصد",
          type: "entity",
          entity: "party",
          required: true,
          validate: (v) =>
            Number(v) === row.id ? "شخص مقصد باید با شخص فعلی متفاوت باشد" : undefined,
        },
      ],
    },
  };
  return (
    <>
      <PageHeader
        title={row.name}
        desc={`کد شخص: ${row.code || "—"}`}
        actions={
          <>
            <Can perm={P.PartyUpdate}>
              {(["identity", "identifier", "verification"] as const).map((a) => (
                <Button key={a} variant="outline" onClick={() => setAction(a)}>
                  {forms[a].title}
                </Button>
              ))}
            </Can>
            <Can perm={P.PartyMerge}>
              <Button variant="destructive" onClick={() => setAction("merge")}>
                ادغام در شخص دیگر
              </Button>
            </Can>
          </>
        }
      />
      <InfoList
        cols={2}
        items={[
          ["نوع شخص", row.isOrganization ? "حقوقی" : "حقیقی"],
          ["کد / شناسه ملی", row.nationalId || "—"],
          ["وضعیت", <StatusBadge status={row.status} />],
          ["تلفن همراه", row.mobile || "—"],
          ["تاریخ تولد", toJalali(row.birthDate)],
          ["ثبت پرونده", toJalaliDateTime(row.createdAt)],
          ...(row.mergedInto
            ? [
                [
                  "ادغام‌شده در",
                  <Link
                    className="text-primary underline"
                    to="/parties/$id"
                    params={{ id: String(row.mergedInto) }}
                  >
                    پرونده شخص مقصد
                  </Link>,
                ] as [string, ReactNode],
              ]
            : []),
        ]}
      />
      <Tabs defaultValue="contacts" className="mt-6">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="contacts">اطلاعات تماس</TabsTrigger>
          <TabsTrigger value="history">تاریخچه هویت</TabsTrigger>
          <TabsTrigger value="relations">روابط</TabsTrigger>
          <TabsTrigger value="authorizations">اختیارات</TabsTrigger>
        </TabsList>
        <TabsContent value="contacts">
          <Contacts id={row.id} />
        </TabsContent>
        <TabsContent value="history">
          <IdentityHistory id={row.id} />
        </TabsContent>
        <TabsContent value="relations">
          <PartyRelations id={row.id} />
        </TabsContent>
        <TabsContent value="authorizations">
          <PartyAuthorizations id={row.id} />
        </TabsContent>
      </Tabs>
      <FormSheet
        key={action ?? "closed"}
        open={action !== null}
        onOpenChange={(v) => {
          if (!v) setAction(null);
        }}
        title={action ? forms[action].title : "عملیات شخص"}
        description={
          action === "merge"
            ? "هشدار: سوابق این شخص در شخص مقصد ادغام می‌شود. پیش از ثبت، هویت مقصد را با دقت بررسی کنید؛ این عملیات قابل بازگشت از این صفحه نیست."
            : undefined
        }
        fields={action ? forms[action].fields : []}
        initial={
          action === "identity"
            ? {
                givenName: row.givenName,
                middleName: row.middleName,
                familyName: row.familyName,
                organizationName: row.organizationName,
              }
            : {}
        }
        onSubmit={async (v) => {
          if (action === "identity")
            await partyApi.update(row.id, {
              expectedRowVersion: row.rowVersion,
              reason: rawText(v.reason),
              ...(row.isOrganization
                ? { organizationName: rawText(v.organizationName) }
                : {
                    givenName: rawText(v.givenName),
                    middleName: rawText(v.middleName),
                    familyName: rawText(v.familyName),
                  }),
            });
          if (action === "identifier")
            await partyApi.addIdentifier(row.id, {
              identifierTypeCode: text(v.identifierTypeCode),
              identifierValue: text(v.identifierValue),
              issuedAt: dateOnly(v.issuedAt),
              expiresAt: dateOnly(v.expiresAt),
            });
          if (action === "verification")
            await partyApi.requestVerification(row.id, {
              verificationSubjectType: text(v.verificationSubjectType),
              providerCode: text(v.providerCode),
              idempotencyKey: crypto.randomUUID(),
            });
          if (action === "merge")
            await partyApi.merge(row.id, { targetPartyId: reqInt(v.targetPartyId) });
          await refresh();
        }}
      />
    </>
  );
}
function Contacts({ id }: { id: number }) {
  const q = useQuery(partyContactsQuery(id));
  const qc = useQueryClient();
  const can = useCan(P.PartyUpdate);
  const [primary, setPrimary] = useState<Contact | null>(null);
  const [end, setEnd] = useState<Contact | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: partyKeys.one(id) });
  const add = (
    <Can perm={P.PartyUpdate}>
      <FormSheet
        title="افزودن اطلاعات تماس"
        trigger={<Button>افزودن تماس</Button>}
        fields={[
          {
            name: "contactType",
            label: "نوع تماس",
            type: "ref",
            refGroup: "ContactType",
            required: true,
          },
          { name: "contactValue", label: "اطلاعات تماس", required: true },
          { name: "isPrimary", label: "تماس اصلی", type: "switch" },
          { name: "validFrom", label: "شروع اعتبار", type: "date" },
        ]}
        onSubmit={async (v) => {
          await partyApi.addContact(id, {
            contactType: text(v.contactType),
            contactValue: rawText(v.contactValue),
            isPrimary: flag(v.isPrimary),
            validFrom: isoDate(v.validFrom),
          });
          await refresh();
        }}
      />
    </Can>
  );
  return (
    <>
      <DataTable
        rows={q.data ?? []}
        loading={q.isPending}
        error={q.error ?? undefined}
        onRetry={() => q.refetch()}
        rowKey={(r) => r.id}
        exportName="party-contacts"
        toolbar={add}
        emptyText="اطلاعات تماسی ثبت نشده است؛ یک راه تماس اضافه کنید."
        emptyAction={add}
        columns={[
          { key: "type", header: "نوع تماس" },
          { key: "value", header: "مقدار" },
          { key: "isPrimary", header: "اصلی", cell: (r) => (r.isPrimary ? "بله" : "خیر") },
          { key: "validFrom", header: "شروع اعتبار", cell: (r) => toJalaliDateTime(r.validFrom) },
          { key: "validTo", header: "پایان اعتبار", cell: (r) => toJalaliDateTime(r.validTo) },
        ]}
        actions={[
          {
            label: "انتخاب به‌عنوان اصلی",
            show: (r) => can && !r.validTo && !r.isPrimary,
            onClick: setPrimary,
          },
          { label: "پایان تماس", show: (r) => can && !r.validTo, onClick: setEnd },
        ]}
      />
      <ConfirmAction
        open={primary !== null}
        onOpenChange={(v) => {
          if (!v) setPrimary(null);
        }}
        title="انتخاب تماس اصلی"
        description="این راه تماس از اکنون تماس اصلی شخص خواهد بود."
        onConfirm={async () => {
          if (!primary) return;
          await partyApi.setPrimaryContact(id, primary.id, {
            effectiveAt: new Date().toISOString(),
          });
          await refresh();
        }}
      />
      <FormSheet
        key={end?.id ?? "end"}
        open={end !== null}
        onOpenChange={(v) => {
          if (!v) setEnd(null);
        }}
        title="پایان اعتبار تماس"
        fields={[
          { name: "effectiveAt", label: "زمان پایان", type: "date", required: true },
          { name: "reason", label: "دلیل", type: "textarea", required: true },
        ]}
        onSubmit={async (v) => {
          if (!end) return;
          await partyApi.endContact(id, end.id, {
            effectiveAt: isoDate(v.effectiveAt)!,
            reason: rawText(v.reason),
          });
          await refresh();
        }}
      />
    </>
  );
}
function IdentityHistory({ id }: { id: number }) {
  const q = useQuery(partyIdentityHistoryQuery(id));
  return (
    <DataTable
      rows={q.data ?? []}
      loading={q.isPending}
      error={q.error ?? undefined}
      onRetry={() => q.refetch()}
      rowKey={(r) => r.id}
      emptyText="تغییر هویتی ثبت نشده است."
      exportName="party-identity-history"
      columns={[
        { key: "at", header: "زمان تغییر", cell: (r) => toJalaliDateTime(r.at) },
        { key: "before", header: "پیش از تغییر" },
        { key: "after", header: "پس از تغییر" },
        { key: "reason", header: "دلیل" },
        { key: "by", header: "ثبت‌کننده" },
      ]}
    />
  );
}
function PartyRelations({ id }: { id: number }) {
  const pg = usePaged();
  const q = useQuery(
    partyRelationshipsQuery(id, { search: pg.search, page: pg.page, pageSize: pg.pageSize }),
  );
  return (
    <DataTable
      {...tableState(q)}
      server={pg.server(q.data?.total ?? 0)}
      rowKey={(r) => r.id}
      exportName="party-relationships"
      emptyText="رابطه‌ای برای این شخص ثبت نشده است."
      columns={[
        { key: "typeName", header: "نوع رابطه" },
        { key: "partyName", header: "شخص" },
        {
          key: "premisesId",
          header: "ملک",
          cell: (r) =>
            r.premisesId ? (
              <Link
                to="/premises/$id"
                params={{ id: String(r.premisesId) }}
                className="text-primary underline"
              >
                مشاهده ملک
              </Link>
            ) : (
              "—"
            ),
        },
        { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
        { key: "validFrom", header: "شروع اعتبار", cell: (r) => toJalali(r.validFrom) },
        { key: "validTo", header: "پایان اعتبار", cell: (r) => toJalali(r.validTo) },
      ]}
    />
  );
}
function PartyAuthorizations({ id }: { id: number }) {
  const pg = usePaged();
  const q = useQuery(
    partyAuthorizationsQuery(id, { search: pg.search, page: pg.page, pageSize: pg.pageSize }),
  );
  return (
    <DataTable
      {...tableState(q)}
      server={pg.server(q.data?.total ?? 0)}
      rowKey={(r) => r.id}
      exportName="party-authorizations"
      emptyText="اختیاری برای این شخص ثبت نشده است."
      columns={[
        { key: "typeName", header: "نوع اختیار" },
        { key: "grantor", header: "اعطاکننده" },
        { key: "grantee", header: "دارنده اختیار" },
        { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
        { key: "validFrom", header: "شروع اعتبار", cell: (r) => toJalali(r.validFrom) },
        { key: "validTo", header: "پایان اعتبار", cell: (r) => toJalali(r.validTo) },
      ]}
    />
  );
}
