import { DEMO_KEYS } from "./demo-keys";
import type { Rec } from "./list";

/**
 * Demo mode: while no server address is configured, reads return sample records so staff can see
 * how each screen looks. Remove this file's use in client.ts once the backend is connected.
 */
const FIRST = ["علی", "مریم", "حسین", "زهرا", "محمد", "فاطمه", "رضا", "سارا", "مهدی", "نرگس", "امیر", "لیلا"];
const LAST = ["احمدی", "رضایی", "محمدی", "حسینی", "کریمی", "موسوی", "جعفری", "نوری", "صادقی", "رحیمی", "کاظمی", "طاهری"];
const ORGS = ["شرکت نوین سازه", "مجتمع تجاری پارس", "دبیرستان فردوسی", "بیمارستان امید", "اداره کل راه", "هتل آسمان"];
const STREETS = ["خیابان آزادی", "بلوار کشاورز", "خیابان ولیعصر", "بلوار فردوس", "خیابان انقلاب", "خیابان شریعتی"];
const USAGES = ["مسکونی", "تجاری", "اداری", "آموزشی", "صنعتی", "درمانی", "فضای سبز"];
const STATUSES = ["Active", "Submitted", "UnderReview", "AwaitingExecution", "Completed", "Approved", "Active", "Suspended", "Failed", "Draft"];
const REASONS = ["درخواست کتبی مشترک", "اصلاح اطلاعات پس از بازدید میدانی", "تغییر کاربری ملک", "انتقال مالکیت", "دستور مدیریت منطقه"];
const TRANSITIONS = ["Suspend", "Reactivate", "Activate", "Close", "Reopen"];
const UNITS = ["منطقه یک", "منطقه دو", "منطقه سه", "امور مشترکین مرکزی", "واحد درآمد", "واحد فنی"];
const ROLES = ["کارشناس مشترکین", "کارشناس املاک", "مدیر منطقه", "مسئول درآمد", "راهبر سامانه"];
const MODULES = ["مشترکین", "املاک", "اشخاص", "اطلاعات پایه", "پرونده‌های تغییر"];
const ENTITIES = ["مشترک", "ملک", "شخص", "پرونده تغییر وضعیت", "محدودیت مشترک"];
const CITIES = ["تهران", "شمیرانات", "ری", "اسلامشهر"];

const at = <T,>(a: readonly T[], i: number) => a[((i % a.length) + a.length) % a.length] as T;
const pad = (n: number, w: number) => String(n).padStart(w, "0");
const date = (i: number, back = 0) => new Date(Date.UTC(2025, 2 + (i % 8), 1 + ((i * 7) % 27), 6 + (i % 10), (i * 13) % 60) - back * 86_400_000).toISOString();
const person = (i: number) => `${at(FIRST, i)} ${at(LAST, i * 5 + 3)}`;

