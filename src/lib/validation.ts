import { faToEnDigits } from "./jalali";

/** Iranian national code (کد ملی): 10 digits with the official mod-11 check digit. */
export function isValidNationalId(input: string) {
  const v = faToEnDigits(input).trim();
  if (!/^\d{10}$/.test(v) || /^(\d)\1{9}$/.test(v)) return false;
  const digits = v.split("").map(Number);
  const sum = digits.slice(0, 9).reduce((a, d, i) => a + d * (10 - i), 0);
  const r = sum % 11;
  const check = digits[9]!;
  return r < 2 ? check === r : check === 11 - r;
}

/** Iranian legal entity national id (شناسه ملی): 11 digits with its weighted check digit. */
export function isValidLegalId(input: string) {
  const v = faToEnDigits(input).trim();
  if (!/^\d{11}$/.test(v)) return false;
  const d = v.split("").map(Number);
  const dec = d[9]! + 2;
  const weights = [29, 27, 23, 19, 17];
  const sum = d.slice(0, 10).reduce((a, x, i) => a + (x + dec) * weights[i % 5]!, 0);
  const r = sum % 11;
  return d[10] === (r === 10 ? 0 : r);
}

export const isValidMobile = (input: string) => /^09\d{9}$/.test(faToEnDigits(input).trim());
export const isValidPostalCode = (input: string) => /^\d{10}$/.test(faToEnDigits(input).trim());

export type Rule = "nationalId" | "legalId" | "mobile" | "postalCode" | "integer" | "percent";

export function checkRule(rule: Rule, value: string): string | undefined {
  if (!value) return undefined;
  switch (rule) {
    case "nationalId": return isValidNationalId(value) ? undefined : "کد ملی ۱۰ رقمی معتبر نیست";
    case "legalId": return isValidLegalId(value) ? undefined : "شناسه ملی ۱۱ رقمی معتبر نیست";
    case "mobile": return isValidMobile(value) ? undefined : "شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود";
    case "postalCode": return isValidPostalCode(value) ? undefined : "کد پستی باید ۱۰ رقم باشد";
    case "integer": return /^-?\d+$/.test(faToEnDigits(value)) ? undefined : "فقط عدد صحیح مجاز است";
    case "percent": { const n = Number(faToEnDigits(value)); return n > 0 && n <= 100 ? undefined : "درصد باید بیشتر از صفر و حداکثر ۱۰۰ باشد"; }
  }
}
