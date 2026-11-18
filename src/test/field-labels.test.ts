import { describe, expect, it } from "vitest";
import { fieldLabel } from "@/lib/field-labels";
import { DEMO_KEYS } from "@/lib/api/demo-keys";

describe("fieldLabel", () => {
  it("gives every field the services send a Persian name with no English letters", () => {
    const missing = DEMO_KEYS.filter((k) => /[A-Za-z]/.test(fieldLabel(k)));
    expect(missing).toEqual([]);
  });
  it("puts Persian words in Persian order", () => {
    expect(fieldLabel("customerNumber")).toBe("شماره اشتراک");
    expect(fieldLabel("activityTypeName")).toBe("نام نوع فعالیت");
    expect(fieldLabel("createdAt")).toBe("زمان ایجاد");
    expect(fieldLabel("principalNationalId")).toBe("کد ملی اصلی");
    expect(fieldLabel("CustomerId")).toBe("شناسه مشترک");
  });
});
