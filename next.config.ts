import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Private media is not in public/, so it must be bundled with the one route allowed to read it.
  // Keys are globs matched against route paths, hence the escaped brackets.
  outputFileTracingIncludes: {
    "/api/media/\\[assetId\\]": ["./private-media/**/*"],
    "/how-it-works": ["./lib/policy.ts", "./lib/media-signing.ts", "./app/api/media/*/route.ts"],
    "/tests": ["./generated/**/*", "./reports/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
