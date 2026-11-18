# ماتریس شکاف اجرایی — BusinessFoundation

نسخه: 2026-11-17  
مبنای ارزیابی: بررسی استاتیک `BusinessFoundation.WebApi-Completed`  
هدف: تبدیل یافته‌های بازبینی به برنامه اجرایی اولویت‌دار، بدون گسترش دامنه به حوزه‌های B–J


> **به‌روزرسانی 2026-11-17 (پسا-بازبینی ۱۱): EvaluatePermission Scope امن، Revoke Permission، Audit گسترده‌تر، AssignRole validation، Reference Default uniqueness، Outbox lease/migration. | به‌روزرسانی 2026-11-17:** Tenant Isolation (Production بدون اعتماد به Header)، تراکنش اتمیک برای CreateCompany/AssignRole/PublishParameter، و رفع فراخوانی ByCode+audit اعمال شد. جزئیات: `Infrastructure-Fixes-Phase0.md`.

---

## ۱. اصول تثبیت‌شده

| اصل | توضیح |
|-----|--------|
| پنج ماژول اصلی حفظ می‌شوند | Organization, Geography, ReferenceData, Regulations, AccessManagement |
| قابلیت‌های تکمیلی ماژول جدا نمی‌سازند | Calendar, Banking lookup, Measurement, Currency, ExternalMapping, Audit زیر همان ماژول‌ها یا لایه مشترک |
| منطق تخصصی حوزه‌ها وارد نمی‌شود | قبض، وصول واقعی، قرائت، دستورکار، GIS عملیاتی ملک و ... خارج از محدوده |
| احراز هویت فنی خارج است | Token / password / IdP در زیرساخت Identity؛ اینجا فقط هویت کسب‌وکاری و مجوزها |
| Tenant Isolation و Outbox قبل از featureهای جدید | بدون این دو، اتکا به Foundation برای Core CIS امن نیست |

وضعیت‌ها در ماتریس:

| نماد | معنی |
|------|------|
| Done | قابل استفاده عملیاتی در سطح فعلی |
| Partial | مدل/Seed/API ناقص؛ قابل اتکا برای مصرف‌کننده نیست |
| Missing | وجود ندارد |
| N/A | عمداً خارج از محدوده |

---

## ۲. زیرساخت مشترک (اولویت بحرانی)

| قابلیت | Domain | Database | API مدیریتی | API خواندنی مصرف‌کننده | Validation | Integration/Events | اولویت | شکاف اصلی |
|--------|--------|----------|-------------|------------------------|------------|-------------------|--------|-----------|
| Tenant Isolation | Partial | Done (ستون TenantId) | Partial | Partial | Missing | N/A | **بحرانی** | `X-Tenant-Id` نباید در Production معتبر باشد؛ Claim/سرور باید منبع Tenant باشد؛ بازبینی همه Query/Commandها |
| Outbox اتمیک | Partial | Done | Partial (ops endpoints) | N/A | N/A | Partial | **بحرانی** | پیام و داده دامنه در یک تراکنش؛ جلوگیری از Id=0 قبل از SaveChanges؛ سیاست retry/dead-letter مستند |
| Inbox پردازش ورودی | Partial | Done (جدول) | Missing | Missing | Missing | Missing | متوسط | مسیر دریافت و پردازش پیام بالادستی تعریف نشده |
| Audit Log متمرکز | Missing | Missing | Missing | Missing | N/A | Optional events | بالا | CreatedBy/ModifiedBy کافی نیست؛ نیاز به قبل/بعد، عملیات، موجودیت، علت |
| کنترل همزمانی (RowVersion) | Partial | Done روی اکثر جداول | Partial | N/A | Partial | N/A | بالا | همه عملیات Update باید ExpectedRowVersion و تعارض را اعمال کنند |
| قراردادهای Lookup/Snapshot | Missing | N/A | Missing | Missing | N/A | Partial catalog | **بحرانی** | جداسازی API مدیریتی از API مصرفی as-of و authorization-check |
| نسخه‌بندی قرارداد Integration | Partial | N/A | N/A | N/A | N/A | Partial (schemaVersion در envelope) | بالا | سیاست سازگاری و تغییر نسخه قراردادها مکتوب و اعمال شود |

