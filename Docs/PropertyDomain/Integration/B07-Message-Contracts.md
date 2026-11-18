# B07 ـ قراردادهای پیام چرخه عمر مشترک و Timeline

تمام پیام‌ها از پوش JSON با نام‌گذاری camelCase استفاده می‌کنند:

```json
{
  "messageId": "GUID",
  "messageType": "CustomerStatusChanged",
  "sourceDomain": "B05",
  "schemaVersion": 1,
  "occurredAt": "2026-11-14T12:00:00Z",
  "correlationId": "GUID",
  "causationId": "GUID",
  "data": {
    "tenantId": 42,
    "customerId": 1001,
    "previousStatus": "Pending",
    "newStatus": "Active",
    "transitionType": "Activate",
    "effectiveAt": "2026-11-14T12:00:00Z",
    "sourceCaseId": 2001
  }
}
```

## ۱. دریافت رویداد دامنه در B07

**مسیر:** `POST /api/v1/integration/customer-domain-events`

Headerها: `Content-Type: application/json` و `X-Integration-Key: <domain-specific secret>`. کلیدهای ورودی از `Integration:InboundKeys:B01` تا `Integration:InboundKeys:B06` خوانده می‌شوند؛ `Integration:InboundApiKey` فقط مقدار جایگزین عمومی است.

فیلدهای الزامی در `data`:

- `tenantId` عدد صحیح مثبت
- `customerId` عدد صحیح مثبت؛ حوزه مبدأ باید معتبر بودن ارتباط Aggregate خود با Customer را تضمین کند.
- `recordedAt`، `aggregateId`، `aggregateVersion` و `displayData` اختیاری‌اند.

فقط `sourceDomain`های `B01` تا `B06` پذیرفته می‌شوند. تا زمان استقرار قرارداد نسخه‌دار جدید، `schemaVersion` باید 1 باشد. `displayData` شیء JSON کوچک با حداکثر 4KB است و نباید داده حساس شخصی یا مالی داشته باشد. B07 پیام را با Consumer برابر `B07.CustomerDomainEvents` ذخیره می‌کند و وجود Customer در Tenant داده‌شده را بررسی می‌کند؛ اثبات رابطه Aggregate مبدأ با Customer بر عهده حوزه مبدأ است.

## ۲. فرمان اجرای تغییر اطلاعات

B07 پیام `ExecuteCustomerInformationChangeItem` را از طریق Shared Outbox منتشر می‌کند. فیلدهای `data` عبارت‌اند از:

- `tenantId`، `commandId`، `requestId`، `itemId`، `customerId`
- `targetDomain`، `targetReferenceType`، `targetReferenceId`
- `changeType`، `proposedValue`، `proposedValueVersion`، `proposedValueSchemaVersion`
- `correlationId`

فرمان به `Integration:Domains:<targetDomain>` هدایت می‌شود. Adapter مقصد باید پیش از اعمال اثر، Inbox/رسید فرمان خود را با کلید `(tenantId, commandId)` ثبت کند. Retry یک Item باید همان `commandId` اولیه را استفاده کند.

## ۳. رویداد نتیجه تغییر اطلاعات

حوزه مقصد یک Envelope ورودی عادی به B07 ارسال می‌کند و `sourceDomain` را برابر حوزه خودش قرار می‌دهد. `data` باید شامل `tenantId`، `customerId`، `commandId` و `outcome` باشد. مقادیر پشتیبانی‌شده `Completed`، `Rejected`، `Failed` و `Unknown` هستند. فیلدهای اختیاری: `resultReference`، `failureCode`، `failureReason`، `recordedAt`، `aggregateId`، `aggregateVersion` و `displayData`.

`Unknown` یعنی مقصد نمی‌تواند موفقیت یا شکست را اثبات کند. B07 آیتم را در `AwaitingExecution` نگه می‌دارد؛ Retry باید همان `commandId` را به‌کار ببرد.

## ۴. معنای تحویل و Idempotency

- Endpointهای یکپارچه‌سازی خارج از Development باید HTTPS باشند.
- تحویل Outbox حداقل یک‌بار از طریق HTTP است؛ انتقال Exactly-once تضمین نمی‌شود.
- مصرف‌کننده باید با Inbox تکرار را حذف کند.
- پاسخ موفق HTTP یعنی Receiver پیام را به‌صورت پایدار پذیرفته است، نه اینکه فرمان کسب‌وکاری حتماً اجرا شده باشد.
- تراکنش توزیع‌شده استفاده نمی‌شود.

## ۵. پیام‌های B02 و مسیر مستقل رویدادها

پیام‌های B02 به Endpoint رویدادهای Customer ارسال نمی‌شوند. Receiver مستقل با `Integration:Events:B02` و کلید `Integration:EventKeys:B02` تنظیم می‌شود؛ در نبود کلید اختصاصی، `Integration:OutboundApiKey` استفاده می‌شود. پیام‌های فعلی B02 عبارت‌اند از `OwnershipRegisterCreated`، `OwnershipStateVersionRecorded`، `OccupancyRightGranted`، `OccupancyRightEnded` و `OccupancyRecorded`. قرارداد مصرف‌کننده B02 باید پیش از فعال‌سازی Receiver، Idempotency را مشخص کند.

## ۶. کاتالوگ پیام‌های Sprint 10 ـ نسخه 1

