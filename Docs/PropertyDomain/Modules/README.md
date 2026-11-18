# راهنمای مستندات ماژول‌های دامنه

این پوشه راهنمای ورود به مستندات هفت ماژول دامنه نسخه 11.8 است. سند تفصیلی هر ماژول در `Modules/<Module>/README.md` نگهداری می‌شود تا در کنار کد همان ماژول قابل دسترسی باشد.

## فهرست ماژول‌ها

| شناسه | نام دامنه | سند تفصیلی | مسئولیت اصلی |
|---|---|---|---|
| B01 | Party & Identity | `Modules/Party/README.md` | هویت اشخاص حقیقی و حقوقی، شناسه، تماس، احراز هویت و ادغام شخص |
| B02 | Ownership & Occupancy | `Modules/Ownership/README.md` | پرونده مالکیت، نسخه‌های مالکیت، سهم‌ها، حق تصرف و سابقه تصرف واقعی |
| B03 | Premises & Property Structure | `Modules/Premises/README.md` | هویت Premises، نشانی، کاتالوگ Parcel/Building/Unit و پیوندهای زمانی ساختار |
| B04 | Usage & Classification | `Modules/UsageClassification/README.md` | طبقه‌بندی، Segment، Assertion، Assignment، Activity، Change Case و شواهد |
| B05 | Customer | `Modules/Customer/README.md` | ثبت Customer، ارتباط Party، Principal، محدودیت و ادغام Customer |
| B06 | Relationships & Authorization | `Modules/Relationship/README.md` | رابطه Party با هدف و اعطا/ارزیابی مجوز در Scope |
| B07 | Customer Lifecycle | `Modules/CustomerLifecycle/README.md` | پرونده چرخه عمر، تغییر اطلاعات، Timeline و یکپارچه‌سازی |

## قواعد خواندن مستندات

۱. سند هر ماژول، وضعیت نسخه مبنا را توصیف می‌کند؛ شرح پیشنهاد آتی نیست مگر آنکه با عنوان «مورد باز» یا «نیازمند تصمیم» مشخص شده باشد.

۲. وجود Entity، DbSet، جدول یا فیلد به‌تنهایی به معنی پیاده‌سازی Use Case یا Workflow متناظر نیست. برای ادعای پیاده‌سازی، Endpoint و Handler/Service و قواعد پایگاه داده باید با هم بررسی شوند.

۳. کدهای عددی که فقط دامنه Check Constraint آن‌ها معلوم است، بدون مرجع رسمی معنی‌گذاری نمی‌شوند.

۴. وضعیت آزمون باید از گزارش اجرای واقعی تفکیک شود. وجود فایل Verification Plan یا SQL Test به معنی Passed بودن آزمون نیست.

۵. نام کلاس‌ها، متدها، Endpointها، Schemaها، جدول‌ها، ستون‌ها، تنظیمات و شناسه‌های فنی به شکل اصلی انگلیسی نوشته می‌شوند تا قابل جست‌وجو و تطبیق با کد باشند. توضیح‌ها، قواعد و راهنماها فارسی هستند.

## نقشه منابع مشترک

- معماری کلان: `Docs/Architecture/01-معماری-کلان-سامانه.md`
- نگاشت Entity و جدول: `Infrastructure/PropertyDomainDbContext.cs`
- رویدادها: `Domain/Events/`
- قراردادهای پیام: `Docs/Integration/`
- تغییرات پایگاه داده: `Database/PropertyDomain-Migrations.sql`
- اسکریپت‌های راستی‌آزمایی SQL: `Tests/Database/`
- وضعیت مستندسازی نسخه 11.8: `Docs/Documentation/`
