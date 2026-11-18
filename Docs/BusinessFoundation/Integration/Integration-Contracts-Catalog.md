# کاتالوگ قراردادهای یکپارچه‌سازی — BusinessFoundation

این سند قراردادهای خروجی (Outbound Integration Events) پروژه BusinessFoundation را توصیف می‌کند.

سایر ماژول‌های Core CIS باید از طریق این قراردادها (نه دسترسی مستقیم به جداول) اطلاعات پایه را دریافت کنند.

## قالب استاندارد Envelope

```json
{
  "messageId": "uuid",
  "messageType": "CompanyCreated",
  "sourceDomain": "Organization",
  "schemaVersion": 1,
  "occurredAt": "2026-11-17T12:00:00Z",
  "correlationId": null,
  "causationId": null,
  "data": { ... }
}
```

## رویدادهای Organization

| رویداد | دامنه منبع | توضیح | مصرف‌کنندگان احتمالی |
|--------|------------|--------|----------------------|
| `CompanyCreated` | Organization | شرکت جدید ثبت شد | Customer, Service, Collection, Admin |
| `OrganizationalUnitCreated` | Organization | واحد سازمانی جدید | WorkOrder, Metering, Inspection |
| `OrganizationalUnitChanged` | Organization | تغییر واحد | WorkOrder, Reporting |

## رویدادهای Geography

| رویداد | دامنه منبع | توضیح | مصرف‌کنندگان احتمالی |
|--------|------------|--------|----------------------|
| `AdministrativeDivisionCreated` | Geography | تقسیمات کشوری | Customer, Service, Metering |
| `ServiceAreaCreated` | Geography | محدوده خدمات جدید | WorkOrder, Metering, Inspection, Wastewater |
| `ServiceAreaStatusChanged` | Geography | تغییر وضعیت محدوده | WorkOrder, Metering |

## رویدادهای ReferenceData

| رویداد | دامنه منبع | توضیح | مصرف‌کنندگان احتمالی |
|--------|------------|--------|----------------------|
| `ReferenceGroupCreated` | ReferenceData | گروه مرجع جدید | همه |
| `ReferenceItemCreated` | ReferenceData | آیتم مرجع جدید | همه |
| `ReferenceItemStatusChanged` | ReferenceData | منسوخ/فعال‌سازی آیتم | همه |

## رویدادهای Regulations

| رویداد | دامنه منبع | توضیح | مصرف‌کنندگان احتمالی |
|--------|------------|--------|----------------------|
| `RegulationPublished` | Regulations | انتشار مصوبه | Billing, Collection, Inspection, Wastewater |
| `BusinessParameterPublished` | Regulations | انتشار نسخه پارامتر | Billing, Collection |

## رویدادهای AccessManagement

| رویداد | دامنه منبع | توضیح | مصرف‌کنندگان احتمالی |
|--------|------------|--------|----------------------|
| `AppUserCreated` | AccessManagement | کاربر جدید | همه (امنیت) |
| `UserRoleAssigned` | AccessManagement | تخصیص نقش | همه (امنیت) |
| `UserRoleRevoked` | AccessManagement | لغو نقش | همه (امنیت) |

## نکات مهم

1. `sourceDomain` همیشه یکی از نام‌های معنادار است: `Organization`, `Geography`, `ReferenceData`, `Regulations`, `AccessManagement`.
2. مصرف‌کنندگان نباید به جداول داخلی BusinessFoundation وابسته شوند.
3. برای دریافت مقدار پارامتر در تاریخ مشخص از API خواندنی `/api/v1/regulations/parameters/{code}/value?asOf=` استفاده کنید.
4. Outbox تضمین می‌کند که رویدادها حداقل یک‌بار تحویل داده شوند (at-least-once). مصرف‌کننده باید idempotent باشد.

## قراردادهای خواندنی Lookup (P1)

| قرارداد | HTTP | توضیح |
|---------|------|--------|
| IsReferenceItemUsable | `GET /api/v1/reference-data/groups/{groupCode}/items/{itemCode}/usable?asOf=` | آیا کد برای عملیات جدید مجاز است |
| GetParameterValueAsOf | `GET /api/v1/regulations/parameters/{code}/value?asOf=` | مقدار Published پارامتر در زمان |
| IsWorkingDay | `GET /api/v1/calendar/{calendarCode}/is-working-day?date=` | روزکاری بر اساس تعطیل + جمعه |
| GetHolidaysInRange | `GET /api/v1/calendar/{calendarCode}/holidays?from=&to=` | تعطیلات بازه (شامل recurring) |

