/** Persian labels for status values returned by the backend. Unknown values are shown as-is. */
const LABELS: Record<string, string> = {
  draft: "پیش‌نویس", submitted: "ارسال‌شده", underreview: "در حال بررسی", inreview: "در حال بررسی", review: "در حال بررسی",
  approved: "تأییدشده", rejected: "ردشده", cancelled: "لغوشده", canceled: "لغوشده", awaitingexecution: "در انتظار اجرا",
  executing: "در حال اجرا", completed: "اجراشده", executed: "اجراشده", partiallycompleted: "اجرای ناقص", failed: "اجرای ناموفق",
  executionfailed: "اجرای ناموفق", superseded: "جایگزین‌شده", pending: "در انتظار", active: "فعال", inactive: "غیرفعال",
  suspended: "معلق", disconnected: "قطع", terminated: "خاتمه‌یافته", closed: "بسته‌شده", open: "باز", opened: "باز",
  resolved: "حل‌شده", ended: "پایان‌یافته", revoked: "ابطال‌شده", lifted: "رفع‌شده", released: "رفع‌شده", expired: "منقضی",
  merged: "ادغام‌شده", published: "منتشرشده", retired: "بازنشسته", deprecated: "منسوخ", verified: "تأییدشده",
  unverified: "تأییدنشده", processed: "پردازش‌شده", deadletter: "ناموفق نهایی", blocked: "مسدود", restricted: "محدود",
  individual: "حقیقی", organization: "حقوقی", true: "بله", false: "خیر",
};

export const statusLabel = (v: unknown) => {
  if (v === undefined || v === null || v === "") return "—";
  const s = String(v);
  return LABELS[s.replace(/[\s_-]/g, "").toLowerCase()] ?? s;
};

/** Server statuses for workflow cases, used for queue filters. */
export const OPEN_CASE_STATUSES = ["Draft", "Submitted", "UnderReview", "Approved", "AwaitingExecution", "Executing", "Failed"] as const;
export const isClosedStatus = (v: unknown) => ["completed", "rejected", "cancelled", "canceled", "executed"].includes(String(v ?? "").toLowerCase());
