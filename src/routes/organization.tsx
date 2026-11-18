import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Building, Network, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, tableState } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { EmptyState, InfoList, TreeView, type TreeNode } from "@/components/cis/blocks";
import { StatusBadge } from "@/components/cis/status-badge";
import { ErrorState, LoadingBlock } from "@/components/cis/query-state";
import { useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import {
  appointmentsAsOfQuery, companiesQuery, companyTreeQuery, orgApi, orgKeys, positionsQuery,
  type Appointment, type Company, type OrgUnit, type Position,
} from "@/features/foundation/organization";
import { usePaged } from "@/lib/use-paged";
import { dateOnly, flag, int, isoDate, rawText, reqInt, text, type FormValues } from "@/lib/form-values";
import { toJalali } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/organization")({
  head: () => seo("ساختار سازمانی", "شرکت‌ها، واحدهای سازمانی، پست‌ها و انتصاب‌ها"),
  component: Organization,
});

const companyEditFields: Field[] = [
  { name: "companyName", label: "نام شرکت", required: true }, { name: "companyNameEn", label: "نام لاتین", ltr: true },
  { name: "companyType", label: "نوع شرکت", type: "ref", refGroup: "CompanyType" }, { name: "nationalId", label: "شناسه ملی", rule: "legalId", ltr: true },
  { name: "registrationNumber", label: "شماره ثبت", ltr: true }, { name: "establishedDate", label: "تاریخ تأسیس", type: "date" },
  { name: "parentCompanyId", label: "شرکت مادر", type: "entity", entity: "company" },
];
const companyFields: Field[] = [{ name: "companyCode", label: "کد شرکت", ltr: true, required: true }, ...companyEditFields];
const companyBody = (v: FormValues) => ({ companyName: rawText(v.companyName), companyNameEn: rawText(v.companyNameEn), companyType: text(v.companyType), nationalId: text(v.nationalId), registrationNumber: text(v.registrationNumber), establishedDate: dateOnly(v.establishedDate), parentCompanyId: int(v.parentCompanyId) });

function Organization() {
  const qc = useQueryClient();
  const canManage = useCan(P.OrganizationManage);
  const pg = usePaged();
  const q = useQuery(companiesQuery({ page: pg.page, pageSize: pg.pageSize, search: pg.search }));
  const [company, setCompany] = useState<Company | null>(null);
  const [edit, setEdit] = useState<Company | null>(null);
  const [off, setOff] = useState<Company | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: orgKeys.companies });
  return (
    <>
      <PageHeader title="ساختار سازمانی" desc="شرکت را انتخاب کنید تا نمودار واحدها، پست‌ها و انتصاب‌های آن را ببینید." />
      {!company ? (
        <>
          <DataTable<Company> {...tableState(q)} server={pg.server(q.data?.total ?? 0)} rowKey={(c) => c.id} exportName="companies" searchPlaceholder="جستجوی نام یا کد شرکت…" onRowClick={setCompany} emptyText="شرکتی ثبت نشده است"
            toolbar={canManage ? <FormSheet title="شرکت جدید" trigger={<Button size="sm" className="h-9"><Plus />شرکت جدید</Button>} fields={companyFields} successMessage="شرکت ثبت شد" onSubmit={async (v) => { await orgApi.createCompany({ companyCode: text(v.companyCode), ...companyBody(v) }); await refresh(); }} /> : undefined}
            columns={[
              { key: "code", header: "کد", cell: (c) => <span className="font-mono">{c.code}</span> }, { key: "name", header: "نام" }, { key: "type", header: "نوع" },
              { key: "nationalId", header: "شناسه ملی", cell: (c) => <span className="font-mono">{c.nationalId || "—"}</span> },
              { key: "status", header: "وضعیت", cell: (c) => <StatusBadge status={c.status || "Active"} /> },
            ]}
            actions={canManage ? [{ label: "ویرایش", onClick: setEdit }, { label: "غیرفعال‌سازی", destructive: true, show: (c) => !/inactive|deactiv/i.test(c.status), onClick: setOff }] : undefined} />
          <FormSheet open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} title={`ویرایش ${edit?.name ?? ""}`} fields={companyEditFields} successMessage="ذخیره شد"
            initial={edit ? { companyName: edit.name, companyNameEn: edit.nameEn, companyType: edit.type, nationalId: edit.nationalId, registrationNumber: edit.registrationNumber, establishedDate: edit.establishedDate ? new Date(edit.establishedDate) : undefined, parentCompanyId: edit.parentId ? String(edit.parentId) : undefined } : {}}
            onSubmit={async (v) => { await orgApi.updateCompany(edit!.id, { ...companyBody(v), expectedRowVersion: edit!.rowVersion }); await refresh(); }} />
          <ConfirmAction open={off !== null} onOpenChange={(o) => !o && setOff(null)} title={`غیرفعال‌سازی ${off?.name ?? ""}`} destructive requireReason confirmLabel="غیرفعال‌سازی"
            onConfirm={async (reason) => { await orgApi.deactivateCompany(off!.id, { expectedRowVersion: off!.rowVersion, changeReason: reason }); toast.success("شرکت غیرفعال شد"); await refresh(); }} />
        </>
      ) : <CompanyStructure company={company} onBack={() => setCompany(null)} canManage={canManage} />}
    </>
  );
}

