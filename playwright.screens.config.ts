import { defineConfig } from "@playwright/test";

// Screenshots for the proposal. Uses installed Chrome, which plays H.264 video.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "screens.spec.ts",
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:4372", channel: "chrome" },
});