### قراردادهای خواندنی حداقلی پیشنهادی (مصرف B–J)

| قرارداد | پرسش مصرف‌کننده | ماژول مالک |
|---------|-------------------|------------|
| `GetCompanyAsOf` | شرکت در تاریخ T فعال است؟ | Organization |
| `GetOrganizationalUnitAsOf` / `GetOrgTreeAsOf` | واحد مسئول در تاریخ T؟ | Organization |
| `GetServiceAreaAsOf` | محدوده خدمات معتبر است؟ | Geography |
| `ResolveDivision/ServiceAreaByPoint` *(فاز بعد)* | نقطه در کدام محدوده است؟ | Geography |
| `GetReferenceItem` / `IsReferenceItemUsable` | آیتم برای عملیات جدید قابل انتخاب است؟ | ReferenceData |
| `ResolveExternalCode` / `ResolveInternalCode` | نگاشت داخلی↔خارجی | ReferenceData |
| `GetParameterValueAsOf` | مقدار معتبر پارامتر در تاریخ و دامنه | Regulations |
| `GetRegulationDocuments` | مستندات مصوبه | Regulations |
| `EvaluatePermission` | آیا کاربر عملیات X را در Scope دارد؟ | AccessManagement |
| `IsWorkingDay` / `GetHolidaysInRange` | روز کاری / تعطیل | Calendar (زیر Regulations یا مشترک) |

---

## ۳. Organization

| قابلیت | Domain | DB | API مدیریتی | API خواندنی | Validation | Events | اولویت | شکاف |
|--------|--------|----|-----------|--------------|------------|--------|--------|------|
| ایجاد شرکت | Done | Done | Done | Partial | Done | CompanyCreated | — | — |
| ویرایش / غیرفعال‌سازی شرکت | Partial | Done | **Missing** | Missing | Missing | Missing change events | بالا | چرخه عمر ناقص |
| ادغام شرکت (Merged) | Partial (Status) | Done | **Missing** | Missing | Missing | Missing | متوسط | عملیات و قواعد ادغام |
| ایجاد واحد | Done | Done | Done | Partial | Done | OU Created | — | Path/Level اولیه |
| تغییر والد / انتقال واحد | Missing | Partial | **Missing** | Missing | Missing | Missing | بالا | ساختار فقط جاری است |
| تاریخچه ساختار / درخت as-of | Missing | Partial (ValidFrom/To) | **Missing** | **Missing** | N/A | Missing | **بالا** | ستون تاریخ ≠ تاریخچه عملیاتی |
| سمت: CRUD کامل | Partial | Done | Create only | Partial | Create only | Missing | بالا | ویرایش/غیرفعال‌سازی |
| انتصاب (Appointment) | Partial | Done | **Missing** | Missing | Missing | Missing | بالا | بدون API مدیریتی |
| جداسازی متصدی از AppUser | **طراحی نادرست نسبی** | وابسته به UserId | Missing | Missing | N/A | N/A | بالا | سمت می‌تواند بدون کاربر سامانه باشد؛ شناسه مرجع پرسنلی |
| جانشینی / سرپرستی موقت | Missing | Missing | Missing | Missing | Missing | Missing | متوسط | بعد از انتصاب پایدار |
| واحد مسئول عملیات | Partial | Partial | Missing | **Missing** | N/A | Missing | **بالا** | قرارداد برای B–J |

**خروجی مرحله تکمیل Organization:** CRUD شرکت/واحد/سمت + انتصاب با بازه زمانی + `GetOrgTreeAsOf` + رویدادهای Changed/Deactivated

---

## ۴. Geography

