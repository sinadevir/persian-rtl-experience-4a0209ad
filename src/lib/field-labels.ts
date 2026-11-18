/**
 * Persian names for the technical field names the services return (camelCase or PascalCase).
 * Whole names are looked up first; otherwise the name is split into words, each word is
 * translated and the order is reversed (English "customerNumber" → Persian «شماره مشترک»).
 */
const WHOLE: Record<string, string> = {
  id: "شناسه", asof: "تاریخ مبنا", rowversion: "نسخه ردیف", validfrom: "معتبر از", validto: "معتبر تا",
  givenname: "نام", firstname: "نام", familyname: "نام خانوادگی", lastname: "نام خانوادگی", middlename: "نام میانی",
  fullname: "نام کامل", displayname: "نام نمایشی", nationalid: "کد ملی", nationalcode: "کد ملی",
  nationallegalid: "شناسه ملی", postalcode: "کد پستی", swiftcode: "کد سوئیفت", mobilephone: "تلفن همراه", mobile: "تلفن همراه",
  areasquaremeters: "مساحت (متر مربع)", isrecurringannual: "تکرار سالانه", recurring: "تکرارشونده",
  allowmultipleparties: "امکان چند شخص", allowmultiplepremises: "امکان چند ملک", allowscustomitems: "امکان مورد سفارشی",
  latitude: "عرض جغرافیایی", longitude: "طول جغرافیایی", constructionyear: "سال ساخت", birthdate: "تاریخ تولد",
  email: "رایانامه", phone: "تلفن", primaryphone: "تلفن اصلی", text: "متن", kind: "گونه", share: "سهم", score: "امتیاز",
  attempts: "تعداد تلاش", payload: "محتوای پیام", body: "محتوا", content: "محتوا", data: "داده‌ها", lasterror: "آخرین خطا",
  error: "خطا", failurereason: "علت خطا", aggregateid: "شناسه موجودیت", aggregatetype: "نوع موجودیت",
  nextattemptat: "زمان تلاش بعدی", processedat: "زمان پردازش", sentat: "زمان ارسال", publishedat: "زمان انتشار",
  messageid: "شناسه پیام", messagetype: "نوع پیام", sourcedomain: "سامانه مبدأ", targetdomain: "سامانه مقصد",
  consumername: "مصرف‌کننده", correlationid: "شناسه همبستگی", causationid: "شناسه علت", before: "پیش از تغییر", after: "پس از تغییر",
  customernumber: "شماره اشتراک", fromstatus: "وضعیت مبدأ", tostatus: "وضعیت مقصد",
};

