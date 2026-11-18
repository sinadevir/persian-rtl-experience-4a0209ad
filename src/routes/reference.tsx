import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  refApi,
  refKeys,
  refGroupsQuery,
  refItemsQuery,
  externalSystemsQuery,
  codingStandardsQuery,
  mappingsQuery,
  type RefGroup,
  type RefItem,
  type Mapping,
} from "@/features/foundation/reference";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { InfoList } from "@/components/cis/blocks";
import { StatusBadge } from "@/components/cis/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Can, useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { usePaged } from "@/lib/use-paged";
import { text, rawText, reqInt, flag, dateOnly, type FormValues } from "@/lib/form-values";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/reference")({
  head: () => seo("داده‌های مرجع", "مدیریت کدها و نگاشت سامانه‌های بیرونی"),
  component: ReferencePage,
});

const field = (name: string, label: string, extra: Partial<Field> = {}): Field => ({
  name,
  label,
  ...extra,
});
const statuses = [
  { value: "Active", label: "فعال" },
  { value: "Deprecated", label: "منسوخ" },
  { value: "Inactive", label: "غیرفعال" },
];

function Result({ value }: { value: Record<string, unknown> }) {
  return (
    <InfoList
      cols={2}
      items={Object.entries(value).map(([key, v]) => [
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
  );
}

function ReferencePage() {
  const client = useQueryClient();
  const canManage = useCan(P.ReferenceManage);
  const [group, setGroup] = useState<RefGroup>();
  const [statusItem, setStatusItem] = useState<RefItem>();
  const [editing, setEditing] = useState<Mapping>();
  const [confirmation, setConfirmation] = useState<{
    title: string;
    run: (reason: string) => Promise<unknown>;
    key: QueryKey;
  }>();
  const [resolved, setResolved] = useState<Record<string, unknown>>();

  const gp = usePaged();
  const mp = usePaged({ externalSystemCode: "", internalEntityType: "" });
  const groups = useQuery(
    refGroupsQuery({
      search: gp.search,
      page: gp.page,
      pageSize: gp.pageSize,
    }),
  );
  const items = useQuery(refItemsQuery(group?.code ?? ""));
  const systems = useQuery(externalSystemsQuery());
  const standards = useQuery(codingStandardsQuery());
  const mappings = useQuery(
    mappingsQuery({
      search: mp.search,
      page: mp.page,
      pageSize: mp.pageSize,
      externalSystemCode: mp.filters.externalSystemCode || undefined,
      internalEntityType: mp.filters.internalEntityType || undefined,
    }),
  );

  const invalidate = (queryKey: QueryKey) => client.invalidateQueries({ queryKey });
  const create = (
    title: string,
    fields: Field[],
    submit: (v: FormValues) => Promise<unknown>,
    key: QueryKey,
  ): ReactNode => (
    <Can perm={P.ReferenceManage}>
      <FormSheet
        title={title}
        trigger={<Button>{title}</Button>}
        fields={fields}
        onSubmit={async (v) => {
          await submit(v);
          await invalidate(key);
        }}
      />
    </Can>
  );

  const groupCreate = create(
    "گروه جدید",
    [
      field("groupCode", "کد گروه", { required: true, ltr: true }),
      field("groupName", "نام گروه", { required: true }),
      field("groupNameEn", "نام انگلیسی"),
      field("description", "توضیح", { type: "textarea" }),
      field("allowsCustomItems", "اجازه افزودن کد سفارشی", { type: "switch" }),
    ],
    (v) =>
      refApi.createGroup({
        groupCode: text(v.groupCode),
        groupName: rawText(v.groupName),
        groupNameEn: text(v.groupNameEn),
        description: rawText(v.description),
        allowsCustomItems: flag(v.allowsCustomItems),
      }),
    refKeys.groups,
  );

  const itemCreate =
    group &&
    create(
      "کد جدید",
      [
        field("itemCode", "کد", { required: true, ltr: true }),
        field("itemName", "نام", { required: true }),
        field("itemNameEn", "نام انگلیسی"),
        field("description", "توضیح", { type: "textarea" }),
        field("sortOrder", "ترتیب", { type: "number" }),
        field("isDefault", "پیش‌فرض", { type: "switch" }),
        field("externalCode", "کد بیرونی"),
      ],
      (v) =>
        refApi.createItem({
          referenceGroupId: group.id,
          itemCode: text(v.itemCode),
          itemName: rawText(v.itemName),
          itemNameEn: text(v.itemNameEn),
          description: rawText(v.description),
          sortOrder: reqInt(v.sortOrder),
          isDefault: flag(v.isDefault),
          externalCode: text(v.externalCode),
        }),
      refKeys.items(group.code),
    );

  const systemCreate = create(
    "سامانه جدید",
    [
      field("systemCode", "کد سامانه", { required: true }),
      field("systemName", "نام سامانه", { required: true }),
      field("systemNameEn", "نام انگلیسی"),
      field("systemType", "نوع سامانه", { required: true }),
      field("description", "توضیح", { type: "textarea" }),
      field("validFrom", "شروع اعتبار", { type: "date" }),
    ],
    (v) =>
      refApi.createSystem({
        systemCode: text(v.systemCode),
        systemName: rawText(v.systemName),
        systemNameEn: text(v.systemNameEn),
        systemType: text(v.systemType),
        description: rawText(v.description),
        validFrom: dateOnly(v.validFrom),
      }),
    refKeys.systems,
  );

  const standardCreate = create(
    "استاندارد جدید",
    [
      field("standardCode", "کد استاندارد", { required: true }),
      field("standardName", "نام استاندارد", { required: true }),
      field("standardNameEn", "نام انگلیسی"),
      field("authority", "مرجع"),
      field("description", "توضیح", { type: "textarea" }),
    ],
    (v) =>
      refApi.createStandard({
        standardCode: text(v.standardCode),
        standardName: rawText(v.standardName),
        standardNameEn: text(v.standardNameEn),
        authority: rawText(v.authority),
        description: rawText(v.description),
      }),
    refKeys.standards,
  );

  const mappingCreate = create(
    "نگاشت جدید",
    [
      field("externalSystemCode", "کد سامانه بیرونی", { required: true }),
      field("codingStandardCode", "کد استاندارد"),
      field("internalEntityType", "نوع موجودیت داخلی", { required: true }),
      field("internalGroupCode", "کد گروه داخلی"),
      field("internalCode", "کد داخلی", { required: true }),
      field("externalCode", "کد بیرونی", { required: true }),
      field("externalName", "نام بیرونی"),
      field("direction", "جهت نگاشت", {
        required: true,
        hint: "مقدار مورد قبول سامانه مرکزی را وارد کنید.",
      }),
      field("description", "توضیح", { type: "textarea" }),
      field("validFrom", "شروع اعتبار", { type: "date", required: true }),
    ],
    (v) =>
      refApi.createMapping({
        externalSystemCode: text(v.externalSystemCode),
        codingStandardCode: text(v.codingStandardCode),
        internalEntityType: text(v.internalEntityType),
        internalGroupCode: text(v.internalGroupCode),
        internalCode: text(v.internalCode),
        externalCode: text(v.externalCode),
        externalName: rawText(v.externalName),
        direction: text(v.direction),
        description: rawText(v.description),
        validFrom: dateOnly(v.validFrom),
      }),
    refKeys.mappings,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="داده‌های مرجع" desc="کدها، استانداردها و ارتباط با سامانه‌های بیرونی" />
      <Tabs defaultValue="groups">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="groups">گروه‌های کد</TabsTrigger>
          <TabsTrigger value="systems">سامانه‌های بیرونی</TabsTrigger>
          <TabsTrigger value="standards">استانداردهای کدگذاری</TabsTrigger>
          <TabsTrigger value="mappings">نگاشت کدها</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <DataTable
            rows={groups.data?.items ?? []}
            loading={groups.isPending}
            fetching={groups.isFetching}
            error={groups.error ?? undefined}
            onRetry={() => void groups.refetch()}
            server={gp.server(groups.data?.total ?? 0)}
            rowKey={(r) => r.id}
            onRowClick={setGroup}
            columns={[
              { key: "code", header: "کد" },
              { key: "name", header: "نام" },
              { key: "description", header: "توضیح" },
            ]}
            toolbar={groupCreate}
            emptyAction={groupCreate}
            emptyText="گروهی ثبت نشده است."
            exportName="reference-groups"
          />
          {group ? (
            <section className="space-y-3 rounded-lg border p-4">
              <h2 className="font-semibold">کدهای گروه {group.name}</h2>
              <DataTable
                key={group.code}
                rows={items.data ?? []}
                loading={items.isPending}
                error={items.error ?? undefined}
                onRetry={() => void items.refetch()}
                rowKey={(r) => r.id}
                columns={[
                  { key: "code", header: "کد" },
                  { key: "name", header: "نام" },
                  {
                    key: "status",
                    header: "وضعیت",
                    cell: (r) => <StatusBadge status={r.status} />,
                  },
                  { key: "sortOrder", header: "ترتیب" },
                ]}
                actions={
                  canManage
                    ? [
                        {
                          label: "تغییر وضعیت",
                          onClick: setStatusItem,
                        },
                      ]
                    : []
                }
                toolbar={itemCreate}
                emptyAction={itemCreate}
                emptyText="این گروه هنوز کدی ندارد."
                exportName="reference-items"
              />
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">برای دیدن کدها یک گروه را انتخاب کنید.</p>
          )}
        </TabsContent>

        <TabsContent value="systems">
          <DataTable
            rows={systems.data ?? []}
            loading={systems.isPending}
            error={systems.error ?? undefined}
            onRetry={() => void systems.refetch()}
            rowKey={(r) => r.id}
            columns={[
              { key: "code", header: "کد" },
              { key: "name", header: "نام" },
              { key: "type", header: "نوع" },
              { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
            actions={
              canManage
                ? [
                    {
                      label: "غیرفعال‌سازی",
                      destructive: true,
                      show: (r) => r.status === "Active",
                      onClick: (r) =>
                        setConfirmation({
                          title: `غیرفعال‌سازی ${r.name}`,
                          key: refKeys.systems,
                          run: (reason) =>
                            refApi.deactivateSystem(r.id, {
                              expectedRowVersion: r.rowVersion,
                              changeReason: reason,
                            }),
                        }),
                    },
                  ]
                : []
            }
            toolbar={systemCreate}
            emptyAction={systemCreate}
            emptyText="سامانه‌ای ثبت نشده است."
            exportName="external-systems"
          />
        </TabsContent>

        <TabsContent value="standards">
          <DataTable
            rows={standards.data ?? []}
            loading={standards.isPending}
            error={standards.error ?? undefined}
            onRetry={() => void standards.refetch()}
            rowKey={(r) => r.id}
            columns={[
              { key: "code", header: "کد" },
              { key: "name", header: "نام" },
              { key: "authority", header: "مرجع" },
              { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
            actions={
              canManage
                ? [
                    {
                      label: "غیرفعال‌سازی",
                      destructive: true,
                      show: (r) => r.status === "Active",
                      onClick: (r) =>
                        setConfirmation({
                          title: `غیرفعال‌سازی ${r.name}`,
                          key: refKeys.standards,
                          run: (reason) =>
                            refApi.deactivateStandard(r.id, {
                              expectedRowVersion: r.rowVersion,
                              changeReason: reason,
                            }),
                        }),
                    },
                  ]
                : []
            }
            toolbar={standardCreate}
            emptyAction={standardCreate}
            emptyText="استانداردی ثبت نشده است."
            exportName="coding-standards"
          />
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <DataTable
            rows={mappings.data?.items ?? []}
            loading={mappings.isPending}
            fetching={mappings.isFetching}
            error={mappings.error ?? undefined}
            onRetry={() => void mappings.refetch()}
            server={mp.server(mappings.data?.total ?? 0)}
            rowKey={(r) => r.id}
            columns={[
              { key: "system", header: "سامانه", filter: { type: "text", param: "externalSystemCode" } },
              { key: "entityType", header: "نوع موجودیت", filter: { type: "text", param: "internalEntityType" } },
              { key: "internalCode", header: "کد داخلی" },
              { key: "externalCode", header: "کد بیرونی" },
              { key: "externalName", header: "نام بیرونی" },
              { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
            actions={canManage ? [{ label: "ویرایش", onClick: setEditing }] : []}
            toolbar={mappingCreate}
            emptyAction={mappingCreate}
            emptyText="نگاشتی با این شرایط پیدا نشد."
            exportName="code-mappings"
          />
        </TabsContent>
      </Tabs>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">ترجمه کد بیرونی</h2>
        <Can perm={P.ReferenceManage}>
          <FormSheet
            title="ترجمه کد بیرونی"
            trigger={<Button variant="outline">بررسی کد</Button>}
            submitLabel="بررسی"
            successMessage={null}
            fields={[
              field("externalSystemCode", "کد سامانه بیرونی", { required: true }),
              field("externalCode", "کد بیرونی", { required: true }),
              field("internalEntityType", "نوع موجودیت داخلی", { required: true }),
              field("internalGroupCode", "کد گروه داخلی"),
            ]}
            onSubmit={async (v) => {
              const result = await refApi.resolveExternal({
                externalSystemCode: text(v.externalSystemCode)!,
                externalCode: text(v.externalCode)!,
                internalEntityType: text(v.internalEntityType)!,
                internalGroupCode: text(v.internalGroupCode),
              });
              setResolved(result);
            }}
          />
        </Can>
        {resolved && <Result value={resolved} />}
      </section>

      <Can perm={P.ReferenceManage}>
        {statusItem && (
          <FormSheet
            key={statusItem.id}
            title="تغییر وضعیت کد"
            open
            onOpenChange={(open) => {
              if (!open) setStatusItem(undefined);
            }}
            initial={{ status: statusItem.status }}
            fields={[
              field("status", "وضعیت", { type: "select", required: true, options: statuses }),
              field("changeReason", "دلیل تغییر", { type: "textarea", required: true }),
            ]}
            onSubmit={async (v) => {
              await refApi.changeItemStatus(statusItem.id, {
                status: text(v.status),
                changeReason: rawText(v.changeReason),
                expectedRowVersion: statusItem.rowVersion,
              });
              await invalidate(refKeys.items(group?.code ?? ""));
            }}
          />
        )}
        {editing && (
          <FormSheet
            key={editing.id}
            title="ویرایش نگاشت"
            open
            onOpenChange={(open) => {
              if (!open) setEditing(undefined);
            }}
            initial={{
              externalName: editing.externalName,
              status: editing.status,
              validTo: editing.validTo ? new Date(editing.validTo) : undefined,
            }}
            fields={[
              field("externalName", "نام بیرونی"),
              field("description", "توضیح جدید", {
                type: "textarea",
                hint: "توضیح فعلی در پاسخ فهرست موجود نیست؛ توضیح جایگزین را وارد کنید.",
              }),
              field("status", "وضعیت", { type: "select", required: true, options: statuses }),
              field("validTo", "پایان اعتبار", { type: "date" }),
            ]}
            onSubmit={async (v) => {
              await refApi.updateMapping(editing.id, {
                externalName: rawText(v.externalName),
                description: rawText(v.description),
                status: text(v.status),
                validTo: dateOnly(v.validTo),
                expectedRowVersion: editing.rowVersion,
              });
              await invalidate(refKeys.mappings);
            }}
          />
        )}
        <ConfirmAction
          open={!!confirmation}
          onOpenChange={(open) => {
            if (!open) setConfirmation(undefined);
          }}
          title={confirmation?.title ?? "غیرفعال‌سازی"}
          destructive
          requireReason
          description="این تغییر در سامانه مرکزی ثبت می‌شود."
          onConfirm={async (reason) => {
            if (!confirmation) return;
            await confirmation.run(reason);
            await invalidate(confirmation.key);
          }}
        />
      </Can>
    </div>
  );
}
