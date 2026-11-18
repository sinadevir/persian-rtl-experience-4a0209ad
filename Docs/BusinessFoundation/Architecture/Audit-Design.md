# طراحی و بررسی پیاده‌سازی Audit — BusinessFoundation

نسخه: 2026-11-17  
وضعیت فعلی: **فاز A پیاده‌سازی شد** (Entity + Writer + 3 Handler نمونه + API خواندنی)

---

## ۱. وضعیت موجود در کد

### آنچه هست

| مورد | واقعیت |
|------|--------|
| `CreatedAt` / `CreatedBy` | روی اکثر Entityها؛ در Handler هنگام Create پر می‌شود |
| `ModifiedAt` / `ModifiedBy` | ستون وجود دارد؛ در بسیاری از مسیرهای Update هنوز به‌صورت یکنواخت اعمال نمی‌شود |
| `ValidFrom` / `ValidTo` | اعتبار زمانی رکورد — **تاریخچه ممیزی نیست** |
| `RowVersion` | کنترل همزمانی — **ممیزی نیست** |
| Domain Events / Outbox | برای یکپارچه‌سازی با ماژول‌های دیگر — جایگزین Audit داخلی نیست |
| جدول `AuditLog` / سرویس Audit | **وجود ندارد** |
| API جست‌وجوی تاریخچه | **وجود ندارد** |
| ثبت قبل/بعد تغییر | **وجود ندارد** |
| ثبت علت تغییر (ChangeReason) | فقط در برخی مسیرهای پارامتر (`ChangeReason` روی `ParameterVersion`) |

### جمع‌بندی ارزیابی

فیلدهای `CreatedBy`/`ModifiedBy` حداکثر «آخرین عامل تغییر روی ردیف» را نگه می‌دارند. برای پاسخ به این پرسش‌ها کافی نیستند:

- چه کسی، چه زمانی، چه عملیاتی روی این موجودیت انجام داد؟
- مقدار قبلی و بعدی چه بود؟
- چرا تغییر کرد؟
- همه تغییرات یک کاربر یا یک موجودیت در بازه زمانی چه بودند؟
- تغییرات حساس مجوز/نقش/پارامتر قابل گزارش‌گیری هستند؟

**نتیجه:** Audit به‌معنای سیستم ممیزی در پروژه فعلی **وجود ندارد**؛ فقط metadata سبک ردیف وجود دارد.

---

## ۲. هدف و مرز Audit در BusinessFoundation

### هدف

یک قابلیت **زیرساختی مشترک** (نه ماژول کسب‌وکاری ششم) برای:

1. ثبت غیرقابل‌انکار عملیات مدیریت اطلاعات پایه
2. ردیابی تغییرات حساس (ساختار سازمانی، دسترسی، مقررات/پارامتر، نگاشت خارجی)
3. پشتیبانی از پاسخ‌گویی عملیاتی و امنیتی داخل همان Tenant

### خارج از محدوده

| موضوع | دلیل |
|-------|------|
| Event Sourcing کامل دامنه | پیچیدگی بیش از نیاز Foundation |
| Audit تراکنش مالی/قبض | مالک: حوزه G/F |
| Audit قرائت و دستورکار | مالک: E/D |
| SIEM سازمانی / ارسال به ELK اجباری در فاز اول | اختیاری فاز بعد از طریق Outbox |
| ذخیره فایل پیوست ممیزی | فقط ارجاع/متن JSON |
| جایگزینی ValidFrom/ValidTo | تاریخچه اعتبار کسب‌وکاری ≠ لاگ ممیزی |

---

## ۳. مدل پیشنهادی داده

یک جدول مرکزی کافی است (الگوی ساده و قابل‌جست‌وجو):

### `AuditEntry`

