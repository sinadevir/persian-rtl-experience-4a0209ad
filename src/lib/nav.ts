import { LayoutDashboard, Network, MapPinned, Database, Scale, ShieldCheck, History, CalendarDays, Cable, Users, UserPlus, IdCard, Building2, KeyRound, Handshake, Tags, Inbox, Landmark, FileClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { P, type PermissionCode } from "@/lib/auth/permission-codes";

export type NavItem = { to: string; title: string; icon: LucideIcon; perm?: PermissionCode | PermissionCode[]; keywords?: string };
export type NavGroup = { label: string; items: NavItem[] };

/** Menus follow what staff do day to day, not the backend module names. */
export const navGroups: NavGroup[] = [
  { label: "میز کار", items: [
    { to: "/", title: "میز کار من", icon: LayoutDashboard, keywords: "داشبورد" },
    { to: "/cases", title: "کارتابل درخواست‌ها", icon: Inbox, perm: [P.HistoryRead, P.ChangeRead, P.LifecycleReview, P.LifecycleApprove, P.LifecycleRequest], keywords: "پرونده تغییر وضعیت" },
  ] },
  { label: "خدمات مشترکین", items: [
    { to: "/customers", title: "جستجوی مشترک", icon: Users, perm: P.CustomerRead, keywords: "اشتراک" },
    { to: "/registration", title: "ثبت مشترک جدید", icon: UserPlus, perm: P.CustomerCreate },
    { to: "/parties", title: "اشخاص حقیقی و حقوقی", icon: IdCard, perm: P.PartyRead, keywords: "کد ملی" },
  ] },
  { label: "املاک", items: [
    { to: "/premises", title: "پرونده املاک", icon: Building2, perm: P.PremisesRead, keywords: "نشانی کد پستی" },
    { to: "/ownership", title: "مالکیت و تصرف", icon: KeyRound, perm: P.OwnershipRead, keywords: "مالک مستأجر تعارض" },
    { to: "/usage", title: "کاربری املاک", icon: Tags, perm: P.UsageRead, keywords: "مسکونی تجاری ناسازگاری" },
    { to: "/relationships", title: "روابط و اختیارات", icon: Handshake, perm: P.RelationshipRead, keywords: "وکالت نماینده اختلاف" },
  ] },
  { label: "اطلاعات پایه", items: [
    { to: "/organization", title: "ساختار سازمانی", icon: Network, perm: [P.OrganizationRead, P.OrganizationManage] },
    { to: "/service-areas", title: "محدوده‌های خدمات", icon: MapPinned, perm: P.GeographyManage },
    { to: "/reference", title: "کدها و اطلاعات پایه", icon: Database, perm: P.ReferenceManage },
    { to: "/regulations", title: "مقررات و پارامترها", icon: Scale, perm: P.RegulationManage },
    { to: "/calendar", title: "تقویم کاری", icon: CalendarDays, perm: P.CalendarRead },
    { to: "/banking", title: "بانک‌ها و درگاه‌ها", icon: Landmark, perm: P.BankingRead },
  ] },
  { label: "راهبری سامانه", items: [
    { to: "/access", title: "کاربران و نقش‌ها", icon: ShieldCheck, perm: P.AccessManage },
    { to: "/audit", title: "ردگیری تغییرات", icon: History, perm: P.AuditRead, keywords: "ممیزی لاگ" },
    { to: "/integration", title: "پایش یکپارچه‌سازی", icon: Cable, perm: P.IntegrationMonitor, keywords: "صف پیام" },
  ] },
];
export const navFlat = navGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
export const FileClockIcon = FileClock;
