import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityPicker } from "@/components/cis/entity-picker";
import { sharesError } from "@/features/ownership/api";
import { faNum } from "@/lib/jalali";
import { faToEnDigits } from "@/lib/jalali";
import { cn } from "@/lib/utils";

export type InterestRow = { partyId: string; label: string; share: string };
export const toInterests = (rows: InterestRow[]) => rows.filter((r) => r.partyId).map((r) => ({ partyId: Number(r.partyId), sharePercent: Number(faToEnDigits(r.share)) || 0 }));
export const interestsError = (rows: InterestRow[]) => (rows.some((r) => !r.partyId) ? "برای همه ردیف‌ها مالک را انتخاب کنید" : new Set(rows.map((r) => r.partyId)).size !== rows.length ? "یک شخص دو بار وارد شده است" : sharesError(toInterests(rows).map((i) => i.sharePercent)));

/** Owners + share% editor with a live total; the server re-validates on submit. */
export function InterestsEditor({ rows, onChange }: { rows: InterestRow[]; onChange: (r: InterestRow[]) => void }) {
  const total = Math.round(toInterests(rows).reduce((a, b) => a + b.sharePercent, 0) * 100) / 100;
  const set = (i: number, patch: Partial<InterestRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_110px_auto] items-end gap-2">
          <div className="space-y-1"><Label htmlFor={`own-${i}`} className="text-xs">مالک {faNum(i + 1)}</Label><EntityPicker id={`own-${i}`} kind="party" value={r.partyId || undefined} label={r.label} onChange={(v, o) => set(i, { partyId: v, label: o?.label ?? v })} /></div>
          <div className="space-y-1"><Label htmlFor={`share-${i}`} className="text-xs">سهم (٪)</Label><Input id={`share-${i}`} inputMode="decimal" dir="rtl" value={r.share} onChange={(e) => set(i, { share: e.target.value })} /></div>
          <Button type="button" size="icon" variant="ghost" aria-label="حذف ردیف" disabled={rows.length === 1} onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 /></Button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { partyId: "", label: "", share: "" }])}><Plus />افزودن مالک</Button>
        <span className={cn("text-sm font-bold", total === 100 ? "text-success" : "text-destructive")} aria-live="polite">جمع سهم‌ها: {faNum(total)}٪</span>
      </div>
    </div>
  );
}