| ستون | نوع پیشنهادی | توضیح |
|------|--------------|--------|
| `AuditEntryId` | BIGINT IDENTITY | کلید |
| `TenantId` | BIGINT NOT NULL | اجباری؛ همه Queryها فیلتر Tenant |
| `OccurredAt` | DATETIME2 NOT NULL | UTC |
| `ActorUserId` | BIGINT NULL | از `ITenantContext.UserId` |
| `ActorUserName` | NVARCHAR(100) NULL | اختیاری؛ denormalized برای گزارش وقتی کاربر بعداً تغییر نام می‌دهد |
| `Action` | NVARCHAR(40) NOT NULL | `Create`, `Update`, `Deactivate`, `Activate`, `Delete`, `Publish`, `Assign`, `Revoke`, `Deprecate` |
| `EntityType` | NVARCHAR(80) NOT NULL | `Company`, `OrganizationalUnit`, `BusinessParameter`, `UserRole`, ... |
| `EntityId` | BIGINT NULL | شناسه موجودیت؛ برای عملیات بدون Id خاص null |
| `EntityCode` | NVARCHAR(100) NULL | کد پایدار کسب‌وکاری در صورت وجود |
| `Module` | NVARCHAR(40) NOT NULL | `Organization`, `Geography`, `ReferenceData`, `Regulations`, `AccessManagement`, `Calendar` |
| `CorrelationId` | UNIQUEIDENTIFIER NULL | از هدر درخواست / Activity |
| `RequestPath` | NVARCHAR(200) NULL | مسیر API (اختیاری) |
| `ChangeReason` | NVARCHAR(500) NULL | علت اعلام‌شده توسط کاربر/سیستم |
| `BeforeJson` | NVARCHAR(MAX) NULL | snapshot قبل (فقط فیلدهای مجاز) |
| `AfterJson` | NVARCHAR(MAX) NULL | snapshot بعد |
| `ChangedFields` | NVARCHAR(1000) NULL | لیست نام فیلدهای تغییرکرده (comma/json array) |
| `Success` | BIT NOT NULL DEFAULT 1 | برای تلاش‌های ردشده اختیاری فاز ۲ |
| `ErrorMessage` | NVARCHAR(1000) NULL | در صورت ثبت شکست عملیات حساس |
| `CreatedAt` | DATETIME2 NOT NULL | زمان درج ردیف ممیزی |

### ایندکس‌های ضروری

```text
IX_Audit_Tenant_Time          (TenantId, OccurredAt DESC)
IX_Audit_Tenant_Entity        (TenantId, EntityType, EntityId, OccurredAt DESC)
IX_Audit_Tenant_Actor         (TenantId, ActorUserId, OccurredAt DESC)
IX_Audit_Tenant_Module_Action (TenantId, Module, Action, OccurredAt DESC)
```

### قوانین نگهداری داده

- **بدون UPDATE/DELETE عملیاتی** روی `AuditEntry` از طریق API عادی (append-only)
- حذف/آرشیو فقط با job نگهداری و سیاست سازمان (فاز بعد)
- حجم `BeforeJson`/`AfterJson`: فقط فیلدهای غیرحساس و غیرحجیم؛ رمز، توکن، کلید درگاه هرگز ذخیره نشوند

---

## ۴. مکانیزم ثبت (چگونه نوشته شود)

سه گزینه رایج:

| رویکرد | مزیت | ریسک | توصیه |
|--------|------|------|--------|
| A. `SaveChanges` Interceptor / Override | خودکار برای همه Entity | نویز زیاد، کنترل سخت روی Action و Reason | فقط برای فیلدهای ModifiedAt کمکی |
| B. فراخوانی صریح `IAuditWriter` در Handler | کنترل کامل Action/Reason/Before-After | ممکن است فراموش شود | **توصیه اصلی برای عملیات حساس** |
| C. فقط از Domain Events | هم‌تراز Integration | همه تغییرات دامنه event ندارند؛ Audit ≠ Integration | مکمل، نه جایگزین |

### الگوی توصیه‌شده برای BusinessFoundation

```text
Handler
  ├─ بارگذاری موجودیت (در صورت Update)
  ├─ گرفتن snapshot قبل (در صورت نیاز)
  ├─ اعمال تغییر دامنه
  ├─ audit.Write(AuditEntryDraft)   // همان DbContext / همان تراکنش
  ├─ outbox.Enqueue(...)            // در صورت نیاز
  └─ SaveChangesAsync  یک‌بار       // داده + audit + outbox با هم
```

