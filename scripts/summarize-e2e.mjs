// Reduces a Playwright JSON report to the small summary the /tests page shows.
// Usage: E2E_RECORD=1 BASE_URL=https://... pnpm test:e2e && node scripts/summarize-e2e.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const report = JSON.parse(readFileSync(path.join(root, "test-results", "e2e-report.json"), "utf8"));
const results = {};
const walk = (suites) => {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) results[spec.title] = spec.ok ? "passed" : "failed";
    walk(suite.suites);
  }
};
walk(report.suites);
const summary = {
  baseURL: report.config?.metadata?.baseURL ?? "unknown",
  startedAt: report.stats.startTime,
  passed: report.stats.expected + report.stats.flaky,
  failed: report.stats.unexpected,
  results,
};
mkdirSync(path.join(root, "reports"), { recursive: true });
writeFileSync(path.join(root, "reports", "e2e-latest.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(summary);