const toNodes = (units: OrgUnit[]): TreeNode[] => units.map((u) => ({ id: String(u.id), title: u.name, badge: u.type || undefined, icon: Network, inactive: /inactive|deactiv/i.test(u.status), children: toNodes(u.children) }));
const flatten = (units: OrgUnit[]): OrgUnit[] => units.flatMap((u) => [u, ...flatten(u.children)]);

function CompanyStructure({ company, onBack, canManage }: { company: Company; onBack: () => void; canManage: boolean }) {
  const qc = useQueryClient();
  const tree = useQuery(companyTreeQuery(company.id));
  const [sel, setSel] = useState<string | undefined>();
  const nodes = useMemo(() => toNodes(tree.data ?? []), [tree.data]);
  const unit = useMemo(() => flatten(tree.data ?? []).find((u) => String(u.id) === sel), [tree.data, sel]);
  const [editUnit, setEditUnit] = useState(false);
  const [offUnit, setOffUnit] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: orgKeys.units(company.id) });
  const unitCreate = (parentUnitId?: number) => (
    <FormSheet title={parentUnitId ? `زیرواحد جدید برای ${unit?.name ?? ""}` : "واحد ریشه جدید"} trigger={<Button size="sm" variant={parentUnitId ? "outline" : "default"}><Plus />{parentUnitId ? "زیرواحد" : "واحد جدید"}</Button>} successMessage="واحد ثبت شد"
      fields={[{ name: "unitCode", label: "کد واحد", ltr: true, required: true }, { name: "unitName", label: "نام واحد", required: true }, { name: "unitNameEn", label: "نام لاتین", ltr: true }, { name: "unitType", label: "نوع واحد", type: "ref", refGroup: "OrganizationalUnitType" }]}
      onSubmit={async (v) => { await orgApi.createUnit({ companyId: company.id, parentUnitId, unitCode: text(v.unitCode), unitName: rawText(v.unitName), unitNameEn: rawText(v.unitNameEn), unitType: text(v.unitType) }); await refresh(); }} />
  );
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>← همه شرکت‌ها</Button>
        <div className="flex items-center gap-2 font-bold"><Building className="size-4 text-primary" />{company.name}</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">نمودار سازمانی</CardTitle>{canManage && unitCreate()}</CardHeader>
          <CardContent>
            {tree.isPending ? <LoadingBlock rows={5} /> : tree.error ? <ErrorState error={tree.error} onRetry={() => void tree.refetch()} compact /> : nodes.length ? <TreeView nodes={nodes} selected={sel} onSelect={(n) => setSel(n.id)} /> : <p className="py-6 text-center text-sm text-muted-foreground">واحدی تعریف نشده است.</p>}
          </CardContent>
        </Card>
        {!unit ? <EmptyState icon={Network} title="یک واحد را از نمودار انتخاب کنید">پست‌ها و انتصاب‌های آن نمایش داده می‌شود.</EmptyState> : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                <div><CardTitle className="text-base">{unit.name}</CardTitle><CardDescription className="font-mono">{unit.code}</CardDescription></div>
                {canManage && <div className="flex flex-wrap gap-2">{unitCreate(unit.id)}<Button size="sm" variant="outline" onClick={() => setEditUnit(true)}>ویرایش</Button>{!/inactive|deactiv/i.test(unit.status) && <Button size="sm" variant="outline" onClick={() => setOffUnit(true)}>غیرفعال‌سازی</Button>}</div>}
              </CardHeader>
              <CardContent><InfoList cols={3} items={[["نوع", unit.type || "—"], ["نام لاتین", unit.nameEn || "—"], ["وضعیت", <StatusBadge key="s" status={unit.status || "Active"} />], ["تعداد زیرواحد", String(unit.children.length)]]} /></CardContent>
            </Card>
            <Positions unit={unit} canManage={canManage} />
            <Appointments unit={unit} canManage={canManage} />
          </div>
        )}
      </div>
      {unit && (
        <>
          <FormSheet open={editUnit} onOpenChange={setEditUnit} title={`ویرایش ${unit.name}`} successMessage="ذخیره شد" initial={{ unitName: unit.name, unitNameEn: unit.nameEn, unitType: unit.type }}
            fields={[{ name: "unitName", label: "نام واحد", required: true }, { name: "unitNameEn", label: "نام لاتین", ltr: true }, { name: "unitType", label: "نوع واحد", type: "ref", refGroup: "OrganizationalUnitType" }]}
            onSubmit={async (v) => { await orgApi.updateUnit(unit.id, { unitName: rawText(v.unitName), unitNameEn: rawText(v.unitNameEn), unitType: text(v.unitType), expectedRowVersion: unit.rowVersion }); await refresh(); }} />
          <ConfirmAction open={offUnit} onOpenChange={setOffUnit} title={`غیرفعال‌سازی ${unit.name}`} destructive requireReason confirmLabel="غیرفعال‌سازی"
            onConfirm={async (reason) => { await orgApi.deactivateUnit(unit.id, { expectedRowVersion: unit.rowVersion, changeReason: reason }); toast.success("واحد غیرفعال شد"); await refresh(); }} />
        </>
      )}
    </>
  );
}

