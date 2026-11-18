# B04 ـ قراردادهای یکپارچه‌سازی کاربری و طبقه‌بندی

**وضعیت:** قراردادهای تولیدکننده در `PropertyDomain.WebApi` پیاده‌سازی شده‌اند. هیچ مصرف‌کننده تعرفه، صورتحساب یا سامانه پایین‌دستی دیگری در این ماژول پیاده‌سازی یا مفروض نشده است.

## مرز مسئولیت‌ها

| تعامل | قرارداد/سازوکار | مرز مسئولیت |
|---|---|---|
| B04 → B03 | کلید خارجی Tenant-scoped از `B04.UsageSegment` به `B03.Premises`؛ بدون رویداد | B03 مالک هویت و چرخه عمر Premises است؛ B04 مالک UsageSegment و واقعیت‌های کاربری است. |
| B06 → B04 | ارجاع مستقیم Tenant-scoped به UsageSegment برای AuthorizationScope و بررسی مجوز | B06 مالک رابطه، مجوز، Scope و تصمیم دسترسی است؛ B04 مالک هویت UsageSegment است. |
| B04 → مصرف‌کننده آتی تعرفه/صورتحساب | سه رویداد قانونی شرح‌داده‌شده در ادامه | B04 واقعیت قانونی کاربری را منتشر می‌کند؛ تفسیر تعرفه، محاسبه، اثر صورتحساب و Inbox مصرف‌کننده بر عهده سامانه مصرف‌کننده آینده است. |
| B04 → B07 Timeline مشترک | قرارداد مستقیم فعلی وجود ندارد | رویدادهای B04 واقعیت Premises/UsageSegment هستند و ارتباط Customer را اثبات نمی‌کنند. |
| تخصیص عملیاتی B04 | رویداد تعرفه‌ای منتشر نمی‌شود | تخصیص عملیاتی مشاهده/ثبت عملیاتی است و حقیقت قانونی کاربری محسوب نمی‌شود. |

## پوش پیام

پیام‌ها از Envelope مشترک با `schemaVersion=1` و JSON camelCase استفاده می‌کنند:

```json
{
  "messageId": "GUID",
  "messageType": "PremisesUsageChanged",
  "sourceDomain": "B04",
  "schemaVersion": 1,
  "occurredAt": "2026-11-15T12:00:00Z",
  "correlationId": "GUID",
  "causationId": "GUID",
  "data": {}
}
```

`messageId` یک‌بار تولید و در تمام Retryها ثابت نگه داشته می‌شود. `occurredAt` زمان ثبت رویداد در تولیدکننده است؛ `effectiveFrom` و مرزهای اصلاح، زمان اعتبار کسب‌وکاری هستند.

## `PremisesUsageChanged` ـ تغییر رو به جلوی تخصیص قانونی

**تولیدکننده:** B04. هنگام ثبت تخصیص Legal از مسیر عادی یا اجرای موفق UsageChangeCase منتشر می‌شود.

| فیلد | نوع | معنا |
|---|---|---|
| `tenantId` | int64 | مرز Tenant |
| `premisesId` | int64 | ملک مالک Segment |
| `usageSegmentId` | int64 | بخش منطقی کاربری |
| `assignmentType` | string | در این قرارداد همیشه `Legal` |
| `oldUsage` | int64/null | طبقه‌بندی قانونی جاری قبلی؛ در نبود مقدار قبلی null |
| `newUsage` | int64 | طبقه‌بندی قانونی جدید |
| `effectiveFrom` | UTC datetime | ابتدای بازه اعتبار تخصیص جدید |
| `caseId` | int64/null | پرونده UsageChangeCase مسبب، در صورت وجود |

تخصیص عملیاتی این پیام را تولید نمی‌کند. مصرف‌کننده باید آن را تغییر Timeline قانونی بداند، نه دستور محاسبه تعرفه.

## `PremisesUsageAssignmentReversed` ـ معکوس‌سازی جبرانی

**تولیدکننده:** B04. فقط برای معکوس‌سازی تخصیص Legal منتشر می‌شود.

