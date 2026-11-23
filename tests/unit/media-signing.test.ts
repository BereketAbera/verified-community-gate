// Signed media links (R4): only a fresh, untampered link issued to this viewer opens a file.
import { describe, expect, it } from "vitest";
import { issueMediaLink, LINK_TTL_SECONDS, verifyMediaLink } from "@/lib/media-signing";

const SECRET = "test-secret-0123456789abcdef0123456789abcdef";
const NOW = 1_795_000_000;
const VIEWER = "sessionA:m01";

function issue(assetId = "vd-m02", viewer = VIEWER, now = NOW) {
  const { url, exp } = issueMediaLink(assetId, viewer, SECRET, now);
  const params = new URL(url, "http://x").searchParams;
  return { url, exp, sig: params.get("sig")!, expParam: params.get("exp")! };
}

describe("Signed media links", () => {
  it("issues a link that expires 60 seconds from now", () => {
    const { url, exp } = issue();
    expect(exp).toBe(NOW + LINK_TTL_SECONDS);
    expect(url).toMatch(/^\/api\/media\/vd-m02\?exp=\d+&sig=[A-Za-z0-9_-]{43}$/);
  });

  it("accepts a valid link for the viewer it was issued to", () => {
    const { expParam, sig } = issue();
    expect(verifyMediaLink({ assetId: "vd-m02", exp: expParam, sig }, VIEWER, SECRET, NOW + 1)).toEqual({ ok: true });
  });

  it("still accepts the link in its last second", () => {
    const { expParam, sig } = issue();
    expect(verifyMediaLink({ assetId: "vd-m02", exp: expParam, sig }, VIEWER, SECRET, NOW + LINK_TTL_SECONDS).ok).toBe(true);
  });

  it("rejects an expired link", () => {
    const { expParam, sig } = issue();
    expect(verifyMediaLink({ assetId: "vd-m02", exp: expParam, sig }, VIEWER, SECRET, NOW + LINK_TTL_SECONDS + 1)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a tampered signature", () => {
    const { expParam, sig } = issue();
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(verifyMediaLink({ assetId: "vd-m02", exp: expParam, sig: flipped }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a link whose expiry was pushed out", () => {
    const { sig } = issue();
    expect(verifyMediaLink({ assetId: "vd-m02", exp: String(NOW + 3600), sig }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a valid signature reused for a different asset", () => {
    const { expParam, sig } = issue("vd-m02");
    expect(verifyMediaLink({ assetId: "vd-m03", exp: expParam, sig }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a link presented by a different viewer", () => {
    const { expParam, sig } = issue();
    expect(verifyMediaLink({ assetId: "vd-m02", exp: expParam, sig }, "sessionB:m01", SECRET, NOW)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verifyMediaLink({ assetId: "vd-m02", exp: expParam, sig }, "sessionA:s01", SECRET, NOW)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a link presented without a session", () => {
    const { expParam, sig } = issue();
    expect(verifyMediaLink({ assetId: "vd-m02", exp: expParam, sig }, null, SECRET, NOW)).toEqual({ ok: false, reason: "no_session" });
  });

  it("rejects missing parameters", () => {
    const { expParam, sig } = issue();
    expect(verifyMediaLink({ assetId: "vd-m02", exp: null, sig }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "missing" });
    expect(verifyMediaLink({ assetId: "vd-m02", exp: expParam, sig: null }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "missing" });
    expect(verifyMediaLink({ assetId: "vd-m02", exp: "", sig: "" }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects malformed parameters", () => {
    const { expParam, sig } = issue();
    expect(verifyMediaLink({ assetId: "vd-m02", exp: "tomorrow", sig }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "malformed" });
    expect(verifyMediaLink({ assetId: "vd-m02", exp: expParam, sig: sig.slice(0, 20) }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a link signed with another secret", () => {
    const forged = issueMediaLink("vd-m02", VIEWER, "attacker-secret-0123456789abcdef0123456789", NOW);
    const params = new URL(forged.url, "http://x").searchParams;
    expect(verifyMediaLink({ assetId: "vd-m02", exp: params.get("exp"), sig: params.get("sig") }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a correctly signed link with a lifetime the server never issues", () => {
    const longLived = issueMediaLink("vd-m02", VIEWER, SECRET, NOW + 3600);
    const params = new URL(longLived.url, "http://x").searchParams;
    expect(verifyMediaLink({ assetId: "vd-m02", exp: params.get("exp"), sig: params.get("sig") }, VIEWER, SECRET, NOW)).toEqual({ ok: false, reason: "lifetime_too_long" });
  });
});