const WORD: Record<string, string> = {
  a: "الف", b: "ب", action: "عملیات", active: "فعال", activity: "فعالیت", actor: "عامل", actual: "واقعی", address: "نشانی",
  administrative: "اداری", allow: "مجاز", allows: "مجاز", annual: "سالانه", appointment: "انتصاب", approved: "تأیید",
  area: "منطقه", asserted: "اعلامی", assertion: "اظهار", assignment: "تخصیص", association: "وابستگی", at: "زمان",
  attempt: "تلاش", audit: "حسابرسی", authority: "مرجع", authorization: "مجوز", bank: "بانک", birth: "تولد",
  blocked: "مسدود", building: "ساختمان", business: "کسب‌وکار", calendar: "تقویم", candidate: "نامزد",
  cardinality: "تعداد مجاز", case: "پرونده", category: "دسته", change: "تغییر", changed: "تغییر", channel: "کانال",
  city: "شهر", classification: "طبقه‌بندی", code: "کد", coding: "کدگذاری", company: "شرکت", completed: "تکمیل",
  conflict: "تعارض", construction: "ساخت", consumer: "مصرف‌کننده", contact: "راه ارتباطی", correction: "اصلاح",
  correlation: "همبستگی", count: "تعداد", county: "شهرستان", created: "ایجاد", current: "فعلی", custom: "سفارشی",
  customer: "مشترک", date: "تاریخ", decision: "تصمیم", declared: "اعلامی", default: "پیش‌فرض", description: "شرح",
  detail: "جزئیات", detected: "شناسایی", direction: "جهت", display: "نمایشی", dispute: "اختلاف", district: "ناحیه",
  division: "تقسیمات", document: "سند", domain: "سامانه", duplicate: "تکراری", effective: "اجرا", email: "رایانامه",
  entity: "موجودیت", entry: "رکورد", established: "تأسیس", event: "رویداد", exclusivity: "انحصار", executed: "اجرا",
  expected: "مورد انتظار", external: "خارجی", floor: "طبقه", grantee: "گیرنده", grantor: "دهنده", group: "گروه",
  history: "سابقه", holder: "دارنده", holiday: "تعطیلی", id: "شناسه", identity: "هویت", imposed: "اعمال",
  information: "اطلاعات", internal: "داخلی", issue: "صدور", issuing: "صادرکننده", item: "مورد", items: "موارد",
  latest: "آخر", legal: "حقوقی", lifecycle: "چرخه عمر", link: "پیوند", managerial: "مدیریتی", mapping: "نگاشت",
  merge: "ادغام", message: "پیام", meters: "متر", module: "ماژول", multiple: "چندگانه", name: "نام", national: "ملی",
  new: "جدید", number: "شماره", observed: "مشاهده‌شده", occupancy: "تصرف", occurred: "رخداد", of: "", opened: "گشایش",
  operation: "عملیات", order: "ترتیب", organization: "سازمان", organizational: "سازمانی", overlap: "هم‌پوشانی",
  owner: "مالک", ownership: "مالکیت", parameter: "پارامتر", parcel: "قطعه زمین", parties: "اشخاص", party: "شخص",
  payment: "پرداخت", percent: "درصد", permission: "مجوز دسترسی", phone: "تلفن", policy: "سیاست", position: "سمت",
  postal: "پستی", premises: "ملک", previous: "قبلی", primary: "اصلی", principal: "اصلی", proposed: "پیشنهادی",
  provider: "ارائه‌دهنده", province: "استان", reason: "دلیل", received: "دریافت", record: "سابقه", recorded: "ثبت",
  reference: "مرجع", register: "دفتر", registration: "ثبت", regulation: "مقرره", related: "مرتبط", relation: "نسبت",
  relationship: "ارتباط", request: "درخواست", requested: "درخواست", resolution: "حل", responsible: "مسئول",
  restricted: "محدود", restriction: "محدودیت", retry: "تلاش مجدد", revision: "بازنگری", right: "حق", role: "نقش",
  rule: "قاعده", scope: "دامنه", segment: "بخش", segregation: "تفکیک", service: "خدمات", sort: "مرتب‌سازی",
  source: "مبدأ", square: "مربع", standard: "استاندارد", start: "شروع", state: "وضعیت", status: "وضعیت",
  submitted: "ارسال", summary: "خلاصه", system: "سامانه", target: "مقصد", timeline: "رویدادنگار", timestamp: "زمان",
  title: "عنوان", transition: "انتقال", type: "نوع", unit: "واحد", usage: "کاربری", user: "کاربر", valid: "اعتبار",
  value: "مقدار", version: "نسخه", year: "سال", text: "متن", kind: "گونه", share: "سهم", score: "امتیاز",
  parent: "والد", sequence: "توالی", payload: "محتوا", error: "خطا", next: "بعدی", processed: "پردازش", sent: "ارسال",
  aggregate: "موجودیت", tenant: "سازمان", data: "داده",
};

const words = (key: string) => key.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/g)?.map((w) => w.toLowerCase()) ?? [];

/** Persian label for a field name; unknown words keep the original name so nothing is hidden. */
export function fieldLabel(key: string): string {
  const whole = WHOLE[key.toLowerCase()];
  if (whole) return whole;
  let ws = words(key);
  if (!ws.length) return key;
  let suffix = "";
  let prefix = "";
  const last = ws[ws.length - 1];
  if (ws.length > 1 && last === "en") { suffix = " (انگلیسی)"; ws = ws.slice(0, -1); }
  else if (ws.length > 1 && (last === "from" || last === "to" || last === "by")) { suffix = { from: " از", to: " تا", by: " توسط" }[last]; ws = ws.slice(0, -1); }
  if (ws.length > 1 && (ws[0] === "is" || ws[0] === "has")) { prefix = ws[0] === "has" ? "دارای " : ""; ws = ws.slice(1); }
  const rest = ws.join("");
  if (WHOLE[rest]) return prefix + WHOLE[rest] + suffix;
  // Merge known two-word names (familyName, nationalId…) before translating word by word.
  const parts: string[] = [];
  for (let i = 0; i < ws.length; i++) {
    const pair = ws[i]! + (ws[i + 1] ?? "");
    if (i + 1 < ws.length && WHOLE[pair]) { parts.push(WHOLE[pair]!); i++; continue; }
    const w = WORD[ws[i]!];
    if (w === undefined) return key;
    if (w) parts.push(w);
  }
  return prefix + parts.reverse().join(" ") + suffix;
}
