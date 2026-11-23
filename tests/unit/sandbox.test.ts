// The cookie sandbox: encrypted, tamper-evident, and always small enough for a cookie.
import { CompactEncrypt } from "jose";
import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { deriveSandboxKey, MAX_COOKIE_CHARS, openSandbox, SandboxFullError, sealSandbox } from "@/lib/sandbox-codec";
import { freshSandbox, LIMITS, type Sandbox } from "@/lib/sandbox";

const KEY = deriveSandboxKey("session-secret-for-tests-0123456789abcdef");

/** Long reasons in characters that barely compress: the worst case for the cookie. */
function hardText(seed: number, length: number): string {
  let x = seed;
  return Array.from({ length }, () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return String.fromCharCode(0x4e00 + (x % 20000));
  }).join("");
}

function busySandbox(): Sandbox {
  const sb = freshSandbox("abcdefghijkl");
  sb.as = "moderator";
  for (let i = 0; i < LIMITS.log; i++) sb.log.push([1_795_000_000 - i, "s01", "note", "m08", `Note number ${i} ${"x".repeat(140)}`]);
  for (let i = 0; i < LIMITS.notes; i++) sb.notes.push([1_795_000_000 - i, "s01", "m08", `${i} ${"Long moderator note text. ".repeat(10)}`.slice(0, 280)]);
  return sb;
}

describe("Sandbox cookie", () => {
  it("round-trips a sandbox", async () => {
    const sb = freshSandbox();
    sb.as = "member";
    sb.blk.add.push(["m01", "m02"]);
    expect(await openSandbox(await sealSandbox(sb, KEY), KEY)).toEqual(sb);
  });

  it("is encrypted: the token does not contain the plaintext", async () => {
    const sb = freshSandbox();
    sb.as = "admin";
    const token = await sealSandbox(sb, KEY);
    expect(token).not.toContain("admin");
    expect(token.split(".")).toHaveLength(5);
  });

  it("rejects a tampered token", async () => {
    const token = await sealSandbox(freshSandbox(), KEY);
    const parts = token.split(".");
    parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
    expect(await openSandbox(parts.join("."), KEY)).toBeNull();
  });

  it("rejects a token sealed with another key", async () => {
    const token = await sealSandbox(freshSandbox(), deriveSandboxKey("another-secret-0123456789abcdef0123456789"));
    expect(await openSandbox(token, KEY)).toBeNull();
  });

  it("rejects well-encrypted content that is not a valid sandbox", async () => {
    const bogus = { ...freshSandbox(), as: "superuser" };
    const token = await new CompactEncrypt(deflateRawSync(Buffer.from(JSON.stringify(bogus))))
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .encrypt(KEY);
    expect(await openSandbox(token, KEY)).toBeNull();
  });

  it("stays under the cookie size budget by dropping the oldest entries", async () => {
    const sb = busySandbox();
    const token = await sealSandbox(sb, KEY);
    expect(token.length).toBeLessThanOrEqual(MAX_COOKIE_CHARS);
    const opened = await openSandbox(token, KEY);
    expect(opened).not.toBeNull();
    expect(opened!.log[0]).toEqual(sb.log[0]); // newest entry kept
  });

  it("refuses state that cannot be trimmed to fit, instead of writing a cookie the browser would drop", async () => {
    const sb = freshSandbox("abcdefghijkl");
    for (let i = 1; i <= 14; i++) {
      const id = `m${String(i).padStart(2, "0")}`;
      sb.ov[id] = { s: "banned", d: { s: "banned", r: hardText(i, 160), by: "s02", at: 1_795_000_000 }, f: { r: hardText(i + 100, 160), by: "s01", at: 1_795_000_000 } };
    }
    await expect(sealSandbox(sb, KEY)).rejects.toBeInstanceOf(SandboxFullError);
  });

  it("keeps decisions and drops only log entries and notes while trimming", async () => {
    const sb = busySandbox();
    sb.ov.m08 = { s: "approved", d: { s: "approved", r: null, by: "s01", at: 1_795_000_000 } };
    const opened = await openSandbox(await sealSandbox(sb, KEY), KEY);
    expect(opened!.ov.m08).toEqual(sb.ov.m08);
  });
});