همه پیام‌های این بخش از Envelope بالا استفاده می‌کنند. `messageId` یک‌بار توسط تولیدکننده ساخته می‌شود و در تمام Retryهای انتقال باید ثابت بماند. مصرف‌کننده `(tenantId, consumerName, sourceDomain, messageId)` را در Inbox و در همان تراکنش اثر کسب‌وکاری ثبت می‌کند. پیام تکراری با payload یکسان بدون اعمال مجدد اثر تأیید می‌شود؛ استفاده مجدد از `messageId` با payload متفاوت رد می‌شود.

### `CustomerCreated` ـ B05 به مصرف‌کنندگان یکپارچه‌سازی

`data`: `tenantId`، `customerId`، `customerNumber`، `status`، `createdBy` و `occurredAt`.

### `CustomerStatusChanged` ـ B05 به مصرف‌کنندگان یکپارچه‌سازی

`data`: `tenantId`، `customerId`، `previousStatus`، `newStatus`، `effectiveAt`، `sourceCaseId`، `transitionType` و `rowVersion`.

### `PremisesUsageChanged` ـ B04 به مصرف‌کنندگان یکپارچه‌سازی

`data`: `tenantId`، `premisesId`، `usageSegmentId`، `assignmentType`، `oldUsage`، `newUsage`، `effectiveFrom` و `caseId`. جزئیات اصلاح و معکوس‌سازی در `B04-Message-Contracts.md` است.

### `ExecuteCustomerInformationChangeItem` ـ B07 به حوزه مقصد

`data`: `tenantId`، `commandId`، `requestId`، `itemId`، `customerId`، `targetDomain`، `targetReferenceType`، `targetReferenceId`، `changeType`، `proposedValue`، `proposedValueVersion`، `proposedValueSchemaVersion` و `correlationId`.

`commandId` کلید Idempotency کسب‌وکاری پایدار است. B07 هنگام Retry همان `commandId` را نگه می‌دارد. حوزه دریافت‌کننده باید پیش از اعمال اثر، رسید فرمان را با `(tenantId, commandId)` ثبت کند. فرمان تکراری با Hash درخواست Canonical یکسان، نتیجه ذخیره‌شده را بازمی‌گرداند؛ شناسه فرمان یکسان با Hash متفاوت تعارض است و نباید اجرا شود.

## ۷. قواعد Inbox و نتیجه فرمان

- Deduplication رویداد: `(TenantId, ConsumerName, SourceDomain, MessageId)`.
- Deduplication نتیجه فرمان: `(TenantId, ConsumerName, SourceDomain, CommandId)`، وقتی Envelope نتیجه شامل `commandId` و `outcome` باشد.
- نتیجه یک فرمان با `messageId` جدید اما `commandId` و Outcome یکسان، قبلاً پردازش‌شده تلقی می‌شود. Outcome نهایی متعارض برای یک `commandId` قبلی رد می‌شود.
- ثبت Inbox، تغییر Projection، به‌روزرسانی آیتم چرخه عمر و Checkpoint باید اتمیک Commit شوند. شکست تراکنش همه را Rollback می‌کند تا تحویل مجدد امن باشد.
- Outbox حداقل یک‌بار است، نه Exactly-once. Receiver فقط پس از پذیرش پایدار Inbox باید پاسخ موفق بدهد.

## ۸. سیاست Retry و Dead Letter

- `Integration:OutboxMaxAttempts` مقدار پیش‌فرض 10 دارد و به بازه 1 تا 100 محدود می‌شود.
- Retry با تأخیر نمایی شروع‌شونده از 4 ثانیه و سقف 900 ثانیه انجام می‌شود.
- پس از رسیدن به سقف تلاش، `DeadLetteredAt` ثبت می‌شود و پیام از Dispatch خودکار خارج می‌شود.
- Endpoint وضعیت عملیات، `PendingCount`، `RetryingCount`، `FailedAttemptsCount`، `DeadLetteredCount`، `DispatchedLast24Hours` و `OldestPendingAt` را گزارش می‌کند.
- اپراتور دارای مجوز `System.Integration.Retry` می‌تواند با `POST /api/operations/integration/outbox/{messageId}/retry` پیام Dead Letter را دوباره در صف قرار دهد؛ Retry دستی نشانگر Dead Letter را پاک و شمارنده تلاش را صفر می‌کند.
- پس از Baseline یکپارچه، Migration `Database/PropertyDomain-Migrations.sql` باید اعمال شود.

## ۹. پیام‌های محدودیت مشترک

### `CustomerRestrictionApplied` ـ B05

`data`: `tenantId`، `customerId`، `restrictionId`، `restrictionType`، `effectiveFrom` و `effectiveTo`.

### `CustomerRestrictionLifted` ـ B05

`data`: `tenantId`، `customerId`، `restrictionId`، `restrictionType` و `liftedAt`.

کدهای عملیاتی محدودیت که در مرز فرمان چرخه عمر مشترک کنترل می‌شوند: `NoDisconnect` عملیات `Suspend` و `Close` را مسدود می‌کند؛ `NoNewConnection` عملیات `Activate`، `Reactivate` و `Reopen` را مسدود می‌کند. کنترل محدودیت در Handler مرجع B05 دوباره انجام می‌شود؛ بنابراین محدودیتی که پس از ایجاد Case و پیش از Execute اعمال شود نیز از انتقال ممنوع جلوگیری می‌کند. محدودیت رفع‌شده دیگر مانع انتقال نیست.

## ۱۰. مسیریابی B06

رویدادهای Relationship و Authorization در B06 به Receiver اختصاصی `Integration:Events:B06` ارسال می‌شوند. کلید اختیاری آن `Integration:EventKeys:B06` است. این پیام‌ها به Endpoint عمومی رویدادهای Customer ارسال نمی‌شوند. جزئیات نسخه و Payload در `B06-Message-Contracts.md` آمده است.
