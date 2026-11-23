import "server-only";
import { cookies, headers } from "next/headers";
import { deriveSandboxKey, openSandbox, sealSandbox } from "@/lib/sandbox-codec";
import { freshSandbox, type Sandbox } from "@/lib/sandbox";
import { sessionSecret } from "./secrets";

export const SANDBOX_COOKIE = "tg_sandbox";

let cachedKey: { secret: string; key: Uint8Array } | null = null;
function key(): Uint8Array {
  const secret = sessionSecret();
  if (cachedKey?.secret !== secret) cachedKey = { secret, key: deriveSandboxKey(secret) };
  return cachedKey.key;
}

export async function loadSandbox(): Promise<Sandbox> {
  const token = (await cookies()).get(SANDBOX_COOKIE)?.value;
  if (token) {
    const sandbox = await openSandbox(token, key());
    if (sandbox) return sandbox;
  }
  return freshSandbox();
}

export async function sandboxCookie(sandbox: Sandbox) {
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  return {
    name: SANDBOX_COOKIE,
    value: await sealSandbox(sandbox, key()),
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

/** For server actions. Route handlers set the cookie on their response instead. */
export async function saveSandbox(sandbox: Sandbox): Promise<void> {
  (await cookies()).set(await sandboxCookie(sandbox));
}
