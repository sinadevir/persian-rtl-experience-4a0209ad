import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { faNum, gToJ, jMonthLength, jMonths, jToDate, jWeekdays, persianWeekday, toJalali } from "@/lib/jalali";

export function JalaliMonthGrid({ year, month, selected, onSelect, marked }: { year: number; month: number; selected?: Date | undefined; onSelect?: (d: Date) => void; marked?: (d: Date) => string | undefined }) {
  const first = jToDate(year, month, 1);
  const offset = persianWeekday(first);
  const len = jMonthLength(year, month);
  const today = gToJ(new Date());
  const sel = selected ? gToJ(selected) : undefined;
  return (
    <div className="grid grid-cols-7 gap-1 text-center text-sm">
      {jWeekdays.map((w, i) => <div key={w} className={cn("py-1 text-xs text-muted-foreground", i === 6 && "text-destructive")}>{w}</div>)}
      {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}
      {Array.from({ length: len }, (_, i) => {
        const day = i + 1; const date = jToDate(year, month, day);
        const isSel = sel && sel.jy === year && sel.jm === month && sel.jd === day;
        const isToday = today.jy === year && today.jm === month && today.jd === day;
        const mark = marked?.(date); const fri = persianWeekday(date) === 6;
        return (
          <button type="button" key={day} title={mark} onClick={() => onSelect?.(date)}
            className={cn("aspect-square rounded-md transition-colors hover:bg-muted", (fri || mark) && "text-destructive", mark && "bg-destructive/10 font-semibold",
              isToday && "ring-1 ring-primary", isSel && "bg-primary text-primary-foreground hover:bg-primary")}>{faNum(day)}</button>
        );
      })}
    </div>
  );
}

export function useJalaliCursor(initial?: Date) {
  const j = gToJ(initial ?? new Date());
  const [c, setC] = useState({ y: j.jy, m: j.jm });
  const move = (d: number) => setC(({ y, m }) => { const t = y * 12 + (m - 1) + d; return { y: Math.floor(t / 12), m: (t % 12) + 1 }; });
  return { ...c, move, title: `${jMonths[c.m - 1]} ${faNum(c.y).replace(/٬/g, "")}` };
}

export function JalaliDatePicker({ value, onChange, placeholder = "انتخاب تاریخ", className, id }: { value?: Date | undefined; onChange?: (d: Date) => void; placeholder?: string; className?: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const cur = useJalaliCursor(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}>
          {value ? toJalali(value) : placeholder}<CalendarDays className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex"><Button type="button" size="icon" variant="ghost" onClick={() => cur.move(-12)} aria-label="سال قبل"><ChevronsRight /></Button><Button type="button" size="icon" variant="ghost" onClick={() => cur.move(-1)} aria-label="ماه قبل"><ChevronRight /></Button></div>
          <span className="font-semibold">{cur.title}</span>
          <div className="flex"><Button type="button" size="icon" variant="ghost" onClick={() => cur.move(1)} aria-label="ماه بعد"><ChevronLeft /></Button><Button type="button" size="icon" variant="ghost" onClick={() => cur.move(12)} aria-label="سال بعد"><ChevronsLeft /></Button></div>
        </div>
        <JalaliMonthGrid year={cur.y} month={cur.m} selected={value} onSelect={(d) => { onChange?.(d); setOpen(false); }} />
        <Button type="button" variant="link" size="sm" className="mt-1 w-full" onClick={() => { onChange?.(new Date()); setOpen(false); }}>امروز</Button>
      </PopoverContent>
    </Popover>
  );
}

/** «مشاهده در تاریخ» – for temporal (as-of) queries */
export function AsOfPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-sm">
      <span className="whitespace-nowrap text-muted-foreground">نمایش در تاریخ:</span>
      <JalaliDatePicker value={value} onChange={onChange} className="h-8 w-36 border-0" />
    </div>
  );
}