function valueFor(k: string, i: number, seed: number): unknown {
  const n = seed * 100 + i + 1;
  const l = k.toLowerCase();
  if (l === "id") return n;
  if (/^(is|has|allow)/.test(k) || ["restricted", "blocked", "recurring"].includes(k)) return k === "isActive" ? i % 5 !== 4 : i % 3 === 0;
  if (l.endsWith("rowversion")) return "AAAAAAAAB9E=";
  if (l.endsWith("id")) return 1000 + ((n * 7) % 900);
  if (l.includes("status") || l === "state") return at(STATUSES, i + seed);
  if (l === "transitiontype") return at(TRANSITIONS, i);
  if (l === "nationalid" || l === "nationalcode" || l === "principalnationalid") return `00${pad(12345678 + n * 9173, 8)}`;
  if (l === "nationallegalid") return `1010${pad(n * 731, 7)}`;
  if (l.includes("postalcode")) return `13${pad(n * 4813, 8)}`.slice(0, 10);
  if (l.includes("mobile") || l.includes("phone")) return `0912${pad(n * 3571, 7)}`.slice(0, 11);
  if (l === "email") return `user${n}@abfa.ir`;
  if (l.includes("latitude")) return 35.7 + (i % 10) / 100;
  if (l.includes("longitude")) return 51.4 + (i % 10) / 100;
  if (/(percent|share)$/.test(l)) return [100, 50, 33.3, 25][i % 4];
  if (/(score)$/.test(l)) return 70 + ((i * 7) % 30);
  if (/(count|attempts|number)$/.test(l) && !/(customer|case|request|dispute|registration|item|unit)number/.test(l)) return l === "floornumber" ? (i % 6) + 1 : (i % 9) + 1;
  if (/(sortorder|revisionnumber|retrycount|area|squaremeters|year)/.test(l)) return l.includes("year") ? 1380 + (i % 40) : l.includes("area") || l.includes("square") ? 80 + ((i * 37) % 400) : i + 1;
  // Match the camelCase ending so words like "action", "reason" or "description" are not mistaken for dates.
  if (/(At|Date|From|On|To|Timestamp)$/.test(k) || ["date", "asOf", "timestamp"].includes(k)) return date(i, seed);
  if (l === "givenname" || l === "firstname" || l.endsWith("givenname")) return at(FIRST, i);
  if (l === "familyname" || l === "lastname" || l.endsWith("familyname")) return at(LAST, i * 5 + 3);
  if (/(partyname|fullname|displayname|principalname|holdername|ownername|granteename|grantorname|consumername|actordisplayname|username|actorusername|requestedby|createdby|changedby)$/.test(l)) return i % 4 === 3 ? at(ORGS, i) : person(i);
  if (/organizationname$/.test(l) || l === "companyname") return at(ORGS, i);
  if (/(classificationname|usagename|legalusage|declaredusage|assertedusage|observedactivity|activityname|activitytypename)/.test(l)) return at(USAGES, i);
  if (/(unitname|organizationalunit|areaname|divisionname)/.test(l)) return at(UNITS, i);
  if (/rolename|positiontitle/.test(l)) return at(ROLES, i);
  if (/(address|addresstext)$/.test(l) || l === "primaryaddress") return `${at(CITIES, i)}، ${at(STREETS, i)}، پلاک ${(i * 13) % 200 + 1}`;
  if (/(reason|description|summary|message|detail|text|resolutionsummary)$/.test(l)) return at(REASONS, i + seed);
  if (l === "customernumber" || l === "number") return `${pad(4100000 + n * 37, 7)}`;
  if (/(casenumber|requestnumber|disputenumber|registrationnumber|itemnumber)$/.test(l)) return `۱۴۰۴/${pad(n, 5)}`;
  if (l.endsWith("code") || l === "code") return `${(k.length * 37) % 90 + 10}${pad(n, 4)}`;
  if (l.endsWith("name") || l === "title" || l === "name") return `${at(["نمونه", "ردیف", "مورد"], seed)} ${at(USAGES, i)} ${i + 1}`;
  if (l === "partytype") return i % 4 === 3 ? "Organization" : "Individual";
  if (l === "direction") return at(["ورودی", "خروجی"], i);
  if (l === "module" || l === "modulecode") return at(MODULES, i + seed);
  if (l === "entitytype" || l === "internalentitytype" || l === "targettype") return at(ENTITIES, i + seed);
  if (/(eventtype|messagetype|entitytype|internalentitytype|targettype|action|changetype|operationcode|module|modulecode|systemtype|providertype|channeltype|datatype|regulationtype|holidaytype|divisiontype|companytype|areatype|unittype|disputetype|conflicttype|casetype|restrictiontype|contacttype|linktype|assertiontype|kind|category)$/.test(l)) return at(["ثبت", "ویرایش", "تأیید", "ابطال", "انتقال", "اصلاح"], i + seed);
  if (l === "type" || l.endsWith("type") || l === "role") return (i % 3) + 1;
  if (l === "value" || l.endsWith("value")) return String((i + 1) * 1000);
  return `${at(USAGES, i)} ${i + 1}`;
}

export function demoRecord(i: number, seed = 0): Rec {
  const r: Rec = {};
  for (const k of DEMO_KEYS) r[k] = valueFor(k, i, seed);
  return r;
}

const seedOf = (path: string) => [...path].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 7, 0);

/** One response shape that serves list, paged and single-item readers alike. */
export function demoResponse(path: string, query?: Record<string, unknown>): unknown {
  if (path === "/health") return { status: "Healthy" };
  const seed = seedOf(path);
  const idMatch = path.match(/\/(\d+)(?:\/|$)/);
  const size = Math.min(Number(query?.pageSize ?? 8) || 8, 8);
  const page = Number(query?.page ?? 1) || 1;
  const items = Array.from({ length: size }, (_, i) => demoRecord(i + (page - 1) * size, seed));
  const base = demoRecord(idMatch ? Number(idMatch[1]) % 12 : 0, seed);
  if (idMatch) base["id"] = Number(idMatch[1]);
  return { ...base, items, totalCount: 24 + seed * 3, page, pageSize: size };
}
