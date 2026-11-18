# B06 ـ قراردادهای یکپارچه‌سازی روابط و مجوزها

تمام پیام‌های B06 از `IntegrationEnvelope<T>` استفاده می‌کنند: `messageId`، `messageType`، `sourceDomain=B06`، `schemaVersion`، `occurredAt`، `correlationId` اختیاری، `causationId` اختیاری و `data`. نسخه پیام‌های قدیمی 1 و نسخه پیام‌های Relationship با هدف Customer برابر 2 است. تحویل حداقل یک‌بار است؛ مصرف‌کننده باید پیش از اعمال اثر، Inbox را با کلید `(tenantId, consumerName, sourceDomain, messageId)` ثبت کند.

## رویدادهای Relationship

### `RelationshipEstablished` ـ نسخه 2

فیلدهای `data`: `tenantId`، `relationshipId`، `partyId`، `premisesId` nullable، `customerId` nullable، `relationshipTypeId` و `status`. دقیقاً یکی از دو شناسه هدف `premisesId` یا `customerId` مقدار دارد. رویداد پس از تثبیت Aggregate رابطه منتشر می‌شود؛ مقدار `status` نام وضعیت دامنه است (معمولاً `Active`).

### `RelationshipEnded` ـ نسخه 2

فیلدهای `data`: `tenantId`، `relationshipId`، `partyId`، `premisesId` nullable، `customerId` nullable، `relationshipTypeId`، `newStatus` و `endedAt`. دقیقاً یکی از دو شناسه هدف مقدار دارد. پایان Relationship یک انتقال تاریخی است؛ مصرف‌کننده نباید واقعیت رابطه قبلی را حذف کند.

## رویدادهای Authorization

### `AuthorizationGranted` ـ نسخه 1

فیلدهای `data`: `tenantId`، `authorizationId`، `relationshipId`، `partyId`، `authorizationTypeId` و `status`. پس از ثبت Authorization و Scopeهای صریح آن در تراکنش محلی منتشر می‌شود.

### `AuthorizationRevoked` ـ نسخه 1

فیلدهای `data`: `tenantId`، `authorizationId`، `relationshipId`، `partyId`، `authorizationTypeId` و `revokedAt`. پس از ثبت ابطال منتشر می‌شود و به معنی حذف تاریخچه مجوز نیست.

## تراکنش و تحویل

این چهار پیام توسط `DomainEventOutboxBridge` از رویدادهای دامنه واقعی ساخته می‌شوند. ردیف Outbox در همان `DbContext` و تراکنش تغییر Aggregate درج می‌شود؛ Handler فرمان نباید پیام تکراری جداگانه ایجاد کند.

Receiver اختصاصی با `Integration:Events:B06` و کلید اختیاری `Integration:EventKeys:B06` تنظیم می‌شود. اگر Receiver تعریف نشده باشد، پیام‌ها در Outbox پایدار باقی می‌مانند. Dispatcher از سیاست Retry نمایی و Dead Letter مشترک استفاده می‌کند؛ جزئیات در `B07-Message-Contracts.md` آمده است.

## توسعه هدف Relationship به Customer

`RelationshipEstablished` و `RelationshipEnded` با `schemaVersion=2` دقیقاً یکی از `premisesId` یا `customerId` را حمل می‌کنند. مصرف‌کنندگان قبلی Premises با ثابت ماندن `premisesId` سازگارند. برای رابطه Customer-targeted، `premisesId=null` و `customerId` مقدار دارد. مصرف‌کننده نباید null بودن PremisesId را به‌تنهایی فقدان هدف رابطه تلقی کند.

Scopeهای Authorization از نوع‌های `Premises`، `UsageSegment` و `Customer` پشتیبانی می‌کنند. Scope از نوع Customer باید با Relationship هدف‌گرفته به Customer منطبق باشد؛ Scopeهای Premises و UsageSegment برای Relationship هدف‌گرفته به Customer رد می‌شوند.
