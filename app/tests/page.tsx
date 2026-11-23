import type { Metadata } from "next";
import { ChevronRight, CircleCheck, CircleX, Minus } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { E2E_TESTS } from "@/lib/e2e-catalog";
import { formatDateTime } from "@/lib/format";
import { readE2eRun, readUnitRun, type UnitTest } from "@/lib/server/test-results";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tests" };

const VIEWERS = ["signed-out visitor", "approved member", "pending member", "rejected member", "suspended member", "banned member", "moderator", "admin"];
const TARGETS = ["approved", "pending", "rejected", "suspended", "banned"];
const MATRIX_GROUP = "Search listing: only approved, unblocked members are listed";
const MATRIX_RE = /^(.+) -> (\w+) profile, (.+): (listed|not listed)$/;

const FILE_LABELS: Record<string, string> = {
  "policy.matrix.test.ts": "Policy matrix",
  "media-signing.test.ts": "Signed media links",
  "workflows.test.ts": "Workflows on the seed data",
  "verification.test.ts": "Verification checklist",
  "billing.test.ts": "Billing and access",
  "sandbox.test.ts": "Cookie sandbox",
  "catalog.test.ts": "Test catalog",
};

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function StatusIcon({ status }: { status: string }) {
  if (status === "passed") return <CircleCheck className="size-4 shrink-0 text-emerald-700" aria-label="passed" />;
  if (status === "failed") return <CircleX className="size-4 shrink-0 text-destructive" aria-label="failed" />;
  return <Minus className="size-4 shrink-0 text-muted-foreground" aria-label={status} />;
}

function Pill({ listed }: { listed: boolean }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", listed ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-muted text-muted-foreground ring-foreground/10")}>
      {listed ? "Listed" : "Hidden"}
    </span>
  );
}

