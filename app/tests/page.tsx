import type { Metadata } from "next";
import { CircleCheck, CircleX, Minus } from "lucide-react";
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
  "sandbox.test.ts": "Cookie sandbox",
  "catalog.test.ts": "Test catalog",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "passed") return <CircleCheck className="size-4 shrink-0 text-emerald-700" aria-label="passed" />;
  if (status === "failed") return <CircleX className="size-4 shrink-0 text-destructive" aria-label="failed" />;
  return <Minus className="size-4 shrink-0 text-muted-foreground" aria-label={status} />;
}

function Matrix({ tests }: { tests: UnitTest[] }) {
  const cells = new Map<string, { outcome: string; status: string }>();
  const blocked = new Map<string, { hidden: number; total: number; status: string }>();
  for (const t of tests.filter((t) => t.group === MATRIX_GROUP)) {
    const m = MATRIX_RE.exec(t.title);
    if (!m) continue;
    const [, viewer, target, block, outcome] = m;
    if (block === "no block") cells.set(`${viewer}|${target}`, { outcome, status: t.status });
    else {
      const b = blocked.get(viewer) ?? { hidden: 0, total: 0, status: "passed" };
      b.total += 1;
      if (outcome === "not listed") b.hidden += 1;
      if (t.status !== "passed") b.status = t.status;
      blocked.set(viewer, b);
    }
  }
  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full min-w-[44rem] text-sm" data-testid="visibility-matrix">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-4 py-2 font-medium">Viewer \ profile status</th>
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
                <th scope="row" className="px-4 py-2 text-left font-medium">{viewer[0].toUpperCase() + viewer.slice(1)}</th>
                {TARGETS.map((target) => {
                  const cell = cells.get(`${viewer}|${target}`);
                  const listed = cell?.outcome === "listed";
                  return (
                    <td key={target} className="px-3 py-2">
                      {cell ? (
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", listed ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-muted text-muted-foreground ring-foreground/10")}>
                          <StatusIcon status={cell.status} />
                          {listed ? "Listed" : "Hidden"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">n/a</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {b ? (
                    <span className="inline-flex items-center gap-1.5"><StatusIcon status={b.status} />{b.hidden}/{b.total} hidden</span>
                  ) : (
                    "n/a"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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
        search, member pages, messaging and media. The list below is generated from the test run of this build.
      </PageTitle>

      {unit ? (
        <dl className="grid gap-3 sm:grid-cols-3" data-testid="unit-summary">
          <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <dt className="text-xs text-muted-foreground">Unit tests passed (Vitest)</dt>
            <dd className="text-2xl font-semibold">{unit.passed} <span className="text-base font-normal text-muted-foreground">of {unit.total}</span></dd>
          </div>
          <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <dt className="text-xs text-muted-foreground">Ran during this deployment&apos;s build</dt>
            <dd className="text-lg font-semibold">{formatDateTime(unit.startedAt)}</dd>
          </div>
          <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <dt className="text-xs text-muted-foreground">End-to-end tests (Playwright)</dt>
            <dd className="text-lg font-semibold">
              {e2e ? `${e2e.passed} of ${e2e.passed + e2e.failed} passed` : `${E2E_TESTS.length} tests`}
            </dd>
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
          <p className="text-muted-foreground">Who appears in search, by viewer and profile status. Each cell is one passing test; member pages, messaging and media have matrices of their own below.</p>
          <Matrix tests={unit.tests} />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-semibold">End-to-end (Playwright)</h2>
        <p className="text-muted-foreground">
          A real browser against the running app: <code className="font-mono text-sm">pnpm test:e2e</code>, or against a deployment with <code className="font-mono text-sm">BASE_URL=https://... pnpm test:e2e</code>.
          {e2e ? ` Last recorded run: ${formatDateTime(e2e.startedAt)} against ${e2e.baseURL}.` : null}
        </p>
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10" data-testid="e2e-list">
          {E2E_TESTS.map((t) => (
            <li key={t.title} className="flex gap-3 px-4 py-3 text-sm">
              <StatusIcon status={e2e?.results[t.title] ?? "listed"} />
              <div>
                <p className="font-medium">{t.title}</p>
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
              return (
                <details key={key} className="group rounded-xl bg-card ring-1 ring-foreground/10">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <span className="flex flex-col">
                      <span className="font-medium">{group}</span>
                      <span className="text-xs text-muted-foreground">{FILE_LABELS[file] ?? file}</span>
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
