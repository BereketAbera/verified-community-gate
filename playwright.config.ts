import { defineConfig, devices } from "@playwright/test";

// Local runs start the production build on a spare port; set BASE_URL to test a deployment.
const baseURL = process.env.BASE_URL ?? "http://localhost:4372";
const local = !process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "gate.spec.ts",
  fullyParallel: true,
  workers: 3,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.E2E_RECORD ? [["list"], ["json", { outputFile: "reports/e2e-latest.json" }]] : "list",
  metadata: { baseURL },
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: local
    ? { command: "pnpm exec next start --port 4372", url: baseURL, reuseExistingServer: false, timeout: 120_000 }
    : undefined,
});
