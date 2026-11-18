import { describe, expect, it } from "vitest";
import { toPage } from "@/lib/api/list";
import { ApiError } from "@/lib/api/client";
import { errorMessage, fieldErrors } from "@/lib/api/messages";

describe("server list responses", () => {
  it("reads a paged response's items and server total", () => {
    const p = toPage({ items: [{ id: 1 }], totalCount: 57, page: 3, pageSize: 20 });
    expect(p.items).toHaveLength(1);
    expect(p.total).toBe(57);
    expect(p.page).toBe(3);
  });
  it("accepts PascalCase responses", () => expect(toPage({ Items: [{}, {}], TotalCount: 2 }).total).toBe(2));
  it("treats a bare array as the full list", () => expect(toPage([{}, {}, {}]).total).toBe(3));
});

describe("server errors", () => {
  it("a 409 conflict uses the server's explanation", () => {
    expect(errorMessage(new ApiError("http", 409, "x", { detail: "مشترک محدودیت فعال دارد" }))).toBe("مشترک محدودیت فعال دارد");
  });
  it("a 403 explains the missing permission", () => expect(errorMessage(new ApiError("http", 403, "x"))).toMatch(/مجوز/));
  it("400 validation errors are mapped to their fields", () => {
    const fe = fieldErrors(new ApiError("http", 400, "x", { errors: { NationalId: ["کد ملی تکراری است"] } }));
    expect(Object.values(fe)).toContain("کد ملی تکراری است");
  });
});
