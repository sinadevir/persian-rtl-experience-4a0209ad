import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable, tableState } from "@/components/cis/data-table";
import { FormSheet, type Field } from "@/components/cis/form-sheet";
import { ConfirmAction } from "@/components/cis/confirm-action";
import { EntityPicker } from "@/components/cis/entity-picker";
import { StatusBadge } from "@/components/cis/status-badge";
import { useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { divisionsQuery, geoApi, geoKeys, serviceAreasQuery, type Division, type ServiceArea } from "@/features/foundation/geography";
import { usePaged } from "@/lib/use-paged";
import { int, rawText, reqInt, text, type FormValues } from "@/lib/form-values";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/service-areas")({
  head: () => seo("محدوده‌های خدمات", "تقسیمات کشوری و محدوده‌های خدمات شرکت‌ها"),
  component: ServiceAreas,
});

function ServiceAreas() {
  return (
    <>
      <PageHeader title="محدوده‌های خدمات" desc="محدوده‌هایی که هر شرکت یا واحد در آن خدمت می‌دهد، و تقسیمات کشوری مرجع." />
      <Tabs defaultValue="areas">
        <TabsList className="mb-3"><TabsTrigger value="areas">محدوده‌های خدمات</TabsTrigger><TabsTrigger value="divisions">تقسیمات کشوری</TabsTrigger></TabsList>
        <TabsContent value="areas"><Areas /></TabsContent>
        <TabsContent value="divisions"><Divisions /></TabsContent>
      </Tabs>
    </>
  );
}

const editFields: Field[] = [
  { name: "areaName", label: "عنوان", required: true },
  { name: "administrativeDivisionId", label: "تقسیم کشوری", type: "entity", entity: "division" },
  { name: "responsibleUnitId", label: "شناسه واحد سازمانی مسئول", type: "number", hint: "از صفحه ساختار سازمانی" },
  { name: "description", label: "توضیحات", type: "textarea" },
  { name: "boundaryGeoJson", label: "مرز محدوده (GeoJSON)", type: "textarea", ltr: true, validate: (v) => { if (typeof v !== "string" || !v.trim()) return undefined; try { JSON.parse(v); return undefined; } catch { return "GeoJSON معتبر نیست"; } } },
];
const createFields: Field[] = [
  { name: "companyId", label: "شرکت", type: "entity", entity: "company", required: true },
  { name: "areaCode", label: "کد محدوده", ltr: true, required: true },
  { name: "areaType", label: "نوع محدوده", type: "ref", refGroup: "ServiceAreaType", required: true },
  ...editFields,
];
const body = (v: FormValues) => ({ areaName: rawText(v.areaName), administrativeDivisionId: int(v.administrativeDivisionId), responsibleUnitId: int(v.responsibleUnitId), description: rawText(v.description), boundaryGeoJson: rawText(v.boundaryGeoJson) });

function Areas() {
  const qc = useQueryClient();
  const canManage = useCan(P.GeographyManage);
  const [company, setCompany] = useState<{ id: string; label: string } | null>(null);
  const pg = usePaged();
  const q = useQuery(serviceAreasQuery({ page: pg.page, pageSize: pg.pageSize, search: pg.search, companyId: company ? Number(company.id) : undefined }));
  const [edit, setEdit] = useState<ServiceArea | null>(null);
  const [off, setOff] = useState<ServiceArea | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: geoKeys.areas });
  return (
    <>
      <Card className="mb-3"><CardContent className="flex flex-wrap items-end gap-3 pt-6">
        <div className="min-w-64 flex-1 space-y-1.5"><Label htmlFor="sa-company">شرکت</Label><EntityPicker id="sa-company" kind="company" value={company?.id} label={company?.label} onChange={(v, o) => setCompany({ id: v, label: o?.label ?? v })} /></div>
        {company && <Button variant="ghost" onClick={() => setCompany(null)}>همه شرکت‌ها</Button>}
      </CardContent></Card>
      <DataTable<ServiceArea> {...tableState(q)} server={pg.server(q.data?.total ?? 0)} rowKey={(a) => a.id} exportName="service-areas" searchPlaceholder="جستجوی کد یا عنوان محدوده…" emptyText="محدوده‌ای ثبت نشده است"
        toolbar={canManage ? <FormSheet title="محدوده خدمات جدید" trigger={<Button size="sm" className="h-9"><Plus />محدوده جدید</Button>} fields={createFields} successMessage="محدوده ثبت شد" initial={company ? { companyId: company.id } : {}}
          onSubmit={async (v) => { await geoApi.createArea({ companyId: reqInt(v.companyId), areaCode: text(v.areaCode), areaType: text(v.areaType), ...body(v) }); await refresh(); }} /> : undefined}
        columns={[
          { key: "code", header: "کد", cell: (a) => <span className="font-mono">{a.code}</span> }, { key: "name", header: "عنوان" }, { key: "type", header: "نوع" },
          { key: "companyId", header: "شرکت", cell: (a) => `#${a.companyId}` }, { key: "divisionId", header: "تقسیم کشوری", cell: (a) => (a.divisionId ? `#${a.divisionId}` : "—"), hidden: true },
          { key: "boundary", header: "مرز", cell: (a) => (a.boundary ? <MapPin className="size-4 text-primary" aria-label="دارای مرز" /> : "—"), value: (a) => (a.boundary ? "دارد" : "ندارد") },
          { key: "status", header: "وضعیت", cell: (a) => <StatusBadge status={a.status || "Active"} /> },
        ]}
        actions={canManage ? [{ label: "ویرایش", onClick: setEdit }, { label: "غیرفعال‌سازی", destructive: true, show: (a) => !/inactive|deactiv/i.test(a.status), onClick: setOff }] : undefined} />
      <FormSheet open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} title={`ویرایش ${edit?.name ?? ""}`} fields={editFields} successMessage="ذخیره شد"
        initial={edit ? { areaName: edit.name, administrativeDivisionId: edit.divisionId ? String(edit.divisionId) : undefined, responsibleUnitId: edit.responsibleUnitId ? String(edit.responsibleUnitId) : undefined, description: edit.description, boundaryGeoJson: edit.boundary } : {}}
        onSubmit={async (v) => { await geoApi.updateArea(edit!.id, { ...body(v), expectedRowVersion: edit!.rowVersion }); await refresh(); }} />
      <ConfirmAction open={off !== null} onOpenChange={(o) => !o && setOff(null)} title={`غیرفعال‌سازی ${off?.name ?? ""}`} destructive confirmLabel="غیرفعال‌سازی"
        onConfirm={async () => { await geoApi.deactivateArea(off!.id, { expectedRowVersion: off!.rowVersion }); toast.success("محدوده غیرفعال شد"); await refresh(); }} />
    </>
  );
}

