import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { calendarsQuery, holidaysQuery, isWorkingDay } from "@/features/foundation/operations";
import { PageHeader } from "@/components/cis/app-shell";
import { DataTable } from "@/components/cis/data-table";
import { InfoList } from "@/components/cis/blocks";
import { QueryBoundary } from "@/components/cis/query-state";
import {
  JalaliMonthGrid,
  JalaliDatePicker,
  useJalaliCursor,
} from "@/components/cis/jalali-date-picker";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/lib/api/hooks";
import { jToDate, jMonthLength, toDateOnly, toJalali } from "@/lib/jalali";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/calendar")({
  head: () => seo("تقویم کاری", "تقویم‌ها، تعطیلات و بررسی روز کاری"),
  component: CalendarPage,
});

function CalendarPage() {
  const calendars = useQuery(calendarsQuery());
  const [selected, setSelected] = useState<{ code: string; name: string }>();

  return (
    <div className="space-y-6">
      <PageHeader title="تقویم کاری" desc="این بخش فقط‌خواندنی است و از سرور مرکزی تغذیه می‌شود" />
      <DataTable
        rows={calendars.data ?? []}
        loading={calendars.isPending}
        error={calendars.error ?? undefined}
        onRetry={() => void calendars.refetch()}
        rowKey={(r) => r.code}
        onRowClick={setSelected}
        columns={[
          { key: "code", header: "کد" },
          { key: "name", header: "نام" },
          { key: "description", header: "توضیح" },
        ]}
        emptyText="تقویمی از سامانه مرکزی دریافت نشد."
        exportName="work-calendars"
      />
      {selected ? (
        <CalendarMonth key={selected.code} calendar={selected} />
      ) : (
        <p className="text-sm text-muted-foreground">
          برای مشاهده تعطیلات و بررسی روز کاری، یک تقویم را انتخاب کنید.
        </p>
      )}
    </div>
  );
}

function CalendarMonth({ calendar }: { calendar: { code: string; name: string } }) {
  const cursor = useJalaliCursor();
  const from = toDateOnly(jToDate(cursor.y, cursor.m, 1));
  const to = toDateOnly(jToDate(cursor.y, cursor.m, jMonthLength(cursor.y, cursor.m)));
  const holidays = useQuery(holidaysQuery(calendar.code, from, to));
  const [date, setDate] = useState<Date>();
  const checker = useApiMutation((d: Date) => isWorkingDay(calendar.code, toDateOnly(d)), {
    success: "نتیجه بررسی دریافت شد",
    invalidate: [],
  });

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{calendar.name}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => cursor.move(-1)}>
              ماه قبل
            </Button>
            <h3 className="font-semibold">{cursor.title}</h3>
            <Button variant="outline" onClick={() => cursor.move(1)}>
              ماه بعد
            </Button>
          </div>
          <QueryBoundary query={holidays}>
            {(rows) => (
              <JalaliMonthGrid
                year={cursor.y}
                month={cursor.m}
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  checker.reset();
                }}
                marked={(d) =>
                  rows
                    .filter((r) => r.date.slice(0, 10) === toDateOnly(d))
                    .map((r) => r.title)
                    .join("، ") || undefined
                }
              />
            )}
          </QueryBoundary>
        </div>
        <DataTable
          rows={holidays.data ?? []}
          loading={holidays.isPending}
          error={holidays.error ?? undefined}
          onRetry={() => void holidays.refetch()}
          rowKey={(r) => `${r.date}:${r.title}:${r.type}`}
          columns={[
            { key: "date", header: "تاریخ", cell: (r) => toJalali(r.date) },
            { key: "title", header: "عنوان" },
            { key: "type", header: "نوع" },
            {
              key: "recurring",
              header: "تکرار سالانه",
              cell: (r) => (r.recurring ? "بله" : "خیر"),
            },
          ]}
          emptyText="در این ماه تعطیلی ثبت نشده است."
          exportName="month-holidays"
        />
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-semibold">روز کاری است؟</h3>
        <div className="flex flex-wrap gap-2">
          <JalaliDatePicker
            value={date}
            onChange={(d) => {
              setDate(d);
              checker.reset();
            }}
          />
          <Button
            disabled={!date || checker.isPending}
            onClick={() => {
              if (date) checker.mutate(date);
            }}
          >
            {checker.isPending ? "در حال بررسی…" : "بررسی"}
          </Button>
        </div>
        {checker.data && (
          <InfoList
            cols={2}
            items={Object.entries(checker.data).map(([key, v]) => [
              key,
              typeof v === "boolean"
                ? v
                  ? "بله"
                  : "خیر"
                : v == null
                  ? "—"
                  : typeof v === "object"
                    ? JSON.stringify(v)
                    : String(v),
            ])}
          />
        )}
      </div>
    </section>
  );
}
