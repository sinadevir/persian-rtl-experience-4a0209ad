import { toJalaali, toGregorian, jalaaliMonthLength } from "jalaali-js";
const valid = (d: Date | string | undefined | null) => { if (!d) return null; const x = new Date(d); return Number.isNaN(x.getTime()) ? null : x; };
const pad = (n: number) => String(n).padStart(2, "0");
const fa = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
const weekdayNames = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const monthNames = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
/** Right-to-left mark before each slash: without it the browser lays «۱۴۰۴/۰۲/۲۵» out left-to-right (day on the right); with it the year sits on the right and the date reads right-to-left. */
export const RLM = "\u200F";
/** Solar Hijri date «۱۴۰۴/۰۲/۲۵», laid out right-to-left; returns "—" for empty or invalid values so tables never show "Invalid Date". */
export const toJalali = (d: Date | string | undefined | null) => { const x = valid(d); if (!x) return "—"; const j = toJalaali(x); return fa(`${j.jy}${RLM}/${pad(j.jm)}${RLM}/${pad(j.jd)}`); };
/** Long Persian date «چهارشنبه ۲۷ آبان ۱۴۰۵» (day, month, year in Persian order). */
export const toJalaliLong = (d: Date | string) => { const x = valid(d); if (!x) return "—"; const j = toJalaali(x); return `${weekdayNames[x.getDay()]} ${fa(j.jd)} ${monthNames[j.jm - 1]} ${fa(j.jy)}`; };
/** Solar Hijri date with time «۱۴۰۴/۰۲/۲۵، ساعت ۱۰:۳۰». */
export const toJalaliDateTime = (d: Date | string | undefined | null) => { const x = valid(d); if (!x) return "—"; return `${toJalali(x)}، ساعت ${fa(`${pad(x.getHours())}:${pad(x.getMinutes())}`)}`; };
export const faNum = (n: number | string | undefined | null) => (n === undefined || n === null || n === "" ? "—" : Number.isNaN(Number(n)) ? String(n) : Number(n).toLocaleString("fa-IR"));
export const faDigits = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
export const faToEnDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
export const jMonths = monthNames;
export const jWeekdays = ["ش","ی","د","س","چ","پ","ج"];
export const gToJ = (d: Date) => toJalaali(d);
export const jToDate = (jy: number, jm: number, jd: number) => { const g = toGregorian(jy, jm, jd); return new Date(g.gy, g.gm - 1, g.gd); };
export const jMonthLength = (jy: number, jm: number) => jalaaliMonthLength(jy, jm);
/** index of weekday where Saturday = 0 */
export const persianWeekday = (d: Date) => (d.getDay() + 1) % 7;
/** yyyy-mm-dd for DateOnly API fields, using the local calendar day the user picked. */
export const toDateOnly = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
