# اصلاحات زیرساختی مرحله ۰ (بحرانی)

تاریخ: 2026-11-17

## ۱. Tenant Isolation — `HttpTenantContext`

**قبل:** هدر `X-Tenant-Id` / `X-User-Id` در همه محیط‌ها اولویت داشت.  
**بعد:**

| محیط | Tenant | User |
|------|--------|------|
| Development | Header مجاز؛ در غیر این صورت Claim؛ در نهایت fallback = 1 | Header مجاز؛ در غیر این صورت Claim |
| Production | **فقط Claim** معتبر (`tenant_id` / `tid` / …) | **فقط Claim** (`sub` / `user_id` / …) |

هدر کلاینت در Production دیگر نمی‌تواند Tenant یا Actor را جعل کند.

## ۲. اتمیک بودن Domain + Audit + Outbox

**قبل:** دو `SaveChanges` بدون تراکنش صریح → امکان ماندن داده دامنه بدون Audit/Outbox.  
**بعد:** `DbTransactionScope.ExecuteAsync` در مسیرهای حساس:

- `CreateCompanyHandler`
- `AssignRoleHandler`
- `PublishParameterVersionHandler` (و ByCode)

الگو:

```text
BeginTransaction
  INSERT domain
  SaveChanges          // گرفتن IDENTITY
  Audit.Write
  Outbox.Enqueue
  SaveChanges
Commit  (یا Rollback کامل در صورت خطا)
```

## ۳. خطای کامپایل Regulations

`PublishParameterVersionByCodeHandler` اکنون پارامتر `audit` را به `PublishNewVersion` پاس می‌دهد.

همچنین اعتبارسنجی اضافه شد: `ValidFrom` نسخه جدید باید اکیداً بزرگ‌تر از `ValidFrom` نسخه قبلی باشد.

## ۴. Domain Events / Outbox Bridge — وضعیت (به‌روز)

مسیر رسمی: `RecordXxx` → `IDomainEventDispatcher` → Bridge → Outbox.  
Enqueue دستی فقط برای رویدادهای بدون Domain Event (`UserRole*`, `ServiceAreaCreated`, `BusinessParameterPublished`).

## ۵. موارد باز (عمداً Deferred)

- Lookup contracts (as-of, IsUsable, IsWorkingDay)
- چرخه عمر کامل پنج ماژول (Update/Deactivate Company، Appointment، Geometry، Parameter Scope)
- پروژه تست خودکار (نیازمند SDK در CI)

## ۶. Domain Event Bridge (کار ۰۴) — انجام‌شده

**مسیر رسمی انتشار Integration:**

```text
Handler
  → Save domain (IDENTITY)
  → entity.RecordXxx()           // Domain Event
  → IDomainEventDispatcher.DispatchTrackedEvents()
       → DomainEventOutboxBridge → IOutbox.Enqueue
  → Audit (در صورت نیاز)
  → SaveChanges (outbox + audit)
```

قواعد:
- برای رویدادهایی که Domain Event دارند، **Enqueue دستی موازی ممنوع** است.
- رویدادهایی بدون Domain Event (مثل `UserRoleAssigned`, `ServiceAreaCreated`, `BusinessParameterPublished`) همچنان با `IOutbox.Enqueue` مستقیم ثبت می‌شوند.
- `RegulationCreated` عمداً به Integration منتشر نمی‌شود (فقط Draft داخلی).

فایل‌ها: `IDomainEventDispatcher`, `DomainEventDispatcher`, `DomainEventOutboxBridge`, غنی‌سازی `FoundationEvents`.

## ۷. EvaluatePermission (کار ۰۵) — انجام‌شده

```http
POST /api/v1/access/evaluate-permission
```

قواعد فاز ۱: User فعال، انتساب نقش در زمان ارزیابی، تطبیق Scope شرکت/واحد (null = سراسری)، Permission فعال روی نقش.

`ResourceType`/`ResourceId` برای توسعه بعدی (ABAC) در قرارداد هستند؛ در فاز ۱ در منطق استفاده نمی‌شوند.

## ۸. اصلاحات امنیتی EvaluatePermission و Outbox (پس از بازبینی نسخه ۱۱)

### Scope
انتساب محدود به Company/OU دیگر درخواست بدون Scope را مجاز نمی‌کند.

### ارزیابی User دیگر
فقط با مجوز سیستم `bf.access.evaluate-any-user` (انتساب بدون Scope).

### JWT User claim
علاوه بر `sub`، `ClaimTypes.NameIdentifier` پشتیبانی می‌شود.

### Outbox
- Migration: `Database/Migrations/20261117_OutboxClaimColumns.sql`
- Batch پیش‌فرض ۵، Lock ۶۰ ثانیه
- تمدید Lease قبل از هر ارسال
- مسیر غیر SQL Server فقط در Development

## ۹. P1 — قراردادهای خواندنی (Lookup)

| قرارداد | Endpoint | رفتار |
|---------|----------|--------|
| IsReferenceItemUsable | `GET .../reference/groups/{g}/items/{i}/usable` | Active+بازه اعتبار → UsableInNewOperations؛ Deprecated/Inactive فقط تاریخچه |
| GetParameterValueAsOf | `GET .../regulations/parameters/{code}/value?asOf=` | نسخه Published در بازه؛ پاسخ با Found/Reason بدون پرتاب برای حالت missing |
| IsWorkingDay | `GET .../calendar/{code}/is-working-day?date=` | تعطیل، override، جمعه=تعطیل |
| GetHolidaysInRange | `GET .../calendar/{code}/holidays?from=&to=` | شامل recurring annual |

منطق جابه‌جایی سررسید قبض و SLA در ماژول‌های مصرف‌کننده می‌ماند.

## ۱۰. Authorization واقعی (P0 پس از بازبینی ۱۹)

- `PermissionAuthorizationHandler` → `EvaluatePermission`
- Endpointهای مدیریتی: `.RequirePermission(FoundationPermissions.…)`
- Audit group: `bf.audit.read`
- `Security:DisablePermissionChecks` فقط Development
- اصلاح `PublishParameterVersionByCode` + `ScopeCompanyId` در Integration Event

## ۱۱. P1 پس از بازبینی ۱۹
- Outbox lease شرطی + using HttpResponse
- CompanyHistory/OUHistory برای As-Of
- رویدادهای Changed/Deactivated
- Geography validation + Deactivate RowVersion
- Inbox Status=Received
- SoD Serializable re-check
- Migration 20261117_P1_History_InboxStatus.sql

## P2
- CRUD ExternalSystem / CodingStandard / ExternalCodeMapping
- Calendar validity + max holiday range 366 days
- tests/BusinessFoundation.WebApi.Tests (unit smoke)


## ۱۲. بسته باقی‌مانده پس از بازبینی ۲۲

- PermissionAuthorizationHandler: استخراج Scope از Route/Query
- RequirePermission روی تمام GETهای ReferenceData + Outbox ops
- ChangeReferenceItemStatus + رویداد ReferenceItemStatusChanged
- DeactivateCodingStandard
- Appointment: اعتبار زمانی Unit/Position در برابر بازه انتصاب
- GeoJSON: حلقه بسته + محدوده lon/lat
- Migration P3: ستون‌های Holder مستقل
- SoD-Policy.md (سراسری Tenant)
- تست‌های Scope extract و GeoJSON
