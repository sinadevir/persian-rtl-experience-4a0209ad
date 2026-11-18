import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/status";

const tones: [RegExp, string][] = [
  [/(?<!نا)سازگار|جاری|فعال|تأیید|اجراشده|منتشر|(?<!نا)موفق|معتبر|حل‌شده|قابل استفاده|پردازش‌شده|^active$|approved|completed|published|verified|resolved|healthy/i, "bg-success/15 text-success"],
  [/معلق|بررسی|انتظار|ارسال|تعارض|ناسازگار|محدود|اصلاح‌شده|پیش‌نویس|در حال|^draft$|submitted|review|pending|awaiting|executing|suspended|open/i, "bg-warning/20 text-warning-foreground"],
  [/قطع|رد|لغو|غیرفعال|ناموفق|خطا|پایان|ابطال|منقضی|برگشت|inactive|rejected|cancel|failed|ended|revoked|expired|terminated|disconnected|dead/i, "bg-destructive/15 text-destructive"],
];
/** Shows a server status in Persian with a consistent colour (green done, amber in progress, red stopped). */
export function StatusBadge({ status, className }: { status: string | undefined | null; className?: string }) {
  const label = statusLabel(status);
  const raw = String(status ?? "");
  const tone = tones.find(([r]) => r.test(label) || r.test(raw))?.[1] ?? "bg-secondary text-secondary-foreground";
  return <Badge variant="outline" className={cn("whitespace-nowrap border-transparent", tone, className)} title={raw && raw !== label ? raw : undefined}>{label}</Badge>;
}
