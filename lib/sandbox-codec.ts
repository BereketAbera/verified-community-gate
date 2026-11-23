// Seals the sandbox into a compact JWE (dir + A256GCM): encrypted and tamper-evident.
// The JSON is deflated first so the cookie stays well under the 4 KB browser limit,
// and the oldest audit entries and notes are dropped if it still does not fit.
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

/** Encrypts the sandbox, trimming the oldest log entries, notes and requests until it fits. */
export async function sealSandbox(input: Sandbox, key: Uint8Array): Promise<string> {
  const sb = structuredClone(input);
  let token = await encrypt(sb, key);
  while (token.length > MAX_COOKIE_CHARS) {
    if (sb.log.length > 5) sb.log.pop();
    else if (sb.notes.length > 0) sb.notes.pop();
    else if (sb.msg.length > 0) sb.msg.shift();
    else if (sb.log.length > 0) sb.log.pop();
    else break;
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
