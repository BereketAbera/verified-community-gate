import "server-only";
import type { NextRequest } from "next/server";

/** Rejects cross-site form posts. Requests without an Origin header (curl, tests) pass. */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
