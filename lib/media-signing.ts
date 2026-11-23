// Short-lived signed media links. A link is an HMAC-SHA256 over the asset id, the viewer
// it was issued to and its expiry, keyed with a server-only secret. The viewer id is not
// in the URL: the media route recomputes the signature with the viewer from the session,
// so a link copied to anyone else (or to a signed-out browser) fails.
import { createHmac, timingSafeEqual } from "node:crypto";

export const LINK_TTL_SECONDS = 60;
const CLOCK_SKEW_SECONDS = 5;

export type LinkFailure = "missing" | "malformed" | "no_session" | "bad_signature" | "expired" | "lifetime_too_long";
export type LinkCheck = { ok: true } | { ok: false; reason: LinkFailure };

// #region sign
function mac(assetId: string, viewerId: string, exp: number, secret: string): Buffer {
  return createHmac("sha256", secret).update(`v1\n${assetId}\n${viewerId}\n${exp}`).digest();
}

export function issueMediaLink(assetId: string, viewerId: string, secret: string, now = nowSeconds()) {
  const exp = now + LINK_TTL_SECONDS;
  const sig = mac(assetId, viewerId, exp, secret).toString("base64url");
  return { url: `/api/media/${encodeURIComponent(assetId)}?exp=${exp}&sig=${sig}`, exp };
}
// #endregion

// #region verify
export function verifyMediaLink(
  link: { assetId: string; exp: string | null; sig: string | null },
  viewerId: string | null, // from the session, never from the URL
  secret: string,
  now = nowSeconds(),
): LinkCheck {
  if (!link.exp || !link.sig) return { ok: false, reason: "missing" };
  if (!/^\d{1,12}$/.test(link.exp) || !/^[A-Za-z0-9_-]{43}$/.test(link.sig)) return { ok: false, reason: "malformed" };
  if (!viewerId) return { ok: false, reason: "no_session" };
  const exp = Number(link.exp);
  const expected = mac(link.assetId, viewerId, exp, secret);
  const given = Buffer.from(link.sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "bad_signature" }; // altered, or issued to a different viewer
  }
  if (now > exp) return { ok: false, reason: "expired" };
  if (exp - now > LINK_TTL_SECONDS + CLOCK_SKEW_SECONDS) return { ok: false, reason: "lifetime_too_long" };
  return { ok: true };
}
// #endregion

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export const LINK_FAILURE_MESSAGES: Record<LinkFailure, string> = {
  missing: "This media link has no signature.",
  malformed: "This media link is malformed.",
  no_session: "This media link was issued to a signed-in viewer.",
  bad_signature: "This media link was altered, or it was issued to someone else.",
  expired: "This media link has expired. Links last 60 seconds.",
  lifetime_too_long: "This media link asks for a longer lifetime than the server issues.",
};