function Matrix({ tests }: { tests: UnitTest[] }) {
  const cells = new Map<string, { outcome: string; status: string }>();
  const blocked = new Map<string, { hidden: number; total: number }>();
  let total = 0;
  let passed = 0;
  for (const t of tests.filter((t) => t.group === MATRIX_GROUP)) {
    const m = MATRIX_RE.exec(t.title);
    if (!m) continue;
    total += 1;
    if (t.status === "passed") passed += 1;
    const [, viewer, target, block, outcome] = m;
    if (block === "no block") cells.set(`${viewer}|${target}`, { outcome, status: t.status });
    else {
      const b = blocked.get(viewer) ?? { hidden: 0, total: 0 };
      b.total += 1;
      if (outcome === "not listed") b.hidden += 1;
      blocked.set(viewer, b);
    }
  }
  const allPassed = total > 0 && passed === total;

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm" data-testid="matrix-caption">
        {allPassed ? <CircleCheck className="size-4 text-emerald-700" aria-hidden /> : <CircleX className="size-4 text-destructive" aria-hidden />}
        <span>
          {passed} of {total} cases passed in this build. Each cell shows what the test expects: <Pill listed /> or <Pill listed={false} />.
        </span>
      </p>

      {/* Phones: one compact card per viewer. */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {VIEWERS.map((viewer) => {
          const b = blocked.get(viewer);
          return (
            <li key={viewer} className="rounded-xl bg-card p-3 text-sm ring-1 ring-foreground/10">
              <p className="mb-2 font-medium">{sentence(viewer)}</p>
              <ul className="flex flex-wrap gap-1.5" aria-label={`What ${viewer}s see`}>
                {TARGETS.map((target) => {
                  const cell = cells.get(`${viewer}|${target}`);
                  const listed = cell?.outcome === "listed";
                  return (
                    <li
                      key={target}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs ring-1 ring-inset",
                        listed ? "bg-emerald-50 font-medium text-emerald-800 ring-emerald-200" : "bg-muted text-muted-foreground ring-foreground/10",
                      )}
                    >
                      <span className="capitalize">{target}</span>: {cell ? (listed ? "listed" : "hidden") : "n/a"}
                    </li>
                  );
                })}
              </ul>
              {b ? <p className="mt-2 text-xs text-muted-foreground">Blocked either way: {b.hidden}/{b.total} hidden</p> : null}
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10 sm:block" role="region" aria-label="Visibility matrix" tabIndex={0}>
        <table className="w-full min-w-[40rem] text-sm" data-testid="visibility-matrix">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">Viewer</th>
              {TARGETS.map((t) => (
                <th key={t} className="px-3 py-2 font-medium capitalize">{t}</th>
              ))}
              <th className="px-3 py-2 font-medium">Blocked either way</th>
            </tr>
          </thead>
          <tbody>
            {VIEWERS.map((viewer) => {
              const b = blocked.get(viewer);
              return (
                <tr key={viewer} className="border-b last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-medium">{sentence(viewer)}</th>
                  {TARGETS.map((target) => {
                    const cell = cells.get(`${viewer}|${target}`);
                    return (
                      <td key={target} className="px-3 py-2">
                        {cell ? <Pill listed={cell.outcome === "listed"} /> : <span className="text-muted-foreground">n/a</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-xs text-muted-foreground">{b ? `${b.hidden}/${b.total} hidden` : "n/a"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default async function TestsPage() {
  const [unit, e2e] = await Promise.all([readUnitRun(), readE2eRun()]);
  const groups = new Map<string, UnitTest[]>();
  for (const t of unit?.tests ?? []) {
    const key = `${t.file}::${t.group}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  return (
    <div className="flex flex-col gap-10">
      <PageTitle eyebrow="Automated tests" title="The rules, proved by tests">
        The hidden-by-default rules are table-driven: every viewer role against every profile status and block direction, for
        search, member pages, messaging and media. The list below comes from this build&apos;s test run.
      </PageTitle>

      {unit ? (
        <dl className="grid gap-3 sm:grid-cols-2" data-testid="unit-summary">
          <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <dt className="text-xs text-muted-foreground">Unit tests (Vitest), run during this deployment&apos;s build</dt>
            <dd className="text-2xl font-semibold">
              {unit.passed} <span className="text-base font-normal text-muted-foreground">of {unit.total} passed</span>
            </dd>
            <dd className="text-xs text-muted-foreground">{formatDateTime(unit.startedAt)}</dd>
          </div>
          <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10" data-testid="e2e-summary">
            <dt className="text-xs text-muted-foreground">End-to-end tests (Playwright), last recorded run</dt>
            <dd className="text-2xl font-semibold">
              {e2e ? (
                <>
                  {e2e.passed} <span className="text-base font-normal text-muted-foreground">of {e2e.passed + e2e.failed} passed</span>
                </>
              ) : (
                <span className="text-base font-normal text-muted-foreground">{E2E_TESTS.length} tests, no run recorded</span>
              )}
            </dd>
            {e2e ? (
              <dd className="text-xs text-muted-foreground">
                Recorded {formatDateTime(e2e.startedAt)} against {hostOf(e2e.baseURL)}
              </dd>
            ) : null}
          </div>
        </dl>
      ) : (
        <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No results yet. Run <code className="font-mono">pnpm test:report</code> (the build does this automatically).
        </p>
      )}

      {unit ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-2xl font-semibold">Visibility matrix</h2>
          <p className="text-muted-foreground">
            Who appears in search, by viewer and profile status. Member pages, messaging and media are checked across the same
            grid; every case is listed further down.
          </p>
          <Matrix tests={unit.tests} />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-semibold">End-to-end (Playwright)</h2>
        <p className="text-muted-foreground">
          A real browser against the running app: <code className="font-mono text-sm">pnpm test:e2e</code>, or against a deployment with{" "}
          <code className="font-mono text-sm">BASE_URL=https://... pnpm test:e2e</code>.
        </p>
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10" data-testid="e2e-list">
          {E2E_TESTS.map((t) => (
            <li key={t.title} className="flex gap-3 px-4 py-3 text-sm">
              <StatusIcon status={e2e?.results[t.title] ?? "listed"} />
              <div>
                <p className="font-medium">{sentence(t.title)}</p>
                <p className="text-muted-foreground">{t.rule}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {unit ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-2xl font-semibold">Every unit test</h2>
          <p className="text-muted-foreground">Grouped by the rule each block proves. Open a group to see every case.</p>
          <div className="flex flex-col gap-2" data-testid="unit-groups">
            {[...groups.entries()].map(([key, tests]) => {
              const [file, group] = key.split("::");
              const passed = tests.filter((t) => t.status === "passed").length;
              const fileLabel = FILE_LABELS[file] ?? file;
              return (
                <details key={key} className="group rounded-xl bg-card ring-1 ring-foreground/10">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start gap-2">
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
                      <span className="flex flex-col">
                        <span className="font-medium">{group}</span>
                        {fileLabel !== group ? <span className="text-xs text-muted-foreground">{fileLabel}</span> : null}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                      <StatusIcon status={passed === tests.length ? "passed" : "failed"} />
                      {passed}/{tests.length}
                    </span>
                  </summary>
                  <ul className="flex flex-col gap-1.5 border-t px-4 py-3 text-sm">
                    {tests.map((t) => (
                      <li key={t.title} className="flex items-start gap-2">
                        <StatusIcon status={t.status} />
                        <span>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