function Positions({ unit, canManage }: { unit: OrgUnit; canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery(positionsQuery(unit.id));
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">پست‌های سازمانی</CardTitle>
        {canManage && <FormSheet title="پست جدید" trigger={<Button size="sm" variant="outline"><Briefcase />پست جدید</Button>} successMessage="پست ثبت شد"
          fields={[{ name: "positionCode", label: "کد پست", ltr: true, required: true }, { name: "positionTitle", label: "عنوان پست", required: true }, { name: "positionTitleEn", label: "عنوان لاتین", ltr: true }, { name: "isManagerial", label: "پست مدیریتی", type: "switch" }]}
          onSubmit={async (v) => { await orgApi.createPosition({ organizationalUnitId: unit.id, positionCode: text(v.positionCode), positionTitle: rawText(v.positionTitle), positionTitleEn: rawText(v.positionTitleEn), isManagerial: flag(v.isManagerial) }); await qc.invalidateQueries({ queryKey: orgKeys.positions(unit.id) }); }} />}
      </CardHeader>
      <CardContent>
        <DataTable<Position> rows={q.data ?? []} loading={q.isPending} error={q.error ?? undefined} onRetry={() => void q.refetch()} hideSearch dense rowKey={(p) => p.id} exportName="positions" emptyText="پستی تعریف نشده است"
          columns={[{ key: "code", header: "کد", cell: (p) => <span className="font-mono">{p.code}</span> }, { key: "title", header: "عنوان" }, { key: "isManagerial", header: "مدیریتی", cell: (p) => (p.isManagerial ? <Badge variant="secondary">مدیریتی</Badge> : "—"), value: (p) => (p.isManagerial ? "بله" : "خیر") }]} />
      </CardContent>
    </Card>
  );
}

