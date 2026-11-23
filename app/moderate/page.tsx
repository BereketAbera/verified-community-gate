import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CountryCheck } from "@/components/country-check";
import { PageTitle } from "@/components/page-title";
import { StatusBadge, STATUS_LABELS } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { getGate } from "@/lib/server/gate";
import { signedLinkFor } from "@/lib/server/media-links";
import { cn } from "@/lib/utils";
import { STATUSES } from "@/lib/types";

export const metadata: Metadata = { title: "Review queue" };

export default async function ModeratePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const gate = await getGate();
  const { viewer, policy } = gate;
  // Staff-only surface: for everyone else it does not exist.
  if (!policy.can(viewer, "review.read")) notFound();

  const queue = policy.reviewQueue(viewer);
  const all = policy.listProfilesForReview(viewer);
  const showAll = view === "all";
  const rows = showAll ? all : queue;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((a) => a.status === s).length]));

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow={viewer?.role === "admin" ? "Admin" : "Moderator"} title="Review queue">
        Every new or changed profile waits here, hidden, until a person compares the video with the photo. Oldest first.
      </PageTitle>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <dt className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</dt>
            <dd className="text-2xl font-semibold">{counts[s]}</dd>
          </div>
        ))}
      </dl>

      <div className="flex gap-1 self-start rounded-lg bg-muted p-1 text-sm">
        <Link href="/moderate" className={cn("rounded-md px-3 py-1.5", !showAll ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>
          Waiting for review ({queue.length})
        </Link>
        <Link href="/moderate?view=all" className={cn("rounded-md px-3 py-1.5", showAll ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>
          All profiles ({all.length})
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-muted-foreground ring-1 ring-foreground/10">The queue is empty.</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table data-testid="queue">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Submitted</TableHead>
                <TableHead>Stated</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead className="hidden sm:table-cell">Flag</TableHead>
                <TableHead className="pr-4 text-right"><span className="sr-only">Open</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((member) => {
                const slot = policy.mediaSlot(viewer, member, "photo");
                const photo = slot.state === "available" ? signedLinkFor(gate, slot.asset) : null;
                return (
                  <TableRow key={member.id} data-member-id={member.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="size-10 rounded-md object-cover object-[50%_35%]" />
                        ) : (
                          <span className="size-10 rounded-md bg-muted" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{member.displayName}{member.isSelf ? " (your signup)" : ""}</span>
                          <span className="text-xs text-muted-foreground">{member.id} · {member.city}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={member.status} /></TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(member.submittedAt)}</TableCell>
                    <TableCell>{member.country}</TableCell>
                    <TableCell><CountryCheck stated={member.country} detected={member.detectedCountry} compact /></TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {member.flag ? <span className="inline-flex items-center gap-1 text-amber-700"><Flag className="size-3.5" aria-hidden /> Flagged</span> : <span className="text-muted-foreground">None</span>}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button asChild size="sm" variant={member.status === "pending" ? "default" : "outline"}>
                        <Link href={`/moderate/${member.id}`} data-testid={`review-${member.id}`}>{member.status === "pending" ? "Review" : "Open"}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
