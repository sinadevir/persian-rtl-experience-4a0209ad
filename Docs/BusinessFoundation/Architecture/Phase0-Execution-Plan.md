# برنامه اجرایی مرحله صفر — BusinessFoundation

نسخه: 2026-11-17 (پس از ZIP نسخه ۸)  
هدف: تبدیل یافته‌های بازبینی به **کارهای قابل اجرا روی فایل مشخص**، با قرارداد و معیار پذیرش تست — نه فهرست کلی ایراد.


> **وضعیت اجرا 2026-11-17:** کار ۰۲، ۰۳، ۰۴ (DomainEventDispatcher + Bridge) و ۰۵ (EvaluatePermission) در کد اعمال شد. تست‌های Integration هنوز باید در محیط دارای SDK اجرا شوند.

وضعیت نسخه ۸:
- Tenant Isolation (Production بدون Header): **انجام‌شده — نیاز به تست JWT واقعی**
- تراکنش اتمیک: **فقط ۳ مسیر** (CreateCompany, AssignRole, PublishParameterVersion)
- Compile ByCode + ValidFrom guard: **انجام‌شده**
- EvaluatePermission / Outbox claim / DomainEvent Bridge: **باقی**

---

## ۰. قواعد مشترک (قبل از هر PR)

1. هر عملیات تغییر دامنه که Outbox یا Audit می‌نویسد → داخل `DbTransactionScope.ExecuteAsync`.
2. دو مسیر انتشار ممنوع است: یا `IOutbox.Enqueue` دستی در Handler، یا Bridge از DomainEvent — نه هر دو برای یک رویداد.
3. تا تکمیل Bridge: **مسیر رسمی = Enqueue دستی در Handler**؛ `RecordCreated`/DomainEvent فقط برای مصرف داخلی آینده یا حذف تدریجی.
4. هیچ Handler نباید بدون فیلتر `TenantId` از context بخواند/بنویسد.
5. هر اصلاح بحرانی بدون تست مشخص merge نشود.

---

## کار ۰۱ — تکمیل و تأیید Tenant Isolation

### وضعیت
`Infrastructure/HttpTenantContext.cs` در Production فقط Claim می‌پذیرد.

### فایل‌ها
| فایل | اقدام |
|------|--------|
| `Infrastructure/HttpTenantContext.cs` | نگاشت Claim را با قرارداد واقعی Identity هم‌راستا کنید (مثلاً `ClaimTypes.NameIdentifier` علاوه بر `sub`) |
| `appsettings.json` / `appsettings.Development.json` | مستند کردن نام Claimهای مورد انتظار |
| `Docs/Architecture/Infrastructure-Fixes-Phase0.md` | به‌روزرسانی پس از تست JWT |
| **جدید:** `Tests/Security/TenantIsolationTests.cs` | تست‌های زیر |

### قرارداد Claim (پیشنهادی — باید با IdP نهایی شود)
| مفهوم | Claimهای پذیرفته |
|--------|-------------------|
| Tenant | `tenant_id`, `tid` |
| User | `sub`, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier`, `user_id` |

### تست‌های پذیرش
| # | سناریو | انتظار |
|---|--------|--------|
| T01 | Production + Header `X-Tenant-Id=999` بدون Claim | 401/UnauthorizedAccess |
| T02 | Production + JWT با `tenant_id=2` | TenantId=2 |
| T03 | Production + JWT tenant=2 ولی درخواست داده Tenant=1 | هیچ ردیفی از Tenant دیگر |
| T04 | Development + فقط Header | کار می‌کند |
| T05 | Production + Claim جعلی بدون امضای معتبر IdP | رد در لایه Authentication قبل از Handler |

### معیار اتمام
- تست T01–T04 سبز
- سند Claim با تیم Identity امضا شده

---

## کار ۰۲ — تعمیم تراکنش Domain + Audit + Outbox

### الگوی اجباری
```text
DbTransactionScope.ExecuteAsync:
  mutate domain
  SaveChangesAsync          // IDENTITY در صورت نیاز
  audit.Write (در صورت حساس)
  outbox.Enqueue (در صورت انتشار)
  SaveChangesAsync
