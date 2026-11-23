// Billing behind one interface (R6, Q7, Q8). The processor is not final, so nothing outside
// this file knows which one is in use: a provider turns its webhooks into BillingEvents, and
// applyBillingEvent writes them to our own access record. Stripe and Authorize.net adapters
// implement the same interface; this demo plugs in a test-mode provider with no network.
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import type { Access } from "./types";

// #region provider
export interface BillingProvider {
  /** Hosted checkout for the one plan (same price for everyone). Retries reuse the key. */
  createCheckout(input: { memberId: string; idempotencyKey: string }): Promise<{ url: string }>;
  /** Stops renewal. Access runs to the end of the period already paid. */
  cancel(input: { subscriptionId: string; idempotencyKey: string }): Promise<void>;
  /** Checks the processor's signature and maps its payload to one of our events. */
  handleWebhook(rawBody: string, signature: string | null): Promise<BillingEvent>;
}

export type BillingEvent =
  | { id: string; type: "subscription.active"; memberId: string; periodEnd: string }
  | { id: string; type: "subscription.cancelled"; memberId: string; periodEnd: string }
  | { id: string; type: "payment.failed"; memberId: string };
// #endregion

// #region apply
/** Writes a processor event to our own record. A replayed event id changes nothing. */
export function applyBillingEvent(access: Access, event: BillingEvent, applied: ReadonlySet<string>): Access {
  if (applied.has(event.id)) return access; // webhooks are retried: apply each event once
  switch (event.type) {
    case "subscription.active":
      return { kind: "paid", until: event.periodEnd, setBy: null };
    case "subscription.cancelled":
      return { ...access, until: event.periodEnd }; // no renewal; access runs to the period end
    case "payment.failed":
      return access; // the processor retries; access lasts until the paid period ends
  }
}
// #endregion

/** The provider this demo uses: no network, but webhooks are signed and checked like real ones. */
export function testModeProvider(secret: string): BillingProvider {
  const key = Buffer.from(hkdfSync("sha256", secret, "trust-gate-demo", "billing-test-webhook-v1", 32));
  const sign = (body: string) => createHmac("sha256", key).update(body).digest("base64url");
  return {
    async createCheckout({ idempotencyKey }) {
      return { url: `/billing/test-checkout/${encodeURIComponent(idempotencyKey)}` };
    },
    async cancel() {},
    async handleWebhook(rawBody, signature) {
      const expected = Buffer.from(sign(rawBody));
      const given = Buffer.from(signature ?? "");
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new Error("bad_webhook_signature");
      return JSON.parse(rawBody) as BillingEvent;
    },
  };
}

/** Signs a test event the way the test-mode processor would. Used by the demo's checkout. */
export function signTestEvent(secret: string, rawBody: string): string {
  const key = Buffer.from(hkdfSync("sha256", secret, "trust-gate-demo", "billing-test-webhook-v1", 32));
  return createHmac("sha256", key).update(rawBody).digest("base64url");
}
