import "server-only";

// Development falls back to fixed values so `pnpm dev` works out of the box.
// Production refuses to start a request without real secrets.
const DEV_FALLBACK: Record<string, string> = {
  MEDIA_SIGNING_SECRET: "dev-only-media-signing-secret-not-for-production",
  SESSION_SECRET: "dev-only-session-secret-not-for-production-use",
};

function readSecret(name: "MEDIA_SIGNING_SECRET" | "SESSION_SECRET"): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK[name];
  throw new Error(`${name} must be set to at least 32 characters`);
}

export const mediaSigningSecret = () => readSecret("MEDIA_SIGNING_SECRET");
export const sessionSecret = () => readSecret("SESSION_SECRET");