Commit / Rollback
```

### فهرست Handlerها — وضعیت و اقدام

#### Organization — `Modules/Organization/Application/Handlers/OrganizationHandlers.cs`
| Handler | Outbox؟ | Audit؟ | تراکنش فعلی | اقدام |
|---------|---------|--------|-------------|--------|
| `CreateCompanyHandler` | بله | بله | **Done** | نگه داشتن |
| `CreateOrganizationalUnitHandler` | بله | خیر | **ناقص** (دو Save خارج tx) | پیچیدن در `DbTransactionScope` + Audit Create |
| `CreatePositionHandler` | احتمالاً خیر | خیر | تک‌مرحله‌ای | حداقل Audit؛ tx در صورت افزودن Outbox |

#### Geography — `Modules/Geography/Application/Handlers/GeographyHandlers.cs`
| Handler | Outbox؟ | Audit؟ | تراکنش | اقدام |
|---------|---------|--------|--------|--------|
| `CreateAdministrativeDivisionHandler` |؟ | خیر | ناقص احتمالی | tx + Audit |
| `CreateServiceAreaHandler` | بله | خیر | **ناقص** | `DbTransactionScope` + Audit + اعتبار واحد∈شرکت |
| `UpdateServiceAreaHandler` | خیر؟ | خیر | تک | Audit Update + در صورت Change event، Outbox |
| `DeactivateServiceAreaHandler` | خیر؟ | خیر | تک | Audit Deactivate + رویداد StatusChanged |

#### Regulations — `Modules/Regulations/Application/Handlers/RegulationsHandlers.cs`
| Handler | وضعیت | اقدام |
|---------|--------|--------|
| `CreateRegulationHandler` | دو Save | tx یکپارچه + Audit |
| `PublishRegulationHandler` | Outbox دارد | tx + Audit Publish |
| `CreateBusinessParameterHandler` | Outbox دارد | tx + Audit؛ نسخه اول می‌تواند Draft بماند (تصمیم محصول) |
| `PublishParameterVersionHandler` | **Done** | نگه داشتن؛ بعداً concurrency token |
| `PublishParameterVersionByCodeHandler` | **Done** (delegate) | — |

#### AccessManagement — `Modules/AccessManagement/Application/Handlers/AccessManagementHandlers.cs`
| Handler | وضعیت | اقدام |
|---------|--------|--------|
| `CreateUserHandler` | دو Save | tx + Audit Create |
| `CreateRoleHandler` | — | Audit |
| `AssignRoleHandler` | **Done** | تکمیل اعتبارسنجی Scope (کار ۰۵ مرتبط) |
| `RevokeUserRoleHandler` | **ناقص** | tx + Audit Revoke + Outbox `UserRoleRevoked` |
| `CreatePermissionHandler` | — | Audit |
| `GrantPermissionToRoleHandler` | — | Audit + Outbox اختیاری |
| *(Revoke permission)* | **وجود ندارد** | Command + Handler + Endpoint |

#### ReferenceData — `Modules/ReferenceData/Application/Handlers/ReferenceDataHandlers.cs`
| Handler | اقدام |
|---------|--------|
| `CreateReferenceGroupHandler` | tx در صورت event؛ Audit |
| `CreateReferenceItemHandler` | Audit + قاعده یک Default فعال per group |

### فایل‌های مشترک
| فایل | اقدام |
|------|--------|
| `Infrastructure/Persistence/DbTransactionScope.cs` | نگه داشتن؛ در صورت نیاز overload با IsolationLevel |
| `Application/Abstractions/IAuditWriter.cs` | بدون تغییر |
| `Docs/Architecture/Phase0-Execution-Plan.md` | چک‌لیست پیشرفت |

### تست‌های پذیرش (Integration)
| # | سناریو | انتظار |
|---|--------|--------|
| X01 | CreateCompany سپس اجبار شکست Outbox (mock) قبل Commit | هیچ Company در DB |
| X02 | AssignRole موفق | ۱ Company/UserRole + ۱ Audit + ۱ Outbox هم Tenant |
| X03 | CreateOrganizationalUnit پس از اصلاح | همان اتمیک بودن |
| X04 | RevokeUserRole پس از اصلاح | Audit Action=Revoke + Outbox UserRoleRevoked |

---

## کار ۰۳ — Outbox Dispatcher با Claim/Lock

### فایل‌ها
| فایل | اقدام |
|------|--------|
| `Domain/Entities/OutboxMessage.cs` | فیلدهای `LockedUntil`, `LockedBy` (یا `ClaimedAt`, `ClaimedBy`) |
| `Database/BusinessFoundation-Baseline.sql` | ستون‌ها + ایندکس pending |
| `Infrastructure/BusinessFoundationDbContext.cs` | mapping |
| `Infrastructure/Integration/OutboxDispatcher.cs` | claim اتمیک قبل از ارسال |
| `Infrastructure/Integration/OutboxWriter.cs` | مقداردهی اولیه null برای lock |
| `Application/Integration/IntegrationContracts.cs` | بدون تغییر قرارداد بیرونی |
| **جدید:** `Tests/Integration/OutboxClaimTests.cs` | |

### الگوریتم Claim پیشنهادی
```sql
-- شبه کد
UPDATE TOP (25) OutboxMessage
SET LockedBy = @instanceId, LockedUntil = DATEADD(second, 30, SYSUTCDATETIME()), AttemptCount = AttemptCount
WHERE DispatchedAt IS NULL AND DeadLetteredAt IS NULL
  AND (LockedUntil IS NULL OR LockedUntil < SYSUTCDATETIME())
  AND (NextAttemptAt IS NULL OR NextAttemptAt <= SYSUTCDATETIME())
