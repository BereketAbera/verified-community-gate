import { defineConfig, devices } from "@playwright/test";

// Local runs start the production build on port 3302; set BASE_URL to test a deployment.
const baseURL = process.env.BASE_URL ?? "http://localhost:3302";
const local = !process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "gate.spec.ts",
  fullyParallel: true,
  workers: 3,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // E2E_RECORD=1 also writes a JSON report; scripts/summarize-e2e.mjs turns it into reports/e2e-latest.json.
  reporter: process.env.E2E_RECORD ? [["list"], ["json", { outputFile: "test-results/e2e-report.json" }]] : "list",
  metadata: { baseURL },
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: local
    ? { command: "pnpm exec next start --port 3302", url: baseURL, reuseExistingServer: false, timeout: 120_000 }
    : undefined,
});
