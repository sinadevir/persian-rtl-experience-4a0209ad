import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, UserCheck, UserPlus, Building2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageHeader } from "@/components/cis/app-shell";
import { FieldsGrid, validate, serverFieldErrors, type Field } from "@/components/cis/form-sheet";
import { EntityPicker } from "@/components/cis/entity-picker";
import { InfoList } from "@/components/cis/blocks";
import { ForbiddenState } from "@/components/cis/query-state";
import { useCan } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";
import { createdId, partiesQuery, partyApi, partyKeys } from "@/features/parties/api";
import { customerApi, customerKeys } from "@/features/customers/api";
import { relApi } from "@/features/relationships/api";
import { dateOnly, isoDate, rawText, reqInt, text, type FormValues } from "@/lib/form-values";
import { errorMessage } from "@/lib/api/messages";
import { faNum, toJalali } from "@/lib/jalali";
import { isValidNationalId } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/registration")({
  head: () => seo("ثبت مشترک جدید", "ثبت مرحله‌ای مشترک: متقاضی، ملک و مشخصات اشتراک"),
  component: Wizard,
});

const steps = ["متقاضی", "ملک", "اشتراک", "بازبینی و ثبت"];
const individual: Field[] = [
  { name: "givenName", label: "نام", required: true }, { name: "familyName", label: "نام خانوادگی", required: true },
  { name: "nationalId", label: "کد ملی", required: true, rule: "nationalId", ltr: true }, { name: "mobilePhone", label: "تلفن همراه", rule: "mobile", ltr: true },
  { name: "birthDate", label: "تاریخ تولد", type: "date" }, { name: "genderCode", label: "جنسیت", type: "ref", refGroup: "GenderCode" },
];
const organization: Field[] = [
  { name: "organizationName", label: "نام سازمان / شرکت", required: true, full: true }, { name: "nationalLegalId", label: "شناسه ملی", rule: "legalId", ltr: true, required: true },
  { name: "mobilePhone", label: "تلفن همراه رابط", rule: "mobile", ltr: true }, { name: "organizationTypeCode", label: "نوع سازمان", type: "ref", refGroup: "OrganizationType" },
  { name: "registrationDate", label: "تاریخ ثبت", type: "date" },
];
const relationFields: Field[] = [
  { name: "relationshipTypeId", label: "نسبت متقاضی با ملک", type: "entity", entity: "relationshipType", required: true },
  { name: "validFrom", label: "از تاریخ", type: "date", required: true },
];
const customerFields: Field[] = [
  { name: "customerNumber", label: "شماره اشتراک", ltr: true, hint: "اگر خالی بماند، سامانه طبق قاعده شماره‌گذاری تعیین می‌کند." },
  { name: "principalValidFrom", label: "تاریخ شروع اشتراک", type: "date", required: true },
];

type Applicant = { mode: "existing"; id: string; label: string } | { mode: "new"; kind: "individual" | "organization" };