OUTPUT inserted.*
```
یا معادل EF با concurrency.

### رفتار
1. Instance فقط پیام‌های Claimشده خودش را Send می‌کند.
2. پس از Send موفق: `DispatchedAt = UtcNow`, پاک کردن Lock.
3. شکست: افزایش Attempt، `NextAttemptAt` backoff، آزاد کردن Lock.
4. بیش از MaxAttempts: DeadLetter.

### تست‌ها
| # | سناریو | انتظار |
|---|--------|--------|
| O01 | دو Worker موازی روی یک Pending | فقط یکی Claim می‌کند |
| O02 | Lock منقضی | Worker دیگر می‌تواند Claim کند |
| O03 | Send موفق | DispatchedAt پر؛ پیام دوباره انتخاب نشود |
| O04 | مصرف‌کننده با MessageId تکراری | Idempotent (قرارداد مستند برای B–J) |

---

## کار ۰۴ — تعیین تکلیف Domain Event Bridge

### تصمیم پیشنهادی (کوتاه‌مدت)
| مسیر | وضعیت |
|------|--------|
| Handler → `IOutbox.Enqueue` | **فعال و رسمی** |
| `Entity.Raise` + `DomainEventOutboxBridge` | ثبت در DI؛ **فراخوانی نشود** تا از دوگانگی جلوگیری شود |

### فایل‌ها برای فاز بعد (مسیر واحد)
| فایل | اقدام |
|------|--------|
| `Infrastructure/DomainEvents/DomainEventOutboxBridge.cs` | نگه‌داری mapping |
| **جدید:** `Infrastructure/DomainEvents/DomainEventSaveChangesInterceptor.cs` | بعد از داشتن Id، eventها را به Outbox |
| `Modules/*/Handlers/*` | حذف Enqueue دستی موازی پس از فعال‌سازی Interceptor |
| Entityهای `RecordCreated` | فقط در صورت استفاده Bridge |

### معیار اتمام کار ۰۴
- سند صریح: «مسیر انتشار رسمی چیست»
- هیچ رویداد Created دو بار در Outbox برای یک عمل نیست
- تست: یک CreateCompany → دقیقاً یک پیام CompanyCreated

---

## کار ۰۵ — EvaluatePermission (قرارداد + اسکلت)

### قرارداد API
```http
POST /api/v1/access/evaluate-permission
{
  "permissionCode": "Premises.Update",
  "resourceType": "Premises",
  "resourceId": 123,
  "companyId": 1,
  "organizationalUnitId": 10,
  "evaluationTime": "2026-11-17T12:00:00Z"
}
```
پاسخ:
```json
{
  "allowed": true,
  "reason": "Role matched",
  "matchedRoleCode": "OU-Operator",
  "effectiveFrom": "...",
  "effectiveTo": null
}
```

### فایل‌های جدید / تغییر
| فایل | اقدام |
|------|--------|
| `Modules/AccessManagement/Application/Commands` یا `Queries/EvaluatePermissionQuery.cs` | Query (بدون side-effect) |
| `Modules/AccessManagement/Application/Dtos/AccessManagementDtos.cs` | DTOهای request/response |
| `Modules/AccessManagement/Application/Handlers/...` | منطق: UserRole فعال ∩ RolePermission ∩ Scope |
| `Modules/AccessManagement/Endpoints/AccessManagementEndpoints.cs` | MapPost evaluate |
| `Modules/AccessManagement/Application/Validators/...` | permissionCode الزامی |

### قواعد حداقلی ارزیابی (فاز ۱)
1. User در Tenant، Status=Active
2. UserRoleهایی که `EffectiveFrom <= evaluationTime` و (`EffectiveTo` null یا > time)
3. اگر CompanyId در درخواست آمده: UserRole.CompanyId null یا برابر
4. اگر OU آمده: UserRole.OU null یا برابر (فعلاً بدون درخت سلسله‌مراتب)
5. Role دارای PermissionCode
6. اولین تطبیق کافی است (بعداً سیاست All/Any)

### تست‌ها
| # | سناریو | انتظار |
|---|--------|--------|
| P01 | کاربر با نقش و مجوز | allowed=true |
| P02 | نقش بدون آن مجوز | allowed=false |
| P03 | نقش با Company دیگر | false |
| P04 | انتساب منقضی | false |
| P05 | کاربر Inactive | false |

---

## کار ۰۶ — تکمیل سریع AccessManagement حساس

| فایل / Handler | تغییر |
|----------------|--------|
| `RevokeUserRoleHandler` | Audit + Outbox `UserRoleRevoked` + ChangeReason اختیاری + tx |
| `IntegrationContracts.cs` | record `UserRoleRevokedIntegrationEvent` |
| `Integration-Contracts-Catalog.md` | ردیف رویداد |
| `GrantPermissionToRoleHandler` | Audit |
| **جدید** `RevokePermissionFromRoleCommand` | قرینه Grant |
| `AssignRoleHandler` | اعتبار: OU متعلق به Company؛ EffectiveTo > EffectiveFrom |

### تست‌ها
| # | سناریو | انتظار |
|---|--------|--------|
| A01 | Assign با OU از شرکت دیگر | 409/Domain rule |
| A02 | Revoke | Audit + Outbox |
| A03 | EffectiveTo <= EffectiveFrom | رد اعتبارسنجی |

---

## کار ۰۷ — تست‌های امنیتی و یکپارچگی حداقل (اجباری قبل از مصرف B–J)

پروژه تست پیشنهادی: `BusinessFoundation.WebApi.Tests`

| لایه | حداقل تعداد | تمرکز |
|------|-------------|--------|
| Unit | قوانین ValidFrom پارامتر، Default یکتا Reference، Scope Assign | |
| Integration | tx اتمیک، Outbox claim | |
| Security | Tenant header در Production، cross-tenant read | |

بدون این مجموعه، «اصلاح زیرساخت» اثبات‌شده محسوب نمی‌شود.

---

## ترتیب اجرای پیشنهادی در Sprint

```text
هفته ۱:  ۰۱ (تست Tenant + Claim)  →  ۰۲ (tx روی همه Handlerهای Outboxدار)
هفته ۱–۲: ۰۳ (Outbox claim)  →  ۰۴ (تصمیم Bridge مستند)
هفته ۲:  ۰۵ (EvaluatePermission اسکلت)  →  ۰۶ (Revoke + Scope validation)
هفته ۲ پایان: ۰۷ (سبز شدن تست‌های حیاتی)
```

پس از اتمام ۰۱–۰۷ می‌توان وارد تکمیل Organization/ReferenceData/Regulations/Calendar شد.

---

## آنچه عمداً در مرحله صفر نیست

- هندسه ServiceArea / GIS
- Parameter Scope چندسطحی کامل
- Measurement unit conversion engine
- Appointment مستقل از AppUser (نیاز طراحی HR) — فقط ثبت در backlog ماژول
- Inbox ورودی کامل
- بازنویسی پنج ماژول

---

## چک‌لیست خروجی هر PR مرحله صفر

- [ ] فایل‌های جدول کار ۰x تغییر کرده‌اند
- [ ] تست پذیرش همان کار اضافه یا به‌روز شده
- [ ] اگر Outbox جدید: ردیف در Integration catalog
- [ ] اگر Audit جدید: Action/Module در سند Audit
- [ ] بدون دو مسیر انتشار برای یک رویداد
