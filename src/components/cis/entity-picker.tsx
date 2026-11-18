import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { entitySources, type EntityKind, type PickOption } from "@/features/pickers";
import { refItemsQuery } from "@/features/foundation/reference";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorMessage } from "@/lib/api/messages";
import { cn } from "@/lib/utils";

export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Searchable picker backed by the server (people, premises, customers, catalogs…). Value is the record id as string. */
export function EntityPicker({ kind, value, label, onChange, id, invalid }: { kind: EntityKind; value?: string; label?: string; onChange: (value: string, option?: PickOption) => void; id?: string; invalid?: boolean }) {
  const src = entitySources[kind];
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [chosen, setChosen] = useState<PickOption | undefined>(value ? { value, label: label ?? `#${value}` } : undefined);
  useEffect(() => { if (!value) setChosen(undefined); }, [value]);
  const res = useQuery({ queryKey: ["picker", kind, dq], queryFn: ({ signal }) => src.search(dq, signal), enabled: open, staleTime: 30_000, retry: false });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} aria-invalid={invalid} className={cn("w-full justify-between font-normal", !chosen && "text-muted-foreground", invalid && "border-destructive")}>
          <span className="truncate">{chosen ? chosen.label : `جستجو و انتخاب ${src.label}…`}</span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder={`نام، کد یا شناسه ${src.label}…`} />
          <CommandList>
            {res.isFetching && <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />در حال جستجو…</div>}
            {res.error && <div className="p-3 text-sm text-destructive">{errorMessage(res.error)}</div>}
            {!res.isFetching && !res.error && <CommandEmpty>موردی یافت نشد</CommandEmpty>}
            <CommandGroup>
              {(res.data ?? []).map((o) => (
                <CommandItem key={o.value} value={o.value} onSelect={() => { setChosen(o); onChange(o.value, o); setOpen(false); }}>
                  <Check className={cn("size-4", chosen?.value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="mr-auto truncate text-xs text-muted-foreground">{o.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Code field backed by a BusinessFoundation reference group (A03). When the group is not defined on the server
 * the user types the code directly — meanings of numeric codes are not invented in the UI.
 */
export function RefCodeSelect({ group, value, onChange, numeric, id, invalid }: { group: string; value?: string; onChange: (v: string) => void; numeric?: boolean; id?: string; invalid?: boolean }) {
  const q = useQuery({ ...refItemsQuery(group, true), retry: false, staleTime: 10 * 60_000 });
  const items = q.data ?? [];
  if (q.isPending) return <Input id={id} disabled placeholder="در حال دریافت گزینه‌ها…" />;
  if (items.length === 0)
    return <Input id={id} dir="rtl" inputMode={numeric ? "numeric" : undefined} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={`کد (گروه مرجع ${group})`} aria-invalid={invalid} />;
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={invalid}><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
      <SelectContent>{items.map((i) => <SelectItem key={i.id || i.code} value={i.code}>{i.name || i.code}</SelectItem>)}</SelectContent>
    </Select>
  );
}
