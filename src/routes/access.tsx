import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  accessApi,
  accessKeys,
  usersQuery,
  userRolesQuery,
  rolesQuery,
  rolePermissionsQuery,
  permissionsQuery,
  sodRulesQuery,
  type User,
  type Role,
} from "@/features/foundation/access";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { InfoList } from "@/components/cis/blocks";
import { StatusBadge } from "@/components/cis/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Can, useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { usePaged } from "@/lib/use-paged";
import { text, rawText, int, reqInt, isoDate, type FormValues } from "@/lib/form-values";
import { toJalali } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/access")({
  head: () => seo("مدیریت دسترسی", "کاربران، نقش‌ها، مجوزها و تفکیک وظایف"),
  component: AccessPage,
});

const f = (name: string, label: string, extra: Partial<Field> = {}): Field => ({
  name,
  label,
  ...extra,
});

function AccessPage() {
  const client = useQueryClient();
  const manage = useCan(P.AccessManage);
  const pg = usePaged();
  const [user, setUser] = useState<User>();
  const [role, setRole] = useState<Role>();
  const [moduleCode, setModuleCode] = useState("");
  const [evaluation, setEvaluation] = useState<Record<string, unknown>>();
  const [confirmation, setConfirmation] = useState<{
    title: string;
    run: () => Promise<unknown>;
    key: QueryKey;
  }>();

  const users = useQuery(
    usersQuery({
      search: pg.search,
      page: pg.page,
      pageSize: pg.pageSize,
    }),
  );
  const userRoles = useQuery(userRolesQuery(user?.id ?? 0));
  const roles = useQuery(rolesQuery());
  const rolePermissions = useQuery(rolePermissionsQuery(role?.id ?? 0));
  const permissions = useQuery(permissionsQuery({ moduleCode: moduleCode || undefined }));
  const sod = useQuery(sodRulesQuery());

  const invalidate = (queryKey: QueryKey) => client.invalidateQueries({ queryKey });
  const create = (
    title: string,
    fields: Field[],
    submit: (v: FormValues) => Promise<unknown>,
    key: QueryKey,
  ): ReactNode => (
    <Can perm={P.AccessManage}>
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

  const createUser = create(
    "کاربر جدید",
    [
      f("userName", "نام کاربری", { required: true, ltr: true }),
      f("displayName", "نام نمایشی", { required: true }),
      f("nationalId", "کد ملی", { rule: "nationalId" }),
      f("mobilePhone", "تلفن همراه", { rule: "mobile" }),
      f("email", "رایانامه", {
        ltr: true,
        validate: (v) =>
          text(v) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(v)!)
            ? "رایانامه معتبر وارد کنید."
            : undefined,
      }),
      f("defaultCompanyId", "شرکت پیش‌فرض", { type: "entity", entity: "company" }),
      f("defaultOrganizationalUnitId", "شناسه واحد سازمانی پیش‌فرض", { type: "number" }),
    ],
    (v) =>
      accessApi.createUser({
        userName: text(v.userName),
        displayName: rawText(v.displayName),
        nationalId: text(v.nationalId),
        mobilePhone: text(v.mobilePhone),
        email: text(v.email),
        defaultCompanyId: int(v.defaultCompanyId),
        defaultOrganizationalUnitId: int(v.defaultOrganizationalUnitId),
      }),
    accessKeys.users,
  );

  const createRole = create(
    "نقش جدید",
    [
      f("roleCode", "کد نقش", { required: true }),
      f("roleName", "نام نقش", { required: true }),
      f("roleNameEn", "نام انگلیسی"),
      f("description", "توضیح", { type: "textarea" }),
    ],
    (v) =>
      accessApi.createRole({
        roleCode: text(v.roleCode),
        roleName: rawText(v.roleName),
        roleNameEn: text(v.roleNameEn),
        description: rawText(v.description),
      }),
    accessKeys.roles,
  );

  const createPermission = create(
    "مجوز جدید",
    [
      f("permissionCode", "کد مجوز", { required: true }),
      f("permissionName", "نام مجوز", { required: true }),
      f("moduleCode", "کد ماژول", { required: true }),
      f("description", "توضیح", { type: "textarea" }),
    ],
    (v) =>
      accessApi.createPermission({
        permissionCode: text(v.permissionCode),
        permissionName: rawText(v.permissionName),
        moduleCode: text(v.moduleCode),
        description: rawText(v.description),
      }),
    accessKeys.perms,
  );

  const createSod = create(
    "قاعده جدید",
    [
      f("roleCodeA", "کد نقش اول", { required: true }),
      f("roleCodeB", "کد نقش دوم", {
        required: true,
        validate: (v, all) =>
          text(v) === text(all.roleCodeA) ? "دو نقش باید متفاوت باشند." : undefined,
      }),
      f("description", "توضیح", { type: "textarea" }),
    ],
    (v) =>
      accessApi.createSod({
        roleCodeA: text(v.roleCodeA),
        roleCodeB: text(v.roleCodeB),
        description: rawText(v.description),
      }),
    accessKeys.sod,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="مدیریت دسترسی" />
      <Tabs defaultValue="users">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="users">کاربران</TabsTrigger>
          <TabsTrigger value="roles">نقش‌ها</TabsTrigger>
          <TabsTrigger value="permissions">مجوزها</TabsTrigger>
          <TabsTrigger value="sod">تفکیک وظایف</TabsTrigger>
          <TabsTrigger value="evaluate">ارزیابی دسترسی</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <DataTable
            rows={users.data?.items ?? []}
            loading={users.isPending}
            fetching={users.isFetching}
            error={users.error ?? undefined}
            onRetry={() => void users.refetch()}
            server={pg.server(users.data?.total ?? 0)}
            rowKey={(r) => r.id}
            onRowClick={setUser}
            columns={[
              { key: "userName", header: "نام کاربری" },
              { key: "displayName", header: "نام" },
              { key: "nationalId", header: "کد ملی" },
              { key: "mobile", header: "تلفن همراه" },
              { key: "status", header: "وضعیت", cell: (r) => <StatusBadge status={r.status} /> },
            ]}
            toolbar={createUser}
            emptyAction={createUser}
            emptyText="کاربری پیدا نشد."
            exportName="users"
          />
          {user ? (
            <section className="space-y-3 rounded-lg border p-4">
              <h2 className="font-semibold">نقش‌های {user.displayName || user.userName}</h2>
              <DataTable
                key={user.id}
                rows={userRoles.data ?? []}
                loading={userRoles.isPending}
                error={userRoles.error ?? undefined}
                onRetry={() => void userRoles.refetch()}
                rowKey={(r) => r.id}
                columns={[
                  { key: "roleName", header: "نقش" },
                  { key: "companyId", header: "شناسه شرکت" },
                  { key: "unitId", header: "شناسه واحد" },
                  { key: "from", header: "شروع", cell: (r) => (r.from ? toJalali(r.from) : "—") },
                  { key: "to", header: "پایان", cell: (r) => (r.to ? toJalali(r.to) : "—") },
                  {
                    key: "active",
                    header: "وضعیت",
                    cell: (r) => <StatusBadge status={r.active ? "Active" : "Inactive"} />,
                  },
                ]}
                actions={
                  manage
                    ? [
                        {
                          label: "لغو نقش",
                          destructive: true,
                          show: (r) => r.active,
                          onClick: (r) =>
                            setConfirmation({
                              title: `لغو نقش ${r.roleName}`,
                              key: accessKeys.users,
                              run: () => accessApi.revokeRole(r.id),
                            }),
                        },
                      ]
                    : []
                }
                toolbar={create(
                  "تخصیص نقش",
                  [
                    f("roleId", "نقش", { type: "entity", entity: "role", required: true }),
                    f("companyId", "شرکت", { type: "entity", entity: "company" }),
                    f("organizationalUnitId", "شناسه واحد سازمانی", { type: "number" }),
                    f("effectiveFrom", "شروع اعتبار", { type: "date", required: true }),
                    f("effectiveTo", "پایان اعتبار", {
                      type: "date",
                      validate: (v, all) =>
                        v instanceof Date &&
                        all.effectiveFrom instanceof Date &&
                        v < all.effectiveFrom
                          ? "پایان اعتبار نباید پیش از شروع باشد."
                          : undefined,
                    }),
                  ],
                  (v) =>
                    accessApi.assignRole({
                      userId: user.id,
                      roleId: reqInt(v.roleId),
                      companyId: int(v.companyId),
                      organizationalUnitId: int(v.organizationalUnitId),
                      effectiveFrom: isoDate(v.effectiveFrom),
                      effectiveTo: isoDate(v.effectiveTo),
                    }),
                  accessKeys.users,
                )}
                emptyText="نقشی به این کاربر تخصیص داده نشده است."
                exportName="user-roles"
              />
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              برای مشاهده و تخصیص نقش، یک کاربر را انتخاب کنید.
            </p>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <DataTable
            rows={roles.data ?? []}
            loading={roles.isPending}
            error={roles.error ?? undefined}
            onRetry={() => void roles.refetch()}
            rowKey={(r) => r.id}
            onRowClick={setRole}
            columns={[
              { key: "code", header: "کد" },
              { key: "name", header: "نام" },
              { key: "description", header: "توضیح" },
            ]}
            toolbar={createRole}
            emptyAction={createRole}
            emptyText="نقشی ثبت نشده است."
            exportName="roles"
          />
          {role ? (
            <section className="space-y-3 rounded-lg border p-4">
              <h2 className="font-semibold">مجوزهای نقش {role.name}</h2>
              <DataTable
                key={role.id}
                rows={rolePermissions.data ?? []}
                loading={rolePermissions.isPending}
                error={rolePermissions.error ?? undefined}
                onRetry={() => void rolePermissions.refetch()}
                rowKey={(r) => r.id}
                columns={[
                  { key: "code", header: "کد مجوز" },
                  { key: "name", header: "نام" },
                  { key: "module", header: "ماژول" },
                ]}
                actions={
                  manage
                    ? [
                        {
                          label: "لغو مجوز",
                          destructive: true,
                          onClick: (r) =>
                            setConfirmation({
                              title: `لغو مجوز ${r.name}`,
                              key: accessKeys.roles,
                              run: () => accessApi.revokePermission(role.id, r.id),
                            }),
                        },
                      ]
                    : []
                }
                toolbar={create(
                  "اعطای مجوز",
                  [
                    f("permissionId", "مجوز", {
                      type: "entity",
                      entity: "permission",
                      required: true,
                    }),
                  ],
                  (v) =>
                    accessApi.grant({
                      roleId: role.id,
                      permissionId: reqInt(v.permissionId),
                    }),
                  accessKeys.roles,
                )}
                emptyText="این نقش مجوزی ندارد."
                exportName="role-permissions"
              />
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              برای مشاهده مجوزها یک نقش را انتخاب کنید.
            </p>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Input
            aria-label="کد ماژول"
            placeholder="فیلتر کد ماژول"
            value={moduleCode}
            onChange={(e) => setModuleCode(e.target.value)}
          />
          <DataTable
            rows={permissions.data ?? []}
            loading={permissions.isPending}
            error={permissions.error ?? undefined}
            onRetry={() => void permissions.refetch()}
            rowKey={(r) => r.id}
            columns={[
              { key: "code", header: "کد" },
              { key: "name", header: "نام" },
              { key: "module", header: "ماژول" },
              { key: "description", header: "توضیح" },
            ]}
            toolbar={createPermission}
            emptyAction={createPermission}
            emptyText="مجوزی با این شرایط پیدا نشد."
            exportName="permissions"
          />
        </TabsContent>

        <TabsContent value="sod">
          <DataTable
            rows={sod.data ?? []}
            loading={sod.isPending}
            error={sod.error ?? undefined}
            onRetry={() => void sod.refetch()}
            rowKey={(r) => r.id}
            columns={[
              { key: "a", header: "نقش اول" },
              { key: "b", header: "نقش دوم" },
              { key: "description", header: "توضیح" },
              {
                key: "active",
                header: "وضعیت",
                cell: (r) => <StatusBadge status={r.active ? "Active" : "Inactive"} />,
              },
            ]}
            actions={
              manage
                ? [
                    {
                      label: "غیرفعال‌سازی",
                      destructive: true,
                      show: (r) => r.active,
                      onClick: (r) =>
                        setConfirmation({
                          title: "غیرفعال‌سازی قاعده تفکیک وظایف",
                          key: accessKeys.sod,
                          run: () => accessApi.deactivateSod(r.id),
                        }),
                    },
                  ]
                : []
            }
            toolbar={createSod}
            emptyAction={createSod}
            emptyText="قاعده‌ای ثبت نشده است."
            exportName="segregation-rules"
          />
        </TabsContent>

        <TabsContent value="evaluate" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            نتیجه بر اساس سیاست‌های جاری سرور و محدوده درخواست محاسبه می‌شود.
          </p>
          <Can perm={P.AccessManage}>
            <FormSheet
              title="ارزیابی دسترسی"
              trigger={<Button>ارزیابی جدید</Button>}
              submitLabel="ارزیابی"
              successMessage={null}
              fields={[
                f("permissionCode", "کد مجوز", { required: true }),
                f("userId", "کاربر", { type: "entity", entity: "user" }),
                f("companyId", "شرکت", { type: "entity", entity: "company" }),
                f("organizationalUnitId", "شناسه واحد سازمانی", { type: "number" }),
                f("resourceType", "نوع منبع"),
                f("resourceId", "شناسه منبع", { type: "number" }),
                f("evaluationTime", "زمان ارزیابی", {
                  type: "date",
                  hint: "در صورت خالی بودن، زمان جاری سرور ملاک است.",
                }),
              ]}
              onSubmit={async (v) => {
                setEvaluation(
                  await accessApi.evaluate({
                    permissionCode: text(v.permissionCode),
                    userId: int(v.userId),
                    companyId: int(v.companyId),
                    organizationalUnitId: int(v.organizationalUnitId),
                    resourceType: text(v.resourceType),
                    resourceId: int(v.resourceId),
                    evaluationTime: isoDate(v.evaluationTime),
                  }),
                );
              }}
            />
          </Can>
          {evaluation && (
            <InfoList
              cols={2}
              items={Object.entries(evaluation).map(([key, v]) => [
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
        </TabsContent>
      </Tabs>

      <Can perm={P.AccessManage}>
        <ConfirmAction
          open={!!confirmation}
          onOpenChange={(open) => {
            if (!open) setConfirmation(undefined);
          }}
          title={confirmation?.title ?? "تأیید عملیات"}
          destructive
          description="این تغییر بلافاصله در دسترسی‌های سامانه اعمال می‌شود."
          onConfirm={async () => {
            if (!confirmation) return;
            await confirmation.run();
            await invalidate(confirmation.key);
          }}
        />
      </Can>
    </div>
  );
}
