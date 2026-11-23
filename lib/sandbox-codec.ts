// Seals the sandbox into a compact JWE (dir + A256GCM): encrypted and tamper-evident.
// The JSON is deflated first so the cookie stays well under the 4 KB browser limit,
// and the oldest audit entries and notes are dropped if it still does not fit. If the
// state that matters (decisions, reports, blocks) still does not fit, the change is refused
// rather than written to a cookie the browser would silently drop.
import { hkdfSync } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { CompactEncrypt, compactDecrypt } from "jose";
import { SandboxSchema, type Sandbox } from "./sandbox";

export const MAX_COOKIE_CHARS = 3600;

export function deriveSandboxKey(secret: string): Uint8Array {
  return new Uint8Array(hkdfSync("sha256", secret, "trust-gate-demo", "sandbox-cookie-v1", 32));
}

async function encrypt(sb: Sandbox, key: Uint8Array): Promise<string> {
  const plaintext = deflateRawSync(Buffer.from(JSON.stringify(sb), "utf8"));
  return new CompactEncrypt(plaintext).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).encrypt(key);
}

export class SandboxFullError extends Error {
  constructor() {
    super("Demo storage is full. Use Reset demo to start again.");
    this.name = "SandboxFullError";
  }
}

/** Encrypts the sandbox, trimming the oldest log entries and notes until it fits. */
export async function sealSandbox(input: Sandbox, key: Uint8Array): Promise<string> {
  const sb = structuredClone(input);
  let token = await encrypt(sb, key);
  while (token.length > MAX_COOKIE_CHARS) {
    if (sb.log.length > 5) sb.log.pop();
    else if (sb.notes.length > 0) sb.notes.pop();
    else if (sb.log.length > 0) sb.log.pop();
    else throw new SandboxFullError();
    token = await encrypt(sb, key);
  }
  return token;
}

/** Returns null for anything that is not a sandbox this server sealed. */
export async function openSandbox(token: string, key: Uint8Array): Promise<Sandbox | null> {
  try {
    const { plaintext } = await compactDecrypt(token, key, {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });
    const json = JSON.parse(inflateRawSync(Buffer.from(plaintext)).toString("utf8"));
    const parsed = SandboxSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
