import { describe, expect, it } from "vitest";
import { sharesError } from "@/features/ownership/api";
import { blockedTransitions, lifecycleActions } from "@/features/lifecycle/api";
import { isValidNationalId, isValidMobile } from "@/lib/validation";
import { resolvePermissions } from "@/lib/auth/permissions";
import { P } from "@/lib/auth/permission-codes";

describe("ownership shares", () => {
  it("accepts shares that total exactly 100%", () => expect(sharesError([60, 40])).toBeUndefined());
  it("rejects shares that do not total 100%", () => expect(sharesError([60, 30])).toBeDefined());
  it("rejects a zero share", () => expect(sharesError([100, 0])).toBeDefined());
});

describe("customer restrictions block status changes", () => {
  it("NoDisconnect blocks Suspend and Close", () => expect([...blockedTransitions(["NoDisconnect"])].sort()).toEqual(["Close", "Suspend"]));
  it("NoNewConnection blocks Activate, Reactivate and Reopen", () => expect([...blockedTransitions(["NoNewConnection"])].sort()).toEqual(["Activate", "Reactivate", "Reopen"]));
  it("other restrictions block nothing", () => expect(blockedTransitions(["Other"]).size).toBe(0));
});

describe("request workflow", () => {
  it("only an under-review case can be approved or rejected", () => {
    expect(lifecycleActions("UnderReview")).toEqual(["approve", "reject"]);
    expect(lifecycleActions("Submitted")).not.toContain("approve");
  });
  it("a failed execution can be retried", () => expect(lifecycleActions("Failed")).toEqual(["retry-execution"]));
});

describe("identity validation", () => {
  it("accepts a valid national id, including Persian digits", () => {
    expect(isValidNationalId("0013542419")).toBe(true);
    expect(isValidNationalId("۰۰۱۳۵۴۲۴۱۹")).toBe(true);
  });
  it("rejects a national id with a wrong check digit", () => expect(isValidNationalId("0013542418")).toBe(false));
  it("mobile numbers must be 11 digits starting with 09", () => { expect(isValidMobile("09121234567")).toBe(true); expect(isValidMobile("9121234567")).toBe(false); });
});

describe("permissions", () => {
  it("a user without a permission cannot use it once permissions are loaded", () => {
    const p = resolvePermissions("success", { codes: [P.CustomerRead], roles: [] });
    expect(p.can(P.CustomerRead)).toBe(true);
    expect(p.can(P.CustomerCreate)).toBe(false);
  });
});