function Wizard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const canCreate = useCan(P.CustomerCreate);
  const [s, setS] = useState(0);
  const [applicant, setApplicant] = useState<Applicant>({ mode: "existing", id: "", label: "" });
  const [person, setPerson] = useState<FormValues>({});
  const [premises, setPremises] = useState<{ id: string; label: string } | null>(null);
  const [rel, setRel] = useState<FormValues>({ validFrom: new Date() });
  const [cust, setCust] = useState<FormValues>({ principalValidFrom: new Date() });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [createdPartyId, setCreatedPartyId] = useState<number | null>(null);

  const nid = applicant.mode === "new" && applicant.kind === "individual" ? text(person.nationalId) : undefined;
  const dup = useQuery({ ...partiesQuery({ nationalId: nid, page: 1, pageSize: 5 }), enabled: Boolean(nid && isValidNationalId(nid)) });
  if (!canCreate) return <ForbiddenState title="ثبت مشترک جدید برای نقش شما فعال نیست" />;

  const personFields = applicant.mode === "new" ? (applicant.kind === "individual" ? individual : organization) : [];
  const check = () => {
    let e: Record<string, string> = {};
    if (s === 0) {
      if (applicant.mode === "existing" && !applicant.id) e = { applicant: "متقاضی را انتخاب کنید یا شخص جدید ثبت کنید" };
      if (applicant.mode === "new") e = validate(personFields, person);
    }
    if (s === 1 && premises) e = validate(relationFields, rel);
    if (s === 2) e = validate(customerFields, cust);
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const next = () => { if (check()) setS(s + 1); };

  const submit = async () => {
    setBusy(true); setFailure(null);
    try {
      let partyId = applicant.mode === "existing" ? Number(applicant.id) : createdPartyId;
      if (!partyId && applicant.mode === "new") {
        const res = applicant.kind === "individual"
          ? await partyApi.createIndividual({ givenName: rawText(person.givenName), familyName: rawText(person.familyName), nationalId: text(person.nationalId), mobilePhone: text(person.mobilePhone), birthDate: dateOnly(person.birthDate), genderCode: text(person.genderCode) })
          : await partyApi.createOrganization({ organizationName: rawText(person.organizationName), nationalLegalId: text(person.nationalLegalId), mobilePhone: text(person.mobilePhone), organizationTypeCode: text(person.organizationTypeCode), registrationDate: dateOnly(person.registrationDate) });
        partyId = createdId(res, "partyId") ?? null;
        if (!partyId) throw new Error("شخص ثبت شد اما شناسه آن از سرور دریافت نشد؛ او را از فهرست اشخاص انتخاب کنید.");
        setCreatedPartyId(partyId);
        await qc.invalidateQueries({ queryKey: partyKeys.all });
      }
      const created = await customerApi.create({ customerNumber: text(cust.customerNumber), principalPartyId: partyId!, principalValidFrom: isoDate(cust.principalValidFrom) });
      const customerId = createdId(created, "customerId");
      if (premises) {
        try {
          await relApi.establish({ relationshipTypeId: reqInt(rel.relationshipTypeId), partyId: partyId!, premisesId: Number(premises.id), customerId, validFrom: isoDate(rel.validFrom)! });
        } catch (e) { toast.warning(`مشترک ثبت شد اما ارتباط با ملک ثبت نشد: ${errorMessage(e)}`); }
      }
      await qc.invalidateQueries({ queryKey: customerKeys.all });
      toast.success("مشترک با موفقیت ثبت شد");
      void nav(customerId ? { to: "/customers/$id", params: { id: String(customerId) } } : { to: "/customers" });
    } catch (e) {
      setFailure(errorMessage(e));
      const fe = serverFieldErrors([...personFields, ...customerFields], e);
      if (Object.keys(fe).length) setErrors(fe);
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="ثبت مشترک جدید" desc="در چهار مرحله کوتاه: متقاضی، ملک (اختیاری)، مشخصات اشتراک و بازبینی." />
      <ol className="mb-6 flex items-center gap-2 overflow-x-auto" aria-label="مراحل ثبت">
        {steps.map((t, i) => (
          <li key={t} className="flex flex-1 items-center gap-2" aria-current={i === s ? "step" : undefined}>
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold", i <= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i < s ? <Check className="size-4" /> : faNum(i + 1)}</span>
            <span className={cn("whitespace-nowrap text-sm", i === s ? "font-bold" : "text-muted-foreground")}>{t}</span>
            {i < steps.length - 1 && <span className="h-px min-w-4 flex-1 bg-border" />}
          </li>
        ))}
      </ol>
      <Card className="max-w-3xl">
        {s === 0 && (
          <>
            <CardHeader><CardTitle className="text-base">متقاضی اشتراک</CardTitle><CardDescription>اگر متقاضی قبلاً در سامانه ثبت شده، او را جستجو کنید تا پرونده تکراری ساخته نشود.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={applicant.mode === "existing" ? "existing" : applicant.kind} onValueChange={(v) => { setErrors({}); setApplicant(v === "existing" ? { mode: "existing", id: "", label: "" } : { mode: "new", kind: v as "individual" | "organization" }); }} className="grid gap-2 sm:grid-cols-3">
                {[{ v: "existing", l: "شخص ثبت‌شده", I: UserCheck }, { v: "individual", l: "شخص حقیقی جدید", I: UserPlus }, { v: "organization", l: "شخص حقوقی جدید", I: Building2 }].map(({ v, l, I }) => (
                  <Label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent"><RadioGroupItem value={v} /><I className="size-4 text-primary" />{l}</Label>
                ))}
              </RadioGroup>
              {applicant.mode === "existing" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="applicant">جستجوی متقاضی (نام، کد ملی یا کد شخص)</Label>
                  <EntityPicker id="applicant" kind="party" value={applicant.id || undefined} label={applicant.label} invalid={Boolean(errors.applicant)} onChange={(id, o) => setApplicant({ mode: "existing", id, label: o?.label ?? id })} />
                  {errors.applicant && <p className="text-xs text-destructive">{errors.applicant}</p>}
                </div>
              ) : (
                <>
                  <FieldsGrid fields={personFields} values={person} setValues={setPerson} errors={errors} />
                  {(dup.data?.items.length ?? 0) > 0 && (
                    <Alert>
                      <AlertTriangle className="size-4" />
                      <AlertDescription className="space-y-2">
                        <div>شخصی با این کد ملی در سامانه وجود دارد. برای جلوگیری از پرونده تکراری از همان استفاده کنید:</div>
                        {dup.data!.items.map((p) => <Button key={p.id} size="sm" variant="outline" onClick={() => setApplicant({ mode: "existing", id: String(p.id), label: p.name })}>استفاده از {p.name}</Button>)}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </>
        )}
        {s === 1 && (
          <>
            <CardHeader><CardTitle className="text-base">ملک محل اشتراک (اختیاری)</CardTitle><CardDescription>با انتخاب ملک، رابطه متقاضی با ملک هم ثبت می‌شود. اگر ملک هنوز ثبت نشده، می‌توانید این مرحله را رد کنید و بعداً از پرونده ملک اضافه کنید.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5"><Label htmlFor="premises">ملک</Label><EntityPicker id="premises" kind="premises" value={premises?.id} label={premises?.label} onChange={(id, o) => setPremises({ id, label: o?.label ?? id })} /></div>
              {premises && <><FieldsGrid fields={relationFields} values={rel} setValues={setRel} errors={errors} /><Button variant="link" size="sm" className="px-0" onClick={() => { setPremises(null); setErrors({}); }}>بدون ملک ادامه می‌دهم</Button></>}
            </CardContent>
          </>
        )}
        {s === 2 && (
          <>
            <CardHeader><CardTitle className="text-base">مشخصات اشتراک</CardTitle></CardHeader>
            <CardContent><FieldsGrid fields={customerFields} values={cust} setValues={setCust} errors={errors} /></CardContent>
          </>
        )}
        {s === 3 && (
          <>
            <CardHeader><CardTitle className="text-base">بازبینی و ثبت</CardTitle><CardDescription>پس از ثبت، پرونده مشترک باز می‌شود.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <InfoList items={[
                ["متقاضی", applicant.mode === "existing" ? applicant.label : applicant.kind === "individual" ? `${rawText(person.givenName) ?? ""} ${rawText(person.familyName) ?? ""} (جدید)` : `${rawText(person.organizationName) ?? ""} (جدید)`],
                ["کد ملی / شناسه ملی", text(person.nationalId) ?? text(person.nationalLegalId) ?? "—"],
                ["ملک", premises?.label ?? "بدون ملک"],
                ["شماره اشتراک", text(cust.customerNumber) ?? "تعیین توسط سامانه"],
                ["شروع اشتراک", cust.principalValidFrom instanceof Date ? toJalali(cust.principalValidFrom) : "—"],
              ]} />
              {createdPartyId && <Alert><AlertDescription>متقاضی ثبت شده است؛ با ثبت دوباره فقط مشترک ساخته می‌شود.</AlertDescription></Alert>}
              {failure && <Alert variant="destructive" role="alert"><AlertDescription>{failure}</AlertDescription></Alert>}
            </CardContent>
          </>
        )}
        <CardFooter className="justify-between">
          <Button variant="outline" disabled={s === 0 || busy} onClick={() => { setErrors({}); setS(s - 1); }}>مرحله قبل</Button>
          {s < steps.length - 1 ? <Button onClick={next}>مرحله بعد</Button> : <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="animate-spin" />}ثبت نهایی</Button>}
        </CardFooter>
      </Card>
    </>
  );
}
