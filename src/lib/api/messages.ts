import { isApiError } from "./client";

/** Turns any error into a message an office user can act on (Persian, no technical jargon). */
export function errorMessage(e: unknown): string {
  if (!isApiError(e)) return e instanceof Error && e.message ? e.message : "خطای پیش‌بینی‌نشده‌ای رخ داد. دوباره تلاش کنید.";
  if (e.kind === "config") return "سامانه هنوز به سرور متصل نشده است؛ این بخش پس از راه‌اندازی سرور اطلاعات را نمایش می‌دهد.";
  if (e.kind === "network") return "ارتباط با سرور برقرار نشد. اتصال شبکه، روشن بودن سرور و مجاز بودن دسترسی مرورگر (CORS) را بررسی کنید.";
  const detail = e.detail && e.detail !== e.title ? e.detail : undefined;
  switch (e.status) {
    case 400: {
      const fields = e.errors ? Object.values(e.errors).flat().join("، ") : "";
      return fields || detail || "اطلاعات واردشده معتبر نیست. فیلدهای مشخص‌شده را بررسی کنید.";
    }
    case 401: return "نشست کاری شما به پایان رسیده است. لطفاً دوباره وارد شوید.";
    case 403: return "شما مجوز انجام این عملیات را ندارید. در صورت نیاز با مدیر سامانه تماس بگیرید.";
    case 404: return detail || "اطلاعات موردنظر یافت نشد؛ ممکن است حذف یا ادغام شده باشد.";
    case 409: return detail || "این عملیات با وضعیت فعلی اطلاعات سازگار نیست؛ ممکن است همکار دیگری هم‌زمان آن را تغییر داده باشد. صفحه را بازخوانی کنید.";
    default:
      if (e.status >= 500) return "خطای داخلی سرور رخ داد. دوباره تلاش کنید؛ اگر تکرار شد کد پیگیری را به پشتیبانی اعلام کنید.";
      return detail || "درخواست انجام نشد.";
  }
}

export const traceIdOf = (e: unknown) => (isApiError(e) ? e.traceId : undefined);

/** Field-level validation messages from ProblemDetails.errors, keyed by lower-case field name. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!isApiError(e) || !e.errors) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(e.errors)) {
    const key = k.replace(/^\$\./, "").split(".").pop()!.toLowerCase();
    out[key] = v.join("، ");
  }
  return out;
}

export const isForbidden = (e: unknown) => isApiError(e) && e.status === 403;
export const isNotFound = (e: unknown) => isApiError(e) && e.status === 404;
