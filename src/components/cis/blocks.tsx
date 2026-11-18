import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { faNum, toJalali } from "@/lib/jalali";
import { StatusBadge } from "./status-badge";

export function InfoList({ items, cols = 1 }: { items: [string, ReactNode][]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 text-sm", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3")}>
      {items.map(([k, v]) => <div key={k} className="grid grid-cols-[minmax(6.5rem,40%)_1fr] items-baseline gap-3 border-b border-dashed pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
    </dl>
  );
}

export function StatCard({ title, value, icon: Icon, hint, highlight }: { title: string; value: number | string; icon?: LucideIcon; hint?: string; highlight?: boolean }) {
  return (
    <Card className={cn(highlight && "bg-water text-primary-foreground")}>
      <CardContent className="flex items-center justify-between p-4">
        <div><div className="text-xs opacity-80">{title}</div><div className="mt-1 text-xl font-extrabold">{typeof value === "number" ? faNum(value) : value}</div>{hint && <div className="text-xs opacity-70">{hint}</div>}</div>
        {Icon && <Icon className="size-7 opacity-50" />}
      </CardContent>
    </Card>
  );
}

export type TimelineItem = { date: string; title: string; by?: string; status?: string; note?: string | undefined };
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative mr-1.5 border-r pr-6">
      {items.map((t, i) => (
        <li key={i} className="relative mb-5 last:mb-0">
          <span className="absolute -right-[1.84rem] top-1.5 size-3 rounded-full border-2 border-card bg-primary" />
          <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{t.title}</span>{t.status && <StatusBadge status={t.status} />}</div>
          <div className="text-xs text-muted-foreground">{toJalali(t.date)}{t.by && ` · ${t.by}`}</div>
          {t.note && <p className="mt-1 text-sm text-muted-foreground">{t.note}</p>}
        </li>
      ))}
    </ol>
  );
}

export type TreeNode = { id: string; title: string; badge?: string; icon?: LucideIcon; inactive?: boolean; children?: TreeNode[] };
export function TreeView({ nodes, selected, onSelect, depth = 0 }: { nodes: TreeNode[]; selected?: string | undefined; onSelect?: ((n: TreeNode) => void) | undefined; depth?: number }) {
  return <ul className="space-y-0.5">{nodes.map((n) => <TreeRow key={n.id} n={n} selected={selected} onSelect={onSelect} depth={depth} />)}</ul>;
}
function TreeRow({ n, selected, onSelect, depth }: { n: TreeNode; selected?: string | undefined; onSelect?: ((n: TreeNode) => void) | undefined; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const Icon = n.icon;
  return (
    <li>
      <div style={{ paddingRight: depth * 14 }} className={cn("flex items-center gap-1 rounded-md text-sm hover:bg-muted", selected === n.id && "bg-accent text-accent-foreground", n.inactive && "opacity-50")}>
        <button className="grid size-6 place-items-center" onClick={() => setOpen(!open)} aria-label="باز/بستن">{n.children?.length ? (open ? <ChevronDown className="size-3.5" /> : <ChevronLeft className="size-3.5" />) : null}</button>
        <button className="flex flex-1 items-center gap-2 py-1.5 text-right" onClick={() => onSelect?.(n)}>
          {Icon && <Icon className="size-4 text-primary" />}<span className={cn(selected === n.id && "font-semibold")}>{n.title}</span>
          {n.badge && <span className="mr-auto rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{n.badge}</span>}
        </button>
      </div>
      {open && n.children && <TreeView nodes={n.children} selected={selected} onSelect={onSelect} depth={depth + 1} />}
    </li>
  );
}
export const findNode = (nodes: TreeNode[], id?: string): TreeNode | undefined => { for (const n of nodes) { if (n.id === id) return n; const f = n.children && findNode(n.children, id); if (f) return f; } return undefined; };

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center text-muted-foreground"><Icon className="size-10 opacity-40" /><div className="font-medium text-foreground">{title}</div>{children}</div>;
}

export function SharesBar({ parts }: { parts: { label: string; value: number }[] }) {
  const colors = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">{parts.map((p, i) => <div key={p.label} className={colors[i % 5]} style={{ width: `${p.value}%` }} />)}</div>
      <div className="flex flex-wrap gap-3 text-xs">{parts.map((p, i) => <span key={p.label} className="flex items-center gap-1"><span className={cn("size-2.5 rounded-sm", colors[i % 5])} />{p.label} {faNum(p.value)}٪</span>)}</div>
    </div>
  );
}