| قابلیت | Domain | DB | API مدیریتی | API خواندنی | Validation | Events | اولویت | شکاف |
|--------|--------|----|-----------|--------------|------------|--------|--------|------|
| تقسیمات کشوری سلسله‌مراتبی | Done | Done | Create + read | Partial | Done | Created | — | Seed نمونه |
| تاریخچه تغییر تقسیمات | Missing | Partial | Missing | Missing | N/A | Missing | متوسط | as-of |
| ServiceArea CRUD | Partial | Done | Create/Update/Deactivate | Partial | Partial | Created/Status | بالا | خواندن as-of |
| انواع محدوده (آب/فاضلاب/قرائت/...) | Done (AreaType) | Done | Partial | Partial | Partial | Partial | — | — |
| هندسه Polygon/MultiPolygon | **Missing** | **Missing** | Missing | Missing | Missing | Missing | بالا (فاز مکانی) | بدون spatial، point-in-area ممکن نیست |
| Point-in-area / هم‌پوشانی | Missing | Missing | Missing | Missing | N/A | N/A | بالا (پس از geometry) | نیاز SQL Server geography/geometry |
| انتساب محدوده↔واحد در بازه زمانی | Missing | Missing | Missing | Missing | Missing | Missing | بالا | جدول assignment تاریخی |
| مختصات ملک | N/A | N/A | N/A | N/A | N/A | N/A | N/A | متعلق به حوزه Premises/B |

**مرزبندی:** Geometry محدوده در Geography؛ نشانی و مختصات ملک در B.

---

## ۵. ReferenceData

| قابلیت | Domain | DB | API مدیریتی | API خواندنی | Validation | Events | اولویت | شکاف |
|--------|--------|----|-----------|--------------|------------|--------|--------|------|
| Group/Item ایجاد و خواندن | Done | Done | Partial | Partial | Create only | GroupCreated | — | — |
| ویرایش Group/Item | Missing | Done | **Missing** | N/A | Missing | Missing | بالا | — |
| منسوخ‌سازی با قواعد | Partial (Status) | Done | **Missing** | **Missing** `IsUsable` | Missing | Missing | **بالا** | usable vs historical؛ آیتم جایگزین |
| سلسله‌مراتب Item (Parent) | **Missing** | **Missing** | Missing | Missing | Missing | Missing | متوسط | طبقه‌بندی‌های درختی |
| آیتم پیش‌فرض | Partial (IsDefault) | Done | عملیات ناقص | Partial | Missing | Missing | متوسط | یک پیش‌فرض فعال per group |
| CodingStandard | Done | Done | **Missing** | **Missing** | Missing | Missing | متوسط | فقط Seed |
| ExternalSystem | Done | Done | **Missing** | **Missing** | Missing | Missing | متوسط | فقط Seed |
| ExternalCodeMapping CRUD + resolve | Done | Done | **Missing** | **Missing** | Missing | Missing | **بالا** | قلب مهاجرت و یکپارچه‌سازی |
| Measurement Units + تبدیل | Missing / فقط lookup ساده | Seed واحد در ReferenceItem | Missing | Missing | Missing | Missing | متوسط | مدل تبدیل (عامل، واحد پایه) لازم است |
| Currency مرجع | Missing / Seed در ReferenceItem | Seed | Missing | Missing | Missing | Missing | متوسط | مدل نازک Currency کافی است؛ نرخ ارز خارج است |

---

## ۶. Regulations

