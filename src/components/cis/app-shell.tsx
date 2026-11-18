import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Loader2, CalendarDays, ChevronLeft } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logo from "@/assets/abfa-logo.png.asset.json";
import type { NavItem } from "@/lib/nav";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar, SidebarFooter, SidebarRail } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { navFlat, navGroups } from "@/lib/nav";
import { toJalaliLong, faDigits } from "@/lib/jalali";
import { useSession } from "@/lib/api/session";
import { usePermissions } from "@/lib/auth/permissions";
import { useDebounced } from "./entity-picker";
import { entitySources } from "@/features/pickers";

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [cmd, setCmd] = useState(false);
  const nav = useNavigate();
  const session = useSession();
  const perms = usePermissions();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && (e.code === "KeyK" || ["k", "ن"].includes(e.key.toLowerCase()))) { e.preventDefault(); setCmd((v) => !v); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  const groups = navGroups.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || perms.can(i.perm)) })).filter((g) => g.items.length);
  const current = [...navFlat].sort((a, b) => b.to.length - a.to.length).find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to)));
  const initials = (session?.displayName ?? "کارشناس سامانه").split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <SidebarProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:right-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">رفتن به محتوای اصلی</a>
      <Sidebar side="right" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <Link to="/" aria-label="میز کار" className="flex items-center gap-2.5 px-1 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-1">
            {/* white disc behind the logo so its blue ring stays visible on the logo-blue sidebar, open or collapsed */}
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card shadow-sm ring-1 ring-sidebar-border group-data-[collapsible=icon]:size-8">
              <img src={logo.url} alt="نشان آب و فاضلاب" className="size-full rounded-full object-contain p-0.5" />
            </span>
            <div className="leading-tight group-data-[collapsible=icon]:hidden">
              <div className="text-sm font-bold">سامانه امور مشترکین</div>
              <div className="text-xs text-sidebar-foreground/60">شرکت آب و فاضلاب</div>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {groups.map((g) => (
            <NavCategory key={g.label} label={g.label} items={g.items} activeTo={current?.to} />
          ))}
        </SidebarContent>
        <SidebarFooter className="text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {perms.status === "loading" && <div className="flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" />دریافت دسترسی‌ها…</div>}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card px-3 md:px-5">
          <SidebarTrigger aria-label="باز و بسته کردن منو" />
          <Breadcrumb className="hidden lg:block">
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">میز کار</Link></BreadcrumbLink></BreadcrumbItem>
              {current && current.to !== "/" && <><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>{current.title}</BreadcrumbPage></BreadcrumbItem></>}
            </BreadcrumbList>
          </Breadcrumb>
          <Button variant="outline" size="sm" className="ms-2 h-8 w-36 justify-start gap-1.5 px-2.5 text-xs font-normal text-muted-foreground lg:ms-4 lg:w-48" onClick={() => setCmd(true)}>
            <Search className="size-3.5" /><span className="truncate">جستجوی سریع…</span>
          </Button>
          <div className="mr-auto flex items-center gap-1 md:gap-2">
            {session && <Tooltip><TooltipTrigger asChild><span className="hidden rounded-md border px-2 py-1 text-xs text-muted-foreground xl:inline">سازمان {faDigits(session.tenantId)}</span></TooltipTrigger><TooltipContent>شناسه سازمان (Tenant) نشست فعلی</TooltipContent></Tooltip>}
            <span className="hidden items-center gap-1.5 text-sm text-muted-foreground xl:inline-flex"><CalendarDays className="size-4" />{toJalaliLong(new Date())}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button aria-label="حساب کاربری" className="rounded-full focus-visible:ring-2 focus-visible:ring-ring"><Avatar className="size-8"><AvatarFallback className="bg-secondary text-xs">{initials}</AvatarFallback></Avatar></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" alignOffset={12}>
                <DropdownMenuLabel>{session?.displayName ?? "کارشناس سامانه"}<div className="text-xs font-normal text-muted-foreground">{perms.roles.length ? perms.roles.join("، ") : session?.mode === "dev" ? "ورود حالت توسعه" : "کاربر سازمان"}</div></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs">نسخه آزمایشی — بدون اتصال به سرور</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 p-3 md:p-6">{children}</main>
      </SidebarInset>
      <GlobalSearch open={cmd} onOpenChange={setCmd} canCustomers={perms.can("Customer.Read")} />
    </SidebarProvider>
  );
}