واسط پیشنهادی:

```csharp
public interface IAuditWriter
{
    void Write(AuditEntryDraft entry);
}

public sealed record AuditEntryDraft(
    string Module,
    string Action,
    string EntityType,
    long? EntityId,
    string? EntityCode,
    string? ChangeReason,
    object? Before,
    object? After,
    IEnumerable<string>? ChangedFields);
```

پیاده‌سازی `AuditWriter`:

- `TenantId`, `ActorUserId`, `OccurredAt` را از `ITenantContext` و ساعت UTC می‌گیرد
- `Before`/`After` را با `System.Text.Json` سریالایز می‌کند (options: ignore null، بدون cyclic)
- به `DbSet<AuditEntry>` همان `BusinessFoundationDbContext` اضافه می‌کند
- **SaveChanges جداگانه نمی‌زند** تا اتمیک بماند

### چه چیزهایی حتماً Audit شوند (فاز ۱)

| Module | Entity / عملیات |
|--------|------------------|
| Organization | Company Create/Update/Deactivate؛ OU Create/Update/Move/Deactivate؛ Position؛ Appointment assign/end |
| AccessManagement | User Create/Update/Lock؛ Role؛ Permission grant/revoke؛ UserRole assign/revoke |
| Regulations | Regulation Publish/Revoke؛ Parameter Create؛ ParameterVersion Publish؛ RegulationDocument add/supersede |
| ReferenceData | ReferenceItem Create/Update/Deprecate؛ ExternalCodeMapping Create/Update/Deactivate |
| Geography | ServiceArea Create/Update/Deactivate |
| Calendar | Holiday Create/Update/Remove (پس از API) |

### چه چیزهایی در فاز ۱ Audit نشوند

- Queryهای فقط‌خواندنی
- Health/Outbox ops داخلی (یا در سطح لاگ اپلیکیشن)
- هر request عمومی بدون تغییر state

---

## ۵. ارتباط با CreatedBy / ModifiedBy / ValidFrom

| لایه | نقش | جایگزین Audit؟ |
|------|-----|----------------|
| `CreatedAt/By` | خلاصه روی ردیف | خیر |
| `ModifiedAt/By` | آخرین ویرایش | خیر |
| `ValidFrom/To` | اعتبار کسب‌وکاری نسخه رکورد | خیر |
| `AuditEntry` | تاریخچه عملیات | منبع پاسخ ممیزی |
| Outbox Event | اطلاع به سیستم‌های دیگر | خیر |

Handler باید همزمان:

1. فیلدهای ردیف را به‌روز کند (`ModifiedAt/By`)
2. در صورت تغییر ساختاری، `ValidFrom/To` را طبق قواعد دامنه مدیریت کند
3. یک `AuditEntry` بنویسد

---

## ۶. API خواندنی Audit (مصرف داخلی Foundation / ادمین)

پیشنهاد گروه:

```text
GET /api/v1/audit/entries
  ?entityType=Company&entityId=12
  &module=AccessManagement
  &actorUserId=5
  &action=Assign
  &from=2026-01-01&to=2026-12-31
  &page=1&pageSize=50

GET /api/v1/audit/entries/{id}
```

قواعد:

- همیشه فیلتر `TenantId` از context
- فقط نقش‌های ادمین Foundation (پس از `EvaluatePermission`)
- خروجی شامل Before/After؛ بدون فیلدهای حساس
- بدون API ویرایش/حذف

---

## ۷. حساسیت و حریم داده

| داده | سیاست |
|------|--------|
| NationalId در snapshot | ماسک در After/Before (مثلاً `***` + ۴ رقم آخر) یا حذف از projection |
| Mobile/Email | اختیاری ماسک |
| Permission/Role codes | کامل ذخیره شود (نیاز ممیزی امنیتی) |
| Parameter values | ذخیره شود (تغییر نرخ/آستانه حساس است) |
| DocumentUrl | ذخیره شود |
| رمز / token / API key | هرگز |