function Divisions() {
  const qc = useQueryClient();
  const canManage = useCan(P.GeographyManage);
  const [path, setPath] = useState<Division[]>([]);
  const parent = path[path.length - 1];
  const pg = usePaged();
  const q = useQuery(divisionsQuery({ page: pg.page, pageSize: pg.pageSize, search: pg.search, parentId: parent?.id }));
  const open = (d: Division) => { setPath([...path, d]); pg.setPage(1); };
  return (
    <>
      <nav aria-label="مسیر تقسیمات" className="mb-3 flex flex-wrap items-center gap-1 text-sm">
        <Button variant="link" size="sm" className="px-1" onClick={() => setPath([])}>کشور</Button>
        {path.map((d, i) => <span key={d.id} className="flex items-center gap-1"><ChevronLeft className="size-3.5 text-muted-foreground" /><Button variant="link" size="sm" className="px-1" onClick={() => setPath(path.slice(0, i + 1))}>{d.name}</Button></span>)}
      </nav>
      <DataTable<Division> {...tableState(q)} server={pg.server(q.data?.total ?? 0)} rowKey={(d) => d.id} exportName="divisions" searchPlaceholder="جستجوی نام یا کد…" onRowClick={open} emptyText="زیرمجموعه‌ای ثبت نشده است"
        toolbar={canManage ? <FormSheet title={parent ? `تقسیم جدید زیر ${parent.name}` : "تقسیم جدید"} trigger={<Button size="sm" className="h-9"><Plus />افزودن</Button>} successMessage="تقسیم کشوری ثبت شد"
          fields={[
            { name: "divisionCode", label: "کد", ltr: true, required: true }, { name: "divisionName", label: "نام", required: true }, { name: "divisionNameEn", label: "نام لاتین", ltr: true },
            { name: "divisionType", label: "نوع", type: "ref", refGroup: "AdministrativeDivisionType", required: true },
            { name: "latitude", label: "عرض جغرافیایی", type: "number" }, { name: "longitude", label: "طول جغرافیایی", type: "number" },
          ]}
          onSubmit={async (v) => { await geoApi.createDivision({ divisionCode: text(v.divisionCode), divisionName: rawText(v.divisionName), divisionNameEn: rawText(v.divisionNameEn), divisionType: text(v.divisionType), parentDivisionId: parent?.id, latitude: v.latitude ? Number(text(v.latitude)) : undefined, longitude: v.longitude ? Number(text(v.longitude)) : undefined }); await qc.invalidateQueries({ queryKey: geoKeys.divisions }); }} /> : undefined}
        columns={[
          { key: "code", header: "کد", cell: (d) => <span className="font-mono">{d.code}</span> }, { key: "name", header: "نام" }, { key: "type", header: "نوع" },
          { key: "nameEn", header: "نام لاتین", hidden: true },
          { key: "open", header: "", cell: () => <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />, value: () => "" },
        ]} />
    </>
  );
}
