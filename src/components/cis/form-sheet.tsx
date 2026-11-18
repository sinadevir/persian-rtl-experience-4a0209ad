import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JalaliDatePicker } from "./jalali-date-picker";
import { EntityPicker, RefCodeSelect } from "./entity-picker";
import type { EntityKind } from "@/features/pickers";
import type { FormValue, FormValues } from "@/lib/form-values";
import { checkRule, type Rule } from "@/lib/validation";
import { errorMessage, fieldErrors } from "@/lib/api/messages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type Option = string | { value: string; label: string };
export type Field = {
  name: string; label: string;
  type?: "text" | "number" | "select" | "date" | "textarea" | "switch" | "entity" | "ref";
  options?: Option[]; entity?: EntityKind; entityLabel?: string; refGroup?: string; numeric?: boolean;
  required?: boolean; ltr?: boolean; full?: boolean; placeholder?: string; hint?: string;
  rule?: Rule; validate?: (v: FormValue, all: FormValues) => string | undefined; show?: (all: FormValues) => boolean; section?: string;
};
const optVal = (o: Option) => (typeof o === "string" ? o : o.value);
const optLabel = (o: Option) => (typeof o === "string" ? o : o.label);
const empty = (v: FormValue) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export function FieldsGrid({ fields, values, setValues, errors }: { fields: Field[]; values: FormValues; setValues: (v: FormValues) => void; errors?: Record<string, string> }) {
  const set = (n: string, v: FormValue) => setValues({ ...values, [n]: v });
  const visible = fields.filter((f) => !f.show || f.show(values));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {visible.map((f, i) => {
        const id = `f-${f.name}`;
        const err = errors?.[f.name];
        const describedBy = err ? `${id}-err` : f.hint ? `${id}-hint` : undefined;
        return (
          <div key={f.name} className={cn("space-y-1.5", (f.full || f.type === "textarea") && "sm:col-span-2")}>
            {f.section && (i === 0 || visible[i - 1]?.section !== f.section) && <div className="-mb-1 mt-2 border-b pb-1 text-xs font-bold text-primary sm:col-span-2">{f.section}</div>}
            <Label htmlFor={id}>{f.label}{f.required && <span className="text-destructive" aria-hidden> *</span>}</Label>
            {f.type === "select" ? (
              <Select value={(values[f.name] as string) ?? ""} onValueChange={(v) => set(f.name, v)}>
                <SelectTrigger id={id} aria-invalid={Boolean(err)} aria-describedby={describedBy}><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                <SelectContent>{f.options?.map((o) => <SelectItem key={optVal(o)} value={optVal(o)}>{optLabel(o)}</SelectItem>)}</SelectContent>
              </Select>
            ) : f.type === "date" ? (
              <JalaliDatePicker id={id} value={values[f.name] as Date | undefined} onChange={(d) => set(f.name, d)} />
            ) : f.type === "entity" && f.entity ? (
              <EntityPicker id={id} kind={f.entity} value={values[f.name] as string | undefined} label={f.entityLabel} invalid={Boolean(err)} onChange={(v) => set(f.name, v)} />
            ) : f.type === "ref" && f.refGroup ? (
              <RefCodeSelect id={id} group={f.refGroup} numeric={f.numeric} value={values[f.name] as string | undefined} invalid={Boolean(err)} onChange={(v) => set(f.name, v)} />
            ) : f.type === "textarea" ? (
              <Textarea id={id} value={(values[f.name] as string) ?? ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} aria-invalid={Boolean(err)} aria-describedby={describedBy} />
            ) : f.type === "switch" ? (
              <div className="flex h-9 items-center"><Switch id={id} checked={!!values[f.name]} onCheckedChange={(v) => set(f.name, v)} /></div>
            ) : (
              <Input id={id} inputMode={f.type === "number" || f.rule === "nationalId" || f.rule === "mobile" || f.rule === "postalCode" ? "numeric" : undefined}
                dir="rtl" value={(values[f.name] as string) ?? ""} onChange={(e) => set(f.name, e.target.value)}
                placeholder={f.placeholder} aria-invalid={Boolean(err)} aria-describedby={describedBy} className={cn(err && "border-destructive")} />
            )}
            {err ? <p id={`${id}-err`} className="text-xs text-destructive">{err}</p> : f.hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{f.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function validate(fields: Field[], values: FormValues) {
  const e: Record<string, string> = {};
  for (const f of fields) {
    if (f.show && !f.show(values)) continue;
    const v = values[f.name];
    if (f.required && empty(v)) { e[f.name] = `${f.label} الزامی است`; continue; }
    if (f.type === "number" && typeof v === "string" && v && Number.isNaN(Number(v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))))) e[f.name] = "فقط عدد مجاز است";
    const r = f.rule && typeof v === "string" ? checkRule(f.rule, v) : undefined;
    const c = f.validate?.(v, values);
    if (r || c) e[f.name] = (r ?? c)!;
  }
  return e;
}

/** Maps server validation errors (ProblemDetails.errors) onto form fields by name. */
export function serverFieldErrors(fields: Field[], err: unknown) {
  const fe = fieldErrors(err);
  const out: Record<string, string> = {};
  for (const f of fields) { const m = fe[f.name.toLowerCase()]; if (m) out[f.name] = m; }
  return out;
}

/** Side-sheet form: validates locally, waits for the server, keeps the user's input on failure. */
export function FormSheet({ title, description, trigger, fields, initial = {}, submitLabel = "ثبت", successMessage = "با موفقیت ثبت شد", onSubmit, open: o, onOpenChange, children }: {
  title: string; description?: string; trigger?: ReactNode; fields: Field[]; initial?: FormValues; submitLabel?: string; successMessage?: string | null;
  onSubmit: (v: FormValues) => unknown | Promise<unknown>; open?: boolean; onOpenChange?: (v: boolean) => void; children?: ReactNode;
}) {
  const [inner, setInner] = useState(false);
  const open = o ?? inner;
  const setOpen = onOpenChange ?? setInner;
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const e = validate(fields, values);
    setErrors(e); setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await onSubmit(values);
      if (successMessage) toast.success(successMessage);
      setOpen(false);
    } catch (err) {
      setErrors(serverFieldErrors(fields, err));
      setFormError(errorMessage(err));
    } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onOpenChange={(v) => { if (busy) return; setOpen(v); if (v) { setValues(initial); setErrors({}); setFormError(null); } }}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-xl">
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
          <SheetHeader className="text-right"><SheetTitle>{title}</SheetTitle>{description && <SheetDescription>{description}</SheetDescription>}</SheetHeader>
          <div className="space-y-4 py-6">
            {children}
            <FieldsGrid fields={fields} values={values} setValues={setValues} errors={errors} />
            {formError && <Alert variant="destructive" role="alert"><AlertDescription>{formError}</AlertDescription></Alert>}
          </div>
          <SheetFooter className="gap-2 sm:justify-start">
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{submitLabel}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>انصراف</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
