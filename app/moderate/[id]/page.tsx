import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flag } from "lucide-react";
import { AuditActionBadge } from "@/components/audit-action";
import { CountryCheck } from "@/components/country-check";
import { DecisionPanel } from "@/components/forms/decision-panel";
import { NoteForm } from "@/components/forms/note-form";
import { MediaPlaceholder } from "@/components/media-placeholder";
import { Notice } from "@/components/notice";
import { SignedMedia } from "@/components/signed-media";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { LOOKING_FOR_LABELS } from "@/lib/reference";
import { getGate, type Gate } from "@/lib/server/gate";
import { signedLinkFor } from "@/lib/server/media-links";
import type { Account, MediaKind } from "@/lib/types";

export const metadata: Metadata = { title: "Review" };

const DONE: Record<string, { tone: "success" | "warning" | "info"; title: string }> = {
  approve: { tone: "success", title: "Approved. The profile is now visible to approved members." },
  reject: { tone: "warning", title: "Rejected. The member sees the reason and can resubmit." },
  flag: { tone: "info", title: "Flagged for a second look." },
  suspend: { tone: "warning", title: "Suspended. The profile is hidden from everyone and its conversations are gone." },
  ban: { tone: "warning", title: "Banned. The account can no longer see or be seen." },
  reinstate: { tone: "success", title: "Reinstated. The profile is visible to approved members again." },
  note: { tone: "success", title: "Note added." },
};

function ReviewMedia({ gate, member, kind }: { gate: Gate; member: Account; kind: MediaKind }) {
  const slot = gate.policy.mediaSlot(gate.viewer, member, kind);
  const link = slot.state === "available" ? signedLinkFor(gate, slot.asset) : null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{kind === "photo" ? "Profile photo" : "Verification video"}</p>
      {link ? <SignedMedia link={link} alt={`${kind === "photo" ? "Photo" : "Video"} submitted by ${member.displayName}`} autoPlay /> : <MediaPlaceholder kind={kind} reason="none" />}
      {link ? (
        <p className="text-xs text-muted-foreground">Member setting: {link.visibility === "members" ? "approved members" : "private"} (moderators always see it)</p>
      ) : null}
    </div>
  );
}

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string }> }) {
  const { id } = await params;
  const { done } = await searchParams;
  const gate = await getGate();
  const { viewer, policy } = gate;
  const member = policy.getProfileForReview(viewer, id);
  if (!member) notFound();

  const notes = policy.listNotes(viewer, member.id);
  const history = policy.listAudit(viewer, member.id);
  const notice = done ? DONE[done] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/moderate" className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Review queue
      </Link>

      {notice ? <Notice tone={notice.tone} title={notice.title} /> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Profile review · {member.id}</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight" data-testid="review-name">{member.displayName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {member.flag ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
              <Flag className="size-3" aria-hidden /> Flagged
            </span>
          ) : null}
          <StatusBadge status={member.status} className="text-sm" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section className="grid grid-cols-2 gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-testid="side-by-side">
            <ReviewMedia gate={gate} member={member} kind="photo" />
            <ReviewMedia gate={gate} member={member} kind="video" />
          </section>

          <section className="flex flex-col gap-4 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">Location check</h2>
            <CountryCheck stated={member.country} detected={member.detectedCountry} />
          </section>

          <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">Profile and consent</h2>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Age</dt><dd>{member.age ?? "Not stated"}</dd>
              <dt className="text-muted-foreground">City</dt><dd>{member.city}</dd>
              <dt className="text-muted-foreground">Languages</dt><dd>{member.languages.join(", ")}</dd>
              <dt className="text-muted-foreground">Looking for</dt><dd>{member.lookingFor ? LOOKING_FOR_LABELS[member.lookingFor] : "Not stated"}</dd>
              <dt className="text-muted-foreground">About</dt><dd>{member.about || "Empty"}</dd>
              <dt className="text-muted-foreground">Terms</dt><dd>{member.terms ? `Version ${member.terms.version}, accepted ${formatDateTime(member.terms.acceptedAt)}` : "Not recorded"}</dd>
              <dt className="text-muted-foreground">Faith data</dt><dd>{member.faith.consentedAt ? `Consent ${formatDateTime(member.faith.consentedAt)}: ${member.faith.value ?? "no text"}` : "No consent, nothing stored"}</dd>
              <dt className="text-muted-foreground">Signed up</dt><dd>{formatDateTime(member.createdAt)}</dd>
              <dt className="text-muted-foreground">Submitted</dt><dd>{formatDateTime(member.submittedAt)}</dd>
              {member.decision ? (<><dt className="text-muted-foreground">Last decision</dt><dd>{member.decision.status}{member.decision.reason ? `: ${member.decision.reason}` : ""} ({formatDateTime(member.decision.at)})</dd></>) : null}
              {member.flag ? (<><dt className="text-muted-foreground">Flag</dt><dd>{member.flag.reason ?? "No reason given"} ({formatDateTime(member.flag.at)})</dd></>) : null}
            </dl>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">Decision</h2>
            {policy.can(viewer, "review.decide") ? (
              <DecisionPanel targetId={member.id} status={member.status} canRestrict={policy.can(viewer, "account.restrict")} />
            ) : null}
          </section>

          <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10" id="notes">
            <h2 className="font-heading text-lg font-semibold">Notes</h2>
            {notes.length === 0 ? <p className="text-muted-foreground">No notes yet.</p> : null}
            <ul className="flex flex-col gap-3" data-testid="notes">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg bg-muted px-3 py-2">
                  <p>{note.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{note.author} · {formatDateTime(note.at)}</p>
                </li>
              ))}
            </ul>
            {policy.can(viewer, "review.note") ? <NoteForm targetId={member.id} /> : null}
          </section>

          <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">History</h2>
            <ol className="flex flex-col gap-2">
              {history.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <AuditActionBadge action={entry.action} />
                    <span className="text-xs text-muted-foreground">{entry.actor?.name ?? entry.actorId} · {formatDateTime(entry.at)}</span>
                  </span>
                  {entry.reason ? <span className="text-xs">{entry.reason}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
