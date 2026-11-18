import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowLeft, ClipboardCheck, FileSearch, Inbox, Play, Search, Users, UserPlus, XCircle, Building2, Copy, Tags, Cable, FileEdit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/cis/app-shell";
import { StatusBadge } from "@/components/cis/status-badge";
import { ErrorState } from "@/components/cis/query-state";
import { usePermissions } from "@/lib/auth/permissions";
import { P, type PermissionCode } from "@/lib/auth/permission-codes";
import { useSession } from "@/lib/api/session";
import { changeRequestsQuery, lifecycleCasesQuery, transitionLabel } from "@/features/lifecycle/api";
import { conflictsQuery } from "@/features/ownership/api";
import { mismatchesQuery } from "@/features/usage/api";
import { duplicatePartiesQuery } from "@/features/parties/api";
import { foundationOutboxQuery } from "@/features/foundation/operations";
import { errorMessage } from "@/lib/api/messages";
import { faNum, toJalali, toJalaliLong } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("میز کار", "کارهای منتظر اقدام، هشدارهای کنترلی و دسترسی سریع به خدمات مشترکین"),
  component: Dashboard,
});

const one = { page: 1, pageSize: 1 };

/** A count tile backed by a real paged endpoint (uses the server's total). */
function CountTile({ title, icon: Icon, query, to, tone }: { title: string; icon: LucideIcon; query: { data?: { total: number } | unknown[]; isPending: boolean; error: unknown }; to: string; tone?: "warn" | "bad" }) {
  const total = Array.isArray(query.data) ? query.data.length : query.data?.total;
  return (
    <Link to={to} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full border-s-4 border-s-primary/70 transition-colors group-hover:border-s-primary group-hover:bg-muted/50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{title}</div>
            <div className={cn("mt-1 text-2xl font-extrabold", tone === "warn" && total ? "text-warning-foreground" : "", tone === "bad" && total ? "text-destructive" : "")}>
              {query.isPending ? <Skeleton className="h-7 w-12" /> : query.error ? <span className="text-sm font-normal text-muted-foreground" title={errorMessage(query.error)}>نامشخص</span> : faNum(total ?? 0)}
            </div>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-primary"><Icon className="size-5" aria-hidden /></div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Dashboard() {
  const session = useSession();
  const perms = usePermissions();
  const can = (c: PermissionCode | PermissionCode[]) => perms.can(c);
  const toReview = useQuery({ ...lifecycleCasesQuery({ status: "Submitted", ...one }), enabled: can(P.LifecycleReview) });
  const toApprove = useQuery({ ...lifecycleCasesQuery({ status: "UnderReview", ...one }), enabled: can(P.LifecycleApprove) });
  const toExecute = useQuery({ ...lifecycleCasesQuery({ status: "AwaitingExecution", ...one }), enabled: can(P.LifecycleExecute) });
  const failed = useQuery({ ...lifecycleCasesQuery({ status: "Failed", ...one }), enabled: can([P.LifecycleRetry, P.LifecycleExecute]) });
  const changes = useQuery({ ...changeRequestsQuery({ status: "Submitted", ...one }), enabled: can([P.ChangeApprove, P.ChangeRead]) });
  const conflicts = useQuery({ ...conflictsQuery(one), enabled: can(P.OwnershipRead) });
  const mismatches = useQuery({ ...mismatchesQuery(one), enabled: can(P.UsageRead) });
  const dupes = useQuery({ ...duplicatePartiesQuery({ mode: "NationalId", ...one }), enabled: can(P.PartyRead) });
  const dead = useQuery({ ...foundationOutboxQuery("dead-letter"), enabled: can(P.IntegrationMonitor) });
  const queue = useQuery({ ...lifecycleCasesQuery({ status: can(P.LifecycleApprove) && !can(P.LifecycleReview) ? "UnderReview" : "Submitted", page: 1, pageSize: 6 }), enabled: can([P.LifecycleReview, P.LifecycleApprove]) });

  const quick: { to: string; label: string; icon: LucideIcon; perm: PermissionCode }[] = [
    { to: "/customers", label: "جستجوی مشترک", icon: Search, perm: P.CustomerRead },
    { to: "/registration", label: "ثبت مشترک جدید", icon: UserPlus, perm: P.CustomerCreate },
    { to: "/parties", label: "اشخاص", icon: Users, perm: P.PartyRead },
    { to: "/premises", label: "پرونده املاک", icon: Building2, perm: P.PremisesRead },
  ];
  const work = [
    can(P.LifecycleReview) && { title: "منتظر شروع بررسی", icon: Inbox, query: toReview, to: "/cases" },
    can(P.LifecycleApprove) && { title: "منتظر تأیید", icon: ClipboardCheck, query: toApprove, to: "/cases" },
    can(P.LifecycleExecute) && { title: "آماده اجرا", icon: Play, query: toExecute, to: "/cases" },
    can([P.LifecycleRetry, P.LifecycleExecute]) && { title: "اجرای ناموفق", icon: XCircle, query: failed, to: "/cases", tone: "bad" as const },
    can([P.ChangeApprove, P.ChangeRead]) && { title: "تغییر اطلاعات منتظر بررسی", icon: FileEdit, query: changes, to: "/cases" },
  ].filter(Boolean) as { title: string; icon: LucideIcon; query: typeof toReview; to: string; tone?: "bad" }[];
  const alerts = [
    can(P.OwnershipRead) && { title: "تعارض‌های تصرف", icon: AlertTriangle, query: conflicts, to: "/ownership" },
    can(P.UsageRead) && { title: "ناسازگاری کاربری", icon: Tags, query: mismatches, to: "/usage" },
    can(P.PartyRead) && { title: "اشخاص مشکوک به تکرار", icon: Copy, query: dupes, to: "/parties" },
    can(P.IntegrationMonitor) && { title: "پیام‌های ناموفق یکپارچه‌سازی", icon: Cable, query: dead, to: "/integration" },
  ].filter(Boolean) as { title: string; icon: LucideIcon; query: typeof conflicts; to: string }[];

  return (
    <>
      <PageHeader title={`${session?.displayName ? `${session.displayName}، ` : ""}به میز کار خوش آمدید`} desc={toJalaliLong(new Date())} />
      <div className="mb-5 flex flex-wrap gap-2">
        {quick.filter((x) => can(x.perm)).map((x) => <Button key={x.to} variant={x.to === "/customers" ? "default" : "outline"} asChild><Link to={x.to}><x.icon />{x.label}</Link></Button>)}
      </div>

      {work.length > 0 && (
        <section aria-labelledby="work-h" className="mb-5">
          <h2 id="work-h" className="mb-2 text-sm font-bold text-muted-foreground">کارهای منتظر اقدام</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{work.map((w) => <CountTile key={w.title} {...w} tone={w.tone} />)}</div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {can([P.LifecycleReview, P.LifecycleApprove]) ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div><CardTitle>کارتابل من</CardTitle><CardDescription>قدیمی‌ترین درخواست‌ها را زودتر بررسی کنید</CardDescription></div>
              <Button variant="ghost" size="sm" asChild><Link to="/cases">همه<ArrowLeft /></Link></Button>
            </CardHeader>
            <CardContent className="divide-y">
              {queue.isPending && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="my-2 h-10 w-full" />)}
              {queue.error && <ErrorState error={queue.error} onRetry={() => void queue.refetch()} compact />}
              {queue.data?.items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">کاری در صف شما نیست.</p>}
              {queue.data?.items.map((c) => (
                <Link key={c.id} to="/cases/$id" params={{ id: `lc-${c.id}` }} className="flex items-center justify-between gap-2 py-2.5 hover:text-primary">
                  <div className="min-w-0"><div className="truncate font-medium">{transitionLabel(c.transitionType)} · مشترک #{c.customerId}</div><div className="text-xs text-muted-foreground">{c.number || `#${c.id}`} · {toJalali(c.requestedAt)}</div></div>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground"><FileSearch className="size-10 opacity-40" />برای شروع، مشترک یا ملک موردنظر را از نوار جستجوی بالا (Ctrl+K) پیدا کنید.</CardContent></Card>
        )}
        {alerts.length > 0 && (
          <section aria-labelledby="alerts-h" className="space-y-3">
            <h2 id="alerts-h" className="text-sm font-bold text-muted-foreground">هشدارهای کنترلی</h2>
            {alerts.map((a) => <CountTile key={a.title} {...a} tone="warn" />)}
          </section>
        )}
      </div>
    </>
  );
}