/** A collapsible menu category: closed by default, opens itself when it holds the current page. */
function NavCategory({ label, items, activeTo }: { label: string; items: NavItem[]; activeTo?: string }) {
  const hasActive = items.some((i) => i.to === activeTo);
  const [open, setOpen] = useState(hasActive);
  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);
  const sidebar = useSidebar();
  const nav = useNavigate();
  // Collapsed (icons only): a click opens the menu, unfolds this category and goes to its first page.
  const openFromIcons = (e: MouseEvent) => {
    if (sidebar.isMobile || sidebar.state !== "collapsed") return;
    e.preventDefault();
    sidebar.setOpen(true);
    setOpen(true);
    if (!hasActive) void nav({ to: items[0]!.to });
  };
  const Lead = items[0]!.icon;
  return (
    <SidebarGroup className="py-0.5">
      <SidebarMenu>
        <Collapsible open={open} onOpenChange={setOpen} asChild className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={label} onClick={openFromIcons} className="font-semibold data-[state=open]:text-sidebar-accent-foreground" data-active-group={hasActive || undefined}>
                <Lead />
                <span>{label}</span>
                {hasActive && !open && <span className="size-1.5 rounded-full bg-sidebar-primary" aria-hidden />}
                <ChevronLeft className="mr-auto size-4 opacity-60 transition-transform duration-150 group-data-[state=open]/collapsible:-rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent className="nav-collapsible">
              <SidebarMenuSub className="border-sidebar-border">
                {items.map((it) => (
                  <SidebarMenuSubItem key={it.to}>
                    <SidebarMenuSubButton asChild isActive={activeTo === it.to}>
                      <Link to={it.to}><it.icon /><span>{it.title}</span></Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}

function GlobalSearch({ open, onOpenChange, canCustomers }: { open: boolean; onOpenChange: (v: boolean) => void; canCustomers: boolean }) {
  const nav = useNavigate();
  const perms = usePermissions();
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 350);
  const live = dq.length >= 2;
  const customers = useQuery({ queryKey: ["global-search", "customer", dq], queryFn: ({ signal }) => entitySources.customer.search(dq, signal), enabled: open && live && canCustomers, retry: false });
  const parties = useQuery({ queryKey: ["global-search", "party", dq], queryFn: ({ signal }) => entitySources.party.search(dq, signal), enabled: open && live && perms.can("Party.Read"), retry: false });
  const premises = useQuery({ queryKey: ["global-search", "premises", dq], queryFn: ({ signal }) => entitySources.premises.search(dq, signal), enabled: open && live && perms.can("Premises.Read"), retry: false });
  const go = (fn: () => void) => { fn(); onOpenChange(false); setQ(""); };
  const busy = customers.isFetching || parties.isFetching || premises.isFetching;
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={q} onValueChange={setQ} placeholder="شماره اشتراک، نام، کد ملی، کد ملک یا نام صفحه…" />
      <CommandList>
        {busy && <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />در حال جستجو در سرور…</div>}
        <CommandEmpty>{live ? "نتیجه‌ای یافت نشد" : "حداقل دو حرف وارد کنید"}</CommandEmpty>
        {(customers.data?.length ?? 0) > 0 && <CommandGroup heading="مشترکین">{customers.data!.map((c) => <CommandItem key={`c${c.value}`} value={`c-${c.value}-${c.label}-${c.hint}`} onSelect={() => go(() => nav({ to: "/customers/$id", params: { id: c.value } }))}><Users />{c.label}<span className="mr-auto text-xs text-muted-foreground">{c.hint}</span></CommandItem>)}</CommandGroup>}
        {(parties.data?.length ?? 0) > 0 && <CommandGroup heading="اشخاص">{parties.data!.map((c) => <CommandItem key={`p${c.value}`} value={`p-${c.value}-${c.label}-${c.hint}`} onSelect={() => go(() => nav({ to: "/parties/$id", params: { id: c.value } }))}>{c.label}<span className="mr-auto text-xs text-muted-foreground">{c.hint}</span></CommandItem>)}</CommandGroup>}
        {(premises.data?.length ?? 0) > 0 && <CommandGroup heading="املاک">{premises.data!.map((c) => <CommandItem key={`m${c.value}`} value={`m-${c.value}-${c.label}-${c.hint}`} onSelect={() => go(() => nav({ to: "/premises/$id", params: { id: c.value } }))}>{c.label}<span className="mr-auto text-xs text-muted-foreground">{c.hint}</span></CommandItem>)}</CommandGroup>}
        <CommandGroup heading="صفحات">{navFlat.filter((n) => !n.perm || perms.can(n.perm)).map((n) => <CommandItem key={n.to} value={`${n.title} ${n.keywords ?? ""}`} onSelect={() => go(() => nav({ to: n.to }))}><n.icon />{n.title}<span className="mr-auto text-xs text-muted-foreground">{n.group}</span></CommandItem>)}</CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function PageHeader({ title, desc, code, actions, children }: { title: string; desc?: string; code?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div className="min-w-0">
        {code && <div className="mb-1 font-mono text-xs text-primary">{code}</div>}
        <h1 className="text-xl font-bold text-foreground md:text-[1.4rem]">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