| فیلد | نوع | معنا |
|---|---|---|
| `tenantId`, `premisesId`, `usageSegmentId` | int64 | Tenant و محدوده کاربری |
| `assignmentType` | string | همیشه `Legal` |
| `reversedUsageAssignmentId` | int64 | تخصیصی که اثر آن جبران می‌شود |
| `restoredUsageAssignmentId` | int64/null | ردیف تخصیص جبرانی جدید، اگر مقدار قبلی بازگردانده شود |
| `reversedUsageClassificationId` | int64 | طبقه‌بندی تخصیص معکوس‌شده |
| `restoredUsageClassificationId` | int64/null | طبقه‌بندی قبلی بازیابی‌شده؛ null یعنی پس از مرز معکوس‌سازی تخصیصی ثبت نشده |
| `effectiveFrom` | UTC datetime | مرز اعتبار معکوس‌سازی |
| `usageAssignmentReversalId` | int64 | شناسه ممیزی تغییرناپذیر معکوس‌سازی |
| `recordedAt` | UTC datetime | زمان ثبت تراکنشی |
| `reason` | string | دلیل کسب‌وکاری ثبت‌شده |
| `recordedBy` | int64/null | شناسه عامل، در صورت وجود |

این پیام اقدام جبرانی است؛ نه حذف و نه اصلاح تاریخی. مصرف‌کننده نباید آن را به‌عنوان تغییر عادی رو به جلو تفسیر کند.

## `PremisesUsageAssignmentCorrected` ـ بازسازی تاریخی Timeline قانونی

**تولیدکننده:** B04. فقط برای اصلاح تاریخی تخصیص Legal منتشر می‌شود.

| فیلد | نوع | معنا |
|---|---|---|
| `tenantId`, `premisesId`, `usageSegmentId` | int64 | Tenant و محدوده کاربری |
| `assignmentType` | string | همیشه `Legal` |
| `usageAssignmentCorrectionId` | int64 | شناسه سربرگ اصلاح تغییرناپذیر |
| `correctionFrom`, `correctionTo` | UTC datetime | بازه نیمه‌باز اصلاح‌شده `[from,to)` |
| `recordedAt` | UTC datetime | زمان ثبت تراکنشی |
| `reason` | string | دلیل ثبت‌شده |
| `recordedBy` | int64/null | عامل ثبت، در صورت وجود |
| `supersededAssignmentIds` | int64[] | ردیف‌های تخصیص منبع که با اصلاح بسته شده‌اند |
| `resultingSlices` | object[] | ردیف‌های تخصیص حاصل به همراه طبقه‌بندی و بازه اعتبار |

هر Slice شامل `usageAssignmentId`، `usageClassificationId`، `validFrom` و `validTo` است؛ `validTo` برای بخش باز می‌تواند null باشد. بازه اصلاح‌شده محدود و متناهی است و Sliceهای حاصل دقیقاً آن را افراز می‌کنند. بخش‌های حفظ‌شده خارج از بازه نیز ممکن است در مجموعه نتیجه باشند. مصرف‌کننده باید بازه مربوط را بازسازی/تطبیق کند؛ پردازش صرف آخرین مقدار `newUsage` یا اعمال آن به‌عنوان Delta رو به جلو نادرست است.

## تحویل، ترتیب و Idempotency

- تحویل حداقل یک‌بار است؛ Receiver باید پیش از پاسخ موفق، پیام را پایدار بپذیرد.
- کلید Inbox: `(tenantId, consumerName, sourceDomain, messageId)`؛ Hash محتوا ذخیره شود. شناسه و محتوای یکسان تکرار قابل پذیرش است؛ شناسه یکسان با محتوای متفاوت تعارض است.
- `correlationId` گردش کار را گروه‌بندی می‌کند و `causationId` رویداد مسبب را نشان می‌دهد؛ هیچ‌کدام جایگزین `messageId` نیست.
- ترتیب سراسری میان UsageSegmentها تضمین نشده است. برای یک Segment نیز مصرف‌کننده باید زمان اعتبار/ثبت و داده‌های واقعی را تطبیق دهد و به ترتیب رسیدن HTTP تکیه نکند.
- Inbox مصرف‌کننده و اثر محلی آن باید اتمیک Commit شوند. تراکنش توزیع‌شده یا Exactly-once تضمین نشده است.
- نسخه فعلی `schemaVersion=1` است؛ تغییر ناسازگار به افزایش نسخه و استقرار هماهنگ نیاز دارد.

## مسیر اختصاصی خروجی

- `Integration:Events:B04`: نشانی Receiver اختصاصی.
- `Integration:EventKeys:B04`: کلید اختصاصی اختیاری؛ در نبود آن `Integration:OutboundApiKey` استفاده می‌شود.

اگر مقصد خالی باشد، پیام‌ها در `Shared.OutboxMessage` پایدار و در انتظار می‌مانند و به `Integration:OutboxEndpoint` ارسال نمی‌شوند. این رفتار تا زمان طراحی و استقرار مصرف‌کننده واقعی مورد انتظار است.