## قراردادهای Organization / Mapping (P2)

| قرارداد | HTTP |
|---------|------|
| GetCompanyAsOf | `GET /api/v1/organization/companies/{id}/as-of?asOf=` |
| GetCompanyByCodeAsOf | `GET /api/v1/organization/companies/by-code/{code}/as-of?asOf=` |
| GetOrgTreeAsOf | `GET /api/v1/organization/companies/{id}/tree/as-of?asOf=&parentUnitId=` |
| ResolveExternalCode | `GET /api/v1/reference-data/mappings/resolve-external?externalSystemCode=&externalCode=&internalEntityType=&internalGroupCode=&asOf=` |
| ResolveInternalCode | `GET /api/v1/reference-data/mappings/resolve-internal?externalSystemCode=&internalCode=&internalEntityType=&internalGroupCode=&asOf=` |

### خطاهای Resolve Mapping

| ErrorCode | HTTP | معنی |
|-----------|------|------|
| `MAPPING_MISSING_REQUIRED` | 400 | پارامتر اجباری خالی است |
| `MAPPING_SYSTEM_NOT_FOUND` | 404 | سامانه خارجی تعریف نشده |
| `MAPPING_SYSTEM_INACTIVE` | 409 | سامانه خارجی غیرفعال است |
| `MAPPING_NOT_FOUND` | 200 | نگاشتی در زمان ارزیابی نیست (`found=false`) |
| `MAPPING_AMBIGUOUS` | 409 | بیش از یک هدف داخلی/خارجی؛ `ambiguousCandidates` |

مصرف‌کننده باید روی `errorCode` و `found` شاخه بزند، نه متن `reason`.

## P3 — Appointment / Parameter Scope / Boundary

| قرارداد | HTTP |
|---------|------|
| CreateAppointment | `POST /api/v1/organization/appointments` (HolderCode/Name الزامی؛ UserId اختیاری) |
| EndAppointment | `POST /api/v1/organization/appointments/{id}/end` |
| GetAppointmentsAsOf | `GET /api/v1/organization/appointments/as-of?organizationalUnitId=&positionId=&holderCode=&asOf=` |
| GetParameterValueAsOf + Company scope | `GET /api/v1/regulations/parameters/{code}/value?asOf=&companyId=` — نسخه شرکتی بر سراسری اولویت دارد |
| ServiceArea.BoundaryGeoJson | Create/Update ServiceArea — ذخیره GeoJSON متنی (بدون point-in-area) |

Migration: `Database/Migrations/20261117_P3_AppointmentScopeGeometry.sql`

## P4 — Inbox / Banking / SoD

| قرارداد | HTTP | یادداشت |
|---------|------|---------|
| AcceptInbox | `POST /api/v1/integration/inbox` | Idempotent روی Tenant+Consumer+MessageId؛ hash drift = خطا |
| ListInbox | `GET /api/v1/integration/inbox?take=` | |
| Banks | `GET /api/v1/banking/banks` | ReferenceData group `Bank` |
| PaymentChannels | `GET /api/v1/banking/payment-channels` | group `BankPaymentChannel` |
| BillProviders | `GET /api/v1/banking/bill-payment-providers` | group `BillPaymentProvider` |
| SoD rules | `GET/POST /api/v1/access/sod-rules` | در AssignRole اعمال می‌شود |

ABAC مبتنی بر Resource هنوز Deferred است (EvaluatePermission فقط RBAC+Scope سازمانی).

### External Mapping management
| API | Path |
|-----|------|
| List systems | GET /api/v1/reference-data/external-systems |
| Create system | POST /api/v1/reference-data/external-systems |
| Deactivate | POST .../external-systems/{id}/deactivate |
| List standards | GET /api/v1/reference-data/coding-standards |
| Create standard | POST /api/v1/reference-data/coding-standards |
| Search mappings | GET /api/v1/reference-data/mappings |
| Create mapping | POST /api/v1/reference-data/mappings |
| Update mapping | PUT /api/v1/reference-data/mappings/{id} |
| Mapping as-of | GET /api/v1/reference-data/mappings/{id}/as-of |
