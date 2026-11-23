import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Flag, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CountryCheck } from "@/components/country-check";
import { PageTitle } from "@/components/page-title";
import { SignedImage } from "@/components/signed-image";
import { displayStatus, StatusBadge, STATUS_LABELS } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { oneOf, type RawParams } from "@/lib/params";
import { REPORTS_TO_HIDE } from "@/lib/policy";
import { REPORT_REASONS, type ReportReason } from "@/lib/reference";
import { getGate, type Gate } from "@/lib/server/gate";
import { signedLinkFor } from "@/lib/server/media-links";
import { cn } from "@/lib/utils";
import { STATUSES, type Account } from "@/lib/types";

export const metadata: Metadata = { title: "Review queue" };

const VIEWS = ["queue", "reports", "all"] as const;

function Thumb({ gate, member, size = "size-10" }: { gate: Gate; member: Account; size?: string }) {
  const slot = gate.policy.mediaSlot(gate.viewer, member, "photo");
  const photo = slot.state === "available" ? signedLinkFor(gate, slot.asset) : null;
  const empty = <span className={cn(size, "block shrink-0 rounded-md bg-muted")} />;
  if (!photo) return empty;
  return <SignedImage link={photo} alt="" className={cn(size, "max-w-none shrink-0 rounded-md object-cover object-[50%_30%]")} fallback={empty} />;
}

function Flagged({ member }: { member: Account }) {
  return member.flag ? (
    <span className="inline-flex items-center gap-1 text-amber-800"><Flag className="size-3.5" aria-hidden /> Flagged</span>
  ) : (
    <span className="text-muted-foreground">None</span>
  );
}

export default async function ModeratePage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const view = oneOf(await searchParams, "view", VIEWS) ?? "queue";
  const gate = await getGate();
  const { viewer, policy } = gate;
  // Staff-only surface: for everyone else it does not exist.
  if (!policy.can(viewer, "review.read")) notFound();

  const queue = policy.reviewQueue(viewer);
  const all = policy.listProfilesForReview(viewer);
  const reported = policy.reportedProfiles(viewer);
  const rows = view === "all" ? all : queue;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((a) => a.status === s).length]));
  const tabs: Array<{ view: (typeof VIEWS)[number]; href: string; label: string }> = [
    { view: "queue", href: "/moderate", label: `Waiting for review (${queue.length})` },
    { view: "reports", href: "/moderate?view=reports", label: `Reports (${reported.length})` },
    { view: "all", href: "/moderate?view=all", label: `All profiles (${all.length})` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow={viewer?.role === "admin" ? "Admin" : "Moderator"} title="Review queue">
        Every new or changed profile waits here, hidden, until a person compares the video with the photo. Oldest first.
      </PageTitle>

      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10 sm:px-4 sm:py-3">
            <dt className="truncate text-xs text-muted-foreground">{STATUS_LABELS[s]}</dt>
            <dd className="text-xl font-semibold sm:text-2xl">{counts[s]}</dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Queue views" className="flex max-w-full flex-wrap gap-1 self-start rounded-lg bg-muted p-1 text-sm">
        {tabs.map((tab) => (
          <Link
            key={tab.view}
            href={tab.href}
            aria-current={view === tab.view ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5", view === tab.view ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {view === "reports" ? (
        reported.length === 0 ? (
          <p className="rounded-xl bg-card p-8 text-center text-muted-foreground ring-1 ring-foreground/10">No open reports.</p>
        ) : (
          <ul className="flex flex-col gap-3" data-testid="reports">
            {reported.map(({ member, reports, hidden }) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-member-id={member.id}>
                <Thumb gate={gate} member={member} size="size-12" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-medium">{member.displayName}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquareWarning className="size-3.5" aria-hidden />
                    {reports.length} open {reports.length === 1 ? "report" : "reports"} ·{" "}
                    {[...new Set(reports.map((r) => REPORT_REASONS[r.reason as ReportReason] ?? r.reason))].join(", ")}
                  </span>
                  {hidden ? (
                    <span className="self-start rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-900 ring-1 ring-orange-200 ring-inset">
                      Hidden from members: {REPORTS_TO_HIDE} or more open reports
                    </span>
                  ) : null}
                </div>
                <Button asChild size="sm" variant={hidden ? "default" : "outline"}>
                  <Link href={`/moderate/${member.id}#reports`} data-testid={`reports-${member.id}`}>Review reports</Link>
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-8 text-center text-muted-foreground ring-1 ring-foreground/10">
          <p>All caught up: nobody is waiting for review.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/moderate/audit">Open the audit log</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Phones and small tablets: one card per profile. */}
          <ul className="flex flex-col gap-3 md:hidden" data-testid="queue-cards">
            {rows.map((member) => (
              <li key={member.id} className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-member-id={member.id}>
                <div className="flex items-start gap-3">
                  <Thumb gate={gate} member={member} size="size-12" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium">{member.displayName}{member.isSelf ? " (your signup)" : ""}</span>
                    <span className="text-xs text-muted-foreground">{member.id} · {member.city}</span>
                  </div>
                  <StatusBadge status={displayStatus(member)} className="shrink-0" />
                </div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    Stated {member.country} · detected <CountryCheck stated={member.country} detected={member.detectedCountry} compact />
                  </span>
                  {member.flag ? <Flagged member={member} /> : null}
                </p>
                <Button asChild size="sm" variant={member.status === "pending" ? "default" : "outline"} className="w-full">
                  <Link href={`/moderate/${member.id}`} data-testid={`review-card-${member.id}`}>
                    {member.status === "pending" ? "Review" : "Open"} <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 md:block">
            <Table data-testid="queue">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56 pl-4">Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                  <TableHead>Stated</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Flag</TableHead>
                  <TableHead className="pr-4 text-right"><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((member) => (
                  <TableRow key={member.id} data-member-id={member.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Thumb gate={gate} member={member} />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{member.displayName}{member.isSelf ? " (your signup)" : ""}</span>
                          <span className="text-xs text-muted-foreground">{member.id} · {member.city}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={displayStatus(member)} /></TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDateTime(member.submittedAt)}</TableCell>
                    <TableCell>{member.country}</TableCell>
                    <TableCell><CountryCheck stated={member.country} detected={member.detectedCountry} compact /></TableCell>
                    <TableCell><Flagged member={member} /></TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button asChild size="sm" variant={member.status === "pending" ? "default" : "outline"}>
                        <Link href={`/moderate/${member.id}`} data-testid={`review-${member.id}`}>{member.status === "pending" ? "Review" : "Open"}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
