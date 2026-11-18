import { describe, expect, it } from "vitest";
import { RLM, toJalali, toJalaliDateTime, toJalaliLong } from "@/lib/jalali";

// 2026-11-18 (Wednesday) is 27 Aban 1405 in the Solar Hijri calendar.
const d = new Date(2026, 10, 18, 9, 5);

describe("Persian (Solar Hijri) dates", () => {
  it("short date uses Persian digits, year/month/day", () => {
    expect(toJalali(d).replaceAll(RLM, "")).toBe("۱۴۰۵/۰۸/۲۷");
  });
  it("short date is laid out right-to-left (a right-to-left mark before every slash)", () => {
    expect(toJalali(d)).toBe("۱۴۰۵\u200F/۰۸\u200F/۲۷");
  });
  it("long date reads weekday, day, month, year in Persian order", () => {
    expect(toJalaliLong(d)).toBe("چهارشنبه ۲۷ آبان ۱۴۰۵");
  });
  it("date-time uses the Persian comma and Persian digits", () => {
    expect(toJalaliDateTime(d).replaceAll(RLM, "")).toBe("۱۴۰۵/۰۸/۲۷، ساعت ۰۹:۰۵");
  });
  it("empty or invalid values show a dash", () => {
    expect(toJalali(undefined)).toBe("—");
    expect(toJalali("not a date")).toBe("—");
  });
});