| قابلیت | Domain | DB | API مدیریتی | API خواندنی | Validation | Events | اولویت | شکاف |
|--------|--------|----|-----------|--------------|------------|--------|--------|------|
| ثبت/انتشار مقرره | Done | Done | Partial | Partial | Partial | Published | — | — |
| ابطال / جایگزینی | Partial (Supersedes, Status) | Done | **Missing** | Partial | Missing | Missing | بالا | — |
| RegulationDocument | Done | Done | **Missing** | **Missing** | Missing | Missing | بالا | Seed دارد، API ندارد |
| پارامتر + نسخه + as-of value | Done | Done | Partial | **Done-ish** value by code | Partial | ParameterPublished | — | نقطه قوت نسبی |
| گردش تأیید واقعی (Draft→Approved→Published) | Partial (فیلدها) | Done | **ناقص** (publish مستقیم) | N/A | Missing | Partial | بالا | ApprovedAt/By باید اجباری در مسیر انتشار |
| دامنه اعمال پارامتر (Scope) | **Missing** | **Missing** | Missing | Missing | Missing | Missing | **بالا** | سراسری / شرکت / محدوده / نوع خدمت |
| اولویت و تعارض مقادیر | Missing | Missing | Missing | Missing | Missing | Missing | متوسط | پس از Scope |
| موتور تعرفه/قبض | N/A | N/A | N/A | N/A | N/A | N/A | N/A | حوزه F |

---

## ۷. AccessManagement

| قابلیت | Domain | DB | API مدیریتی | API خواندنی | Validation | Events | اولویت | شکاف |
|--------|--------|----|-----------|--------------|------------|--------|--------|------|
| User/Role/Permission ایجاد | Done | Done | Partial | Partial | Create | UserCreated, RoleAssigned | — | — |
| ویرایش/قفل کاربر | Missing | Done | **Missing** | Missing | Missing | Missing | بالا | — |
| Grant/Revoke permission on role | Grant partial | Done | Revoke **Missing** | Partial | Partial | Missing revoke event | بالا | — |
| **EvaluatePermission** | **Missing** | N/A | N/A | **Missing** | N/A | N/A | **بحرانی** | بدون این، RBAC فقط داده است نه کنترل |
| Scope جغرافیایی | Missing | Missing | Missing | Missing | Missing | Missing | بالا | فراتر از Company/OU |
| تفویض / جانشینی دسترسی | Missing | Missing | Missing | Missing | Missing | Missing | متوسط | — |
| تعارض وظایف (SoD) | Missing | Missing | Missing | Missing | Missing | Missing | متوسط | — |
| تاریخچه دسترسی | Partial | Partial | Missing | Missing | N/A | Partial | بالا | با Audit مشترک |
| IdP / JWT فنی | N/A | N/A | N/A | N/A | N/A | N/A | N/A | زیرساخت Identity |

مدل پیشنهادی ارزیابی: **Permission + Role + Scope** → پاسخ بولین + دلیل رد.

---

## ۸. قابلیت‌های تکمیلی (بدون ماژول ششم اجباری)

| قابلیت | محل پیشنهادی | Domain | DB | API | Seed | اولویت | شکاف |
|--------|---------------|--------|----|-----|------|--------|------|
| Calendar / Holiday | مشترک زیر Foundation (یا Regulations مجاورت) | Done | Done | **Missing** | Done | **بالا** | IsWorkingDay، بازه تعطیلات |
| Banking reference | ReferenceData (گروه/آیتم) + در آینده API | Seed only | via ReferenceItem | **Missing** | Done | متوسط | ناهماهنگی README/Seed با API؛ Entity جدا لازم نیست اگر ReferenceData کامل شود |
| Measurement Units + conversion | ReferenceData گسترش‌یافته یا زیر‌دامنه Units | Missing | Missing | Missing | Partial codes | متوسط | Factor، BaseUnit، دقت |
| Currency reference | ReferenceData نازک | Missing entity | Seed items | Missing | Partial | متوسط | اعشار، نماد؛ نرخ ارز خارج |
| External Mapping ops | ReferenceData | Done | Done | **Missing** | Done | بالا | Resolve دو طرفه |
| Regulation documents ops | Regulations | Done | Done | **Missing** | Done | بالا | CRUD/list |
| Audit | لایه مشترک Infrastructure | Missing | Missing | Missing | N/A | بالا | یک بار برای همه ماژول‌ها |

---

## ۹. Integration — اصلاحات مشخص