Projection صریح برای هر `EntityType` بهتر از serialize کل entity خام است تا فیلد تصادفی وارد لاگ نشود.

مثال:

```csharp
static object CompanyAuditProjection(Company c) => new
{
    c.CompanyId, c.CompanyCode, c.CompanyName, c.CompanyType, c.Status,
    c.ParentCompanyId, c.ValidFrom, c.ValidTo
};
```

---

## ۸. تراکنش، شکست و همبستگی با Outbox

```text
[Transaction]
  UPDATE/INSERT business rows
  INSERT AuditEntry
  INSERT OutboxMessage
[Commit]
```

اگر Audit اجباری برای عملیات حساس باشد و نوشتن Audit شکست بخورد → کل عملیات fail شود (ترجیح صحت بر ادامه خاموش).

`CorrelationId`: از `HttpContext.TraceIdentifier` یا هدر `X-Correlation-Id` برای پیوند Audit و لاگ اپلیکیشن و Outbox.

---

## ۹. مراحل پیاده‌سازی پیشنهادی

### فاز A — اسکلت (همان sprint زیرساخت)

1. Entity `AuditEntry` + جدول Baseline SQL + ایندکس‌ها  
2. `IAuditWriter` / `AuditWriter` + ثبت در DI  
3. DbSet در `BusinessFoundationDbContext`  
4. فراخوانی در ۲–۳ Handler حساس نمونه: `CreateCompany`, `AssignRole`, `PublishParameterVersion`  
5. API فقط‌خواندنی لیست/جزئیات با فیلتر Tenant  

### فاز B — پوشش

6. Projectionهای صریح برای Entityهای حساس  
7. اجبار `ChangeReason` برای Publish/Deactivate/Revoke/Permission changes  
8. اتصال به `EvaluatePermission` برای مشاهده Audit  

### فاز C — سخت‌سازی

9. سیاست نگهداری/آرشیو  
10. تست‌های یکپارچگی: یک Command = یک Audit در همان Tenant  
11. (اختیاری) انتشار `AuditRecorded` به Outbox برای SIEM  

---

## ۱۰. تست‌های پذیرش حداقلی

| # | سناریو | انتظار |
|---|--------|--------|
| 1 | ایجاد شرکت | یک Audit با Action=Create، EntityType=Company، AfterJson دارای CompanyCode |
| 2 | تخصیص نقش | Audit با Action=Assign، Module=AccessManagement |
| 3 | انتشار پارامتر | Audit با Action=Publish و ChangeReason |
| 4 | Query با Tenant دیگر | ردیف‌های Tenant دیگر دیده نشوند |
| 5 | شکست SaveChanges | هیچ Audit یتیمی commit نشود |
| 6 | Update شرکت | BeforeJson و AfterJson و ChangedFields پر باشد |

---

## ۱۱. جمع‌بندی تصمیم‌ها

| تصمیم | انتخاب |
|-------|--------|
| مدل | جدول append-only مرکزی `AuditEntry` |
| نوشتن | صریح از Handler از طریق `IAuditWriter` در همان تراکنش |
| خواندن | API ادمین فیلتردار Tenant-scoped |
| رابطه با Integration | جدا؛ Outbox برای سیستم‌های دیگر، Audit برای ممیزی داخلی |
| رابطه با ValidFrom/To | مکمل؛ جایگزین یکدیگر نیستند |
| اولویت | فاز A بلافاصله بعد از Tenant Isolation و اصلاح Outbox |

---

## ۱۲. برآورد حجم کار (تقریبی)

| بخش | دامنه |
|-----|--------|
| Schema + Entity + Writer | کوچک |
| سیم‌کشی ۳ Handler نمونه | کوچک |
| API خواندنی | کوچک |
| Projection + Reason اجباری برای مسیرهای حساس | متوسط |
| پوشش تمام Handlerهای موجود | متوسط تا بزرگ (تدریجی) |

پیشنهاد: ابتدا اسکلت + ۳ مسیر حساس؛ بقیه Handlerها هنگام تکمیل CRUD هر ماژول Audit می‌گیرند تا فراموشی سیستماتیک نشود.
