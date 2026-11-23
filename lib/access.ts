// Who may start a conversation (R6). The status lives in our own records, not in the
// payment processor: lib/billing.ts writes processor events into the same Access shape.
import type { Access, AccessKind } from "./types";

/** Three free months for the first 500 sign-ups. The months start when a moderator approves. */
export const FOUNDING = { places: 500, months: 3 } as const;

// #region access
/** Starting a conversation needs paid, complimentary or founding access that has not ended. */
export function hasActiveAccess(access: Access, now: number): boolean {
  if (access.kind === "free" || access.until === null) return false;
  return Date.parse(access.until) > now;
}
// #endregion

export function addMonths(epochSeconds: number, months: number): number {
  const date = new Date(epochSeconds * 1000);
  date.setUTCMonth(date.getUTCMonth() + months);
  return Math.floor(date.getTime() / 1000);
}

export const ACCESS_LABELS: Record<AccessKind, string> = {
  free: "Free",
  paid: "Paid subscription",
  complimentary: "Complimentary",
  founding: "Founding member",
};