| مورد | وضعیت | اقدام |
|------|--------|--------|
| رویدادهای Created | Partial | نگه داشتن |
| رویدادهای Changed / Deactivated / Published / Revoked | Missing یا ناقص | تعریف و انتشار برای Company, OU, ServiceArea, ReferenceItem, Regulation, Parameter, UserRole, Permission |
| Catalog مصرف‌کننده | Partial | جدا کردن Lookup vs Event payload؛ فیلدهای الزامی |
| schemaVersion policy | Partial | سند سازگاری: minor additive، major breaking |
| Outbox قبل از Identity insert | **باگ** | Enqueue بعد از SaveChanges یا استفاده از Id تولیدشده در همان تراکنش با pattern صحیح |
| Atomicity | Partial | OutboxWriter داخل همان DbContext transaction |
| Inbox | جدول خالی از رفتار | فاز بعد مگر نیاز واقعی به ingest |

---

## ۱۰. اولویت اجرای پیشنهادی (بدون بازنویسی)

### مرحله ۰ — زیرساخت (بلاک‌کننده)
1. Tenant Isolation (Production بدون اعتماد به هدر)
2. اصلاح Outbox/تراکنش و رویدادهای Id
3. قراردادهای خواندنی پایه (حداقل Parameter as-of، Reference usable، Permission evaluate اسکلت)
4. اسکلت Audit

### مرحله ۱ — تکمیل پنج ماژول اصلی (چرخه مدیریت، نه فقط Create)
1. AccessManagement: EvaluatePermission + Scope + revoke
2. Organization: update/deactivate + Appointment API + as-of tree
3. ReferenceData: update/deprecate + ExternalMapping resolve API
4. Regulations: document API + approval path + parameter scope (حداقلی)
5. Geography: as-of ServiceArea + assignment واحد مسئول (geometry در زیرمرحله ۱ب)

### مرحله ۲ — تکمیلی‌های Seedشده اما بدون API
1. Calendar API (IsWorkingDay / holidays range)
2. Banking به‌عنوان ReferenceData خواندنی پایدار
3. Measurement Units + Currency نازک
4. غنی‌سازی رویدادهای Change

### مرحله ۳ — پوشش نیاز B–J
ماتریس مصرف: برای هر حوزه، کدام قرارداد، چه فیلدی، چه تضمین اعتبار/تاریخچه.

---

## ۱۱. چه چیزهایی عمداً اضافه نمی‌شوند

| موضوع | مالک |
|-------|------|
| اشخاص، املاک، مالکیت | B |
| اشتراک و قرارداد | C |
| دستورکار اجرایی | D |
| کنتور و قرائت | E |
| موتور تعرفه و قبض | F |
| حساب و وصول تراکنشی | G |
| بازرسی و تخلف | H |
| فاضلاب تخصصی | I |
| شکایات تخصصی | J |
| Token و رمز | Identity |
| پرونده پرسنلی | HR |

---

## ۱۲. معیار آمادگی «مرجع قابل اتکا»

BusinessFoundation وقتی برای Core CIS قابل اتکا است که:

1. Tenant isolation در Production تأیید شده باشد.
2. حداقل قراردادهای خواندنی as-of و `EvaluatePermission` پایدار باشند.
3. چرخه عمر اصلی (فعال/غیرفعال/منسوخ) برای Company, OU, ReferenceItem, Parameter, Role بدون حذف فیزیکی تاریخچه کار کند.
4. Outbox اتمیک و بدون Id صفر باشد.
5. تغییرات حساس Audit شوند.

تا قبل از این پنج مورد، افزودن featureهای جدید (هندسه پیشرفته، SoD کامل، …) اولویت پایین‌تری دارد.

---

## ۱۳. گام اجرایی بلافاصله بعدی

پیشنهاد شروع پیاده‌سازی از **مرحله ۰**:

1. اصلاح `HttpTenantContext` و سیاست Production  
2. اصلاح ترتیب SaveChanges / Outbox در Handlerهای حساس  
3. تعریف و پیاده‌سازی اسکلت APIهای خواندنی مشترک  
4. جدول و سرویس Audit حداقلی  

سپس `EvaluatePermission` و تکمیل Organization/ReferenceData.
