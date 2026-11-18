import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/jalali";
import { statusLabel } from "@/lib/status";
import { WORKFLOW_STEPS } from "@/features/lifecycle/api";

const norm = (s: string) => s.replace(/[\s_-]/g, "").toLowerCase();
const BAD = ["rejected", "cancelled", "canceled", "failed", "executionfailed"];

/** Where a case is in its review → approval → execution path, using the server's status. */
export function CaseStepper({ status, steps = WORKFLOW_STEPS as unknown as string[] }: { status: string; steps?: string[] }) {
  const s = norm(status);
  const bad = BAD.includes(s);
  const map: Record<string, number> = { inreview: 2, executing: 4, executed: 5, partiallycompleted: 5 };
  let idx = steps.findIndex((x) => norm(x) === s);
  if (idx < 0) idx = map[s] ?? (s.includes("fail") ? steps.length - 1 : bad ? 2 : 0);
  const finished = !bad && idx === steps.length - 1;
  return (
    <ol className="flex items-start gap-1 overflow-x-auto pb-1" aria-label={`وضعیت فعلی: ${statusLabel(status)}`}>
      {steps.map((st, i) => {
        const done = i < idx || (i === idx && finished);
        const current = i === idx;
        const isBad = current && bad;
        return (
          <li key={st} className="flex min-w-20 flex-1 flex-col items-center gap-1 text-center" aria-current={current ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= idx ? "bg-primary" : "bg-border")} />
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                done && "border-primary bg-primary text-primary-foreground", current && !done && !isBad && "border-primary bg-card text-primary",
                isBad && "border-destructive bg-destructive text-primary-foreground", !done && !current && "border-border bg-card text-muted-foreground")}>
                {isBad ? <X className="size-3.5" /> : done ? <Check className="size-3.5" /> : faNum(i + 1)}
              </span>
              <span className={cn("h-0.5 flex-1", i === steps.length - 1 ? "bg-transparent" : i < idx ? "bg-primary" : "bg-border")} />
            </div>
            <span className={cn("text-[11px]", current ? "font-bold" : "text-muted-foreground", isBad && "text-destructive")}>{isBad ? statusLabel(status) : statusLabel(st)}</span>
          </li>
        );
      })}
    </ol>
  );
}
