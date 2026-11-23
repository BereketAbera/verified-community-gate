// Billing behind one interface (R6): events from any processor land in our own access record.
import { describe, expect, it } from "vitest";
import { addMonths, hasActiveAccess } from "@/lib/access";
import { applyBillingEvent, signTestEvent, testModeProvider, type BillingEvent } from "@/lib/billing";
import type { Access } from "@/lib/types";

const NOW = Date.parse("2026-11-23T12:00:00Z");
const FREE: Access = { kind: "free", until: null, setBy: null };
const SECRET = "billing-secret-for-tests-0123456789abcdef";

describe("Access to start conversations", () => {
  it.each([
    ["free", FREE, false],
    ["paid, running", { kind: "paid", until: "2026-12-01T00:00:00Z", setBy: null }, true],
    ["paid, ended", { kind: "paid", until: "2026-11-01T00:00:00Z", setBy: null }, false],
    ["founding, not started", { kind: "founding", until: null, setBy: null }, false],
    ["complimentary, running", { kind: "complimentary", until: "2027-01-01T00:00:00Z", setBy: "s02" }, true],
  ] as const)("%s: active = %s", (_, access, active) => {
    expect(hasActiveAccess(access, NOW)).toBe(active);
  });

  it("adds calendar months in UTC", () => {
    expect(new Date(addMonths(Date.parse("2026-11-23T08:00:00Z") / 1000, 3) * 1000).toISOString()).toBe("2027-02-23T08:00:00.000Z");
  });
});

describe("Billing events written to our own record", () => {
  const active: BillingEvent = { id: "evt-1", type: "subscription.active", memberId: "m01", periodEnd: "2026-12-23T00:00:00Z" };

  it("an active subscription becomes paid access until the end of the period", () => {
    expect(applyBillingEvent(FREE, active, new Set())).toEqual({ kind: "paid", until: "2026-12-23T00:00:00Z", setBy: null });
  });

  it("an event id that was already applied changes nothing", () => {
    expect(applyBillingEvent(FREE, active, new Set(["evt-1"]))).toBe(FREE);
  });

  it("a cancellation keeps access until the period already paid for ends", () => {
    const paid = applyBillingEvent(FREE, active, new Set());
    const cancelled = applyBillingEvent(paid, { id: "evt-2", type: "subscription.cancelled", memberId: "m01", periodEnd: "2026-12-23T00:00:00Z" }, new Set());
    expect(cancelled).toEqual({ kind: "paid", until: "2026-12-23T00:00:00Z", setBy: null });
    expect(hasActiveAccess(cancelled, NOW)).toBe(true);
  });

  it("a failed payment does not cut access short", () => {
    const paid = applyBillingEvent(FREE, active, new Set());
    expect(applyBillingEvent(paid, { id: "evt-3", type: "payment.failed", memberId: "m01" }, new Set())).toBe(paid);
  });
});

describe("Test-mode provider", () => {
  const provider = testModeProvider(SECRET);
  const body = JSON.stringify({ id: "evt-9", type: "subscription.active", memberId: "m01", periodEnd: "2026-12-23T00:00:00Z" });

  it("accepts a webhook signed with its secret", async () => {
    await expect(provider.handleWebhook(body, signTestEvent(SECRET, body))).resolves.toMatchObject({ id: "evt-9", type: "subscription.active" });
  });

  it("refuses an altered body, a missing signature or another secret", async () => {
    const signature = signTestEvent(SECRET, body);
    await expect(provider.handleWebhook(body.replace("m01", "m02"), signature)).rejects.toThrow("bad_webhook_signature");
    await expect(provider.handleWebhook(body, null)).rejects.toThrow("bad_webhook_signature");
    await expect(provider.handleWebhook(body, signTestEvent("another-secret-0123456789abcdef0123", body))).rejects.toThrow("bad_webhook_signature");
  });

  it("hands out a checkout address for the idempotency key", async () => {
    await expect(provider.createCheckout({ memberId: "m01", idempotencyKey: "chk-1" })).resolves.toEqual({ url: "/billing/test-checkout/chk-1" });
  });
});