function Appointments({ unit, canManage }: { unit: OrgUnit; canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery(appointmentsAsOfQuery({ organizationalUnitId: unit.id }));
  const positions = useQuery(positionsQuery(unit.id));
  const [ending, setEnding] = useState<Appointment | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: orgKeys.appointments });
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle className="text-base">انتصاب‌های جاری</CardTitle><CardDescription>چه کسی امروز در کدام پست این واحد است</CardDescription></div>
        {canManage && <FormSheet title="انتصاب جدید" trigger={<Button size="sm" variant="outline"><UserPlus />انتصاب</Button>} successMessage="انتصاب ثبت شد" initial={{ effectiveFrom: new Date(), isPrimary: true }}
          fields={[
            { name: "positionId", label: "پست", type: "select", required: true, options: (positions.data ?? []).map((p) => ({ value: String(p.id), label: p.title })) },
            { name: "holderCode", label: "کد پرسنلی", ltr: true, required: true }, { name: "holderName", label: "نام و نام خانوادگی", required: true },
            { name: "userId", label: "کاربر سامانه", type: "entity", entity: "user" },
            { name: "effectiveFrom", label: "از تاریخ", type: "date", required: true }, { name: "effectiveTo", label: "تا تاریخ", type: "date" },
            { name: "isPrimary", label: "انتصاب اصلی", type: "switch" }, { name: "notes", label: "یادداشت", type: "textarea" },
          ]}
          onSubmit={async (v) => { await orgApi.createAppointment({ positionId: reqInt(v.positionId), organizationalUnitId: unit.id, holderCode: text(v.holderCode), holderName: rawText(v.holderName), userId: int(v.userId), effectiveFrom: isoDate(v.effectiveFrom), effectiveTo: isoDate(v.effectiveTo), isPrimary: flag(v.isPrimary), notes: rawText(v.notes) }); await refresh(); }} />}
      </CardHeader>
      <CardContent>
        <DataTable<Appointment> rows={q.data ?? []} loading={q.isPending} error={q.error ?? undefined} onRetry={() => void q.refetch()} hideSearch dense rowKey={(a) => a.id} exportName="appointments" emptyText="انتصاب جاری وجود ندارد"
          columns={[
            { key: "holderName", header: "نام" }, { key: "holderCode", header: "کد پرسنلی", cell: (a) => <span className="font-mono">{a.holderCode}</span> },
            { key: "positionTitle", header: "پست" }, { key: "from", header: "از", cell: (a) => toJalali(a.from) }, { key: "to", header: "تا", cell: (a) => toJalali(a.to) },
            { key: "isPrimary", header: "اصلی", cell: (a) => (a.isPrimary ? "✓" : ""), value: (a) => (a.isPrimary ? "بله" : "خیر") },
          ]}
          actions={canManage ? [{ label: "پایان انتصاب", destructive: true, onClick: setEnding }] : undefined} />
      </CardContent>
      <FormSheet open={ending !== null} onOpenChange={(o) => !o && setEnding(null)} title={`پایان انتصاب ${ending?.holderName ?? ""}`} successMessage="انتصاب پایان یافت" initial={{ effectiveTo: new Date() }}
        fields={[{ name: "effectiveTo", label: "تاریخ پایان", type: "date", required: true }, { name: "changeReason", label: "علت", type: "textarea", required: true }]}
        onSubmit={async (v) => { await orgApi.endAppointment(ending!.id, { expectedRowVersion: ending!.rowVersion, effectiveTo: isoDate(v.effectiveTo), changeReason: rawText(v.changeReason) }); await refresh(); }} />
    </Card>
  );
}
