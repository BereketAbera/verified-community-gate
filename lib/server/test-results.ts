import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface UnitTest {
  file: string;
  group: string;
  title: string;
  status: string;
}

export interface UnitRun {
  total: number;
  passed: number;
  failed: number;
  startedAt: string;
  tests: UnitTest[];
}

interface VitestJson {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  startTime: number;
  testResults: Array<{ name: string; assertionResults: Array<{ ancestorTitles: string[]; title: string; status: string }> }>;
}

/** Results written by `pnpm test:report`, which the build runs before `next build`. */
export async function readUnitRun(): Promise<UnitRun | null> {
  try {
    const raw = JSON.parse(await readFile(path.join(process.cwd(), "generated", "unit-results.json"), "utf8")) as VitestJson;
    return {
      total: raw.numTotalTests,
      passed: raw.numPassedTests,
      failed: raw.numFailedTests,
      startedAt: new Date(raw.startTime).toISOString(),
      tests: raw.testResults.flatMap((file) =>
        file.assertionResults.map((a) => ({
          file: path.basename(file.name),
          group: a.ancestorTitles.join(" > ") || path.basename(file.name),
          title: a.title,
          status: a.status,
        })),
      ),
    };
  } catch {
    return null;
  }
}

export interface E2eRun {
  baseURL: string;
  startedAt: string;
  passed: number;
  failed: number;
  results: Record<string, string>;
}

interface PlaywrightJson {
  config: { metadata?: { baseURL?: string } };
  stats: { startTime: string; expected: number; unexpected: number; flaky: number };
  suites: Array<{ specs?: Array<{ title: string; ok: boolean }>; suites?: PlaywrightJson["suites"] }>;
}

/** The last recorded end-to-end run (reports/e2e-latest.json), if one was committed. */
export async function readE2eRun(): Promise<E2eRun | null> {
  try {
    const raw = JSON.parse(await readFile(path.join(process.cwd(), "reports", "e2e-latest.json"), "utf8")) as PlaywrightJson;
    const results: Record<string, string> = {};
    const walk = (suites: PlaywrightJson["suites"]) => {
      for (const suite of suites) {
        for (const spec of suite.specs ?? []) results[spec.title] = spec.ok ? "passed" : "failed";
        if (suite.suites) walk(suite.suites);
      }
    };
    walk(raw.suites);
    return {
      baseURL: raw.config.metadata?.baseURL ?? "unknown",
      startedAt: raw.stats.startTime,
      passed: raw.stats.expected + raw.stats.flaky,
      failed: raw.stats.unexpected,
      results,
    };
  } catch {
    return null;
  }
}
