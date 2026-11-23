import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Flag } from "lucide-react";
import { clearReportsAction } from "@/app/actions";
import { AuditActionBadge } from "@/components/audit-action";
import { CountryCheck } from "@/components/country-check";
import { ComplimentaryForm } from "@/components/forms/complimentary-form";
import { DecisionPanel, type ChecklistData } from "@/components/forms/decision-panel";
import { NoteForm } from "@/components/forms/note-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MediaPlaceholder } from "@/components/media-placeholder";
import { Notice } from "@/components/notice";
import { SignedMedia } from "@/components/signed-media";
import { displayStatus, StatusBadge, STATUS_LABELS } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ACCESS_LABELS, hasActiveAccess } from "@/lib/access";
import { formatDate, formatDateTime } from "@/lib/format";
import { param, pick, type RawParams } from "@/lib/params";
import { REPORTS_TO_HIDE } from "@/lib/policy";
import { describe, EXTRA_FIELDS, FAITH_FIELDS } from "@/lib/profile-fields";
import { countryName, LOOKING_FOR_LABELS, REPORT_REASONS, type ReportReason } from "@/lib/reference";
import { getGate, type Gate } from "@/lib/server/gate";
import { signedLinkFor } from "@/lib/server/media-links";
import type { Account, MediaKind } from "@/lib/types";
import { FIXED_PROMPT_IDS, formatDuration, PROMPT_COUNT, prompt, RECORDING_SECONDS, recordingLengthOk } from "@/lib/verification";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { viewer, policy } = await getGate();
  const member = policy.getProfileForReview(viewer, id);
  return { title: member ? `Review: ${member.displayName}` : "Not found" };
}

const DONE: Record<string, { tone: "success" | "warning" | "info"; title: string }> = {
  approve: { tone: "success", title: "Approved. The profile is now visible to approved members." },
  reject: { tone: "warning", title: "Rejected. The member sees the reason and can resubmit." },
  flag: { tone: "info", title: "Flagged for a second look." },
  suspend: { tone: "warning", title: "Suspended. The profile is hidden from everyone and its conversations are gone." },
  ban: { tone: "warning", title: "Banned. The account can no longer see or be seen." },
  note: { tone: "success", title: "Note added." },
  reports: { tone: "success", title: "Reports marked as reviewed. If they had hidden the profile, it is visible again." },
  access: { tone: "success", title: "Complimentary access saved." },
  "storage-full": { tone: "warning", title: "Demo storage is full. Use Reset demo to start again." },
  error: { tone: "warning", title: "That did not work. Nothing was changed." },
};

function ReviewMedia({ gate, member, kind }: { gate: Gate; member: Account; kind: MediaKind }) {
  const slot = gate.policy.mediaSlot(gate.viewer, member, kind);
  const link = slot.state === "available" ? signedLinkFor(gate, slot.asset) : null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-sm font-medium">{kind === "photo" ? "Profile photo" : "Verification video"}</p>
      {link ? <SignedMedia link={link} alt={`${kind === "photo" ? "Photo" : "Video"} submitted by ${member.displayName}`} autoPlay /> : <MediaPlaceholder kind={kind} reason="none" />}
      {link ? (
        <p className="text-xs text-muted-foreground">Member setting: {link.visibility === "members" ? "approved members" : "private"} (moderators always see it)</p>
      ) : null}
    </div>
  );
}

function checklistFor(member: Account): ChecklistData | null {
  const rec = member.verification;
  if (!rec || !member.photoId || !member.videoId) return null;
  const lengthOk = recordingLengthOk(rec.seconds);
  const length = formatDuration(rec.seconds);
  const problems: string[] = [];
  if (!lengthOk) problems.push(rec.seconds < RECORDING_SECONDS.min ? `the recording is ${length}, under 2:00.` : `the recording is ${length}, over 5:00.`);
  if (new Set(rec.prompts).size < PROMPT_COUNT) problems.push(`the recording answers ${new Set(rec.prompts).size} of ${PROMPT_COUNT} prompts.`);
  return {
    prompts: rec.prompts.map((id) => ({ id, text: prompt(id)?.short ?? id, fixed: FIXED_PROMPT_IDS.includes(id) })),
    languages: member.languages,
    seconds: rec.seconds,
    lengthText: lengthOk
      ? `Recording length ${length}: within 2:00 to 5:00.`
      : `Recording length ${length}: ${rec.seconds < RECORDING_SECONDS.min ? "under the 2:00 minimum" : "over the 5:00 maximum"}.`,
    lengthOk,
    recordingProblems: problems,
    location: !member.detectedCountry
      ? { text: `Stated ${countryName(member.country)}; no detected country to compare.`, differs: false }
      : member.detectedCountry === member.country
        ? { text: `Stated and detected country match: ${countryName(member.country)}.`, differs: false }
        : { text: `Stated ${countryName(member.country)}, detected ${countryName(member.detectedCountry)}: worth a second look, not a reason to reject.`, differs: true },
  };
}

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<RawParams> }) {
  const { id } = await params;
  const done = param(await searchParams, "done");
  const gate = await getGate();
  const { viewer, policy } = gate;
  const member = policy.getProfileForReview(viewer, id);
  if (!member) notFound();

  const notes = policy.listNotes(viewer, member.id);
  const history = policy.listAudit(viewer, member.id);
  const reports = policy.listOpenReports(viewer, member.id);
  const queue = policy.reviewQueue(viewer);
  const next = queue.find((a) => a.id !== member.id);
  const notice = pick(DONE, done);
  const isAdmin = policy.can(viewer, "access.grant");
  const details = describe(EXTRA_FIELDS, member.extra);
  const faith = describe(FAITH_FIELDS, member.faith.answers);
  const decision = member.decision;
  const access = member.access;
  const accessText =
    access.kind === "free"
      ? "Free"
      : access.until === null
        ? `${ACCESS_LABELS[access.kind]}: three free months start at approval`
        : `${ACCESS_LABELS[access.kind]} ${hasActiveAccess(access, Date.now()) ? "until" : "ended"} ${formatDate(access.until)}${access.setBy ? ` (set by ${policy.staffName(access.setBy) ?? access.setBy})` : ""}`;
  const reinstateNotice =
    done === "reinstate"
      ? member.status === "approved"
        ? "Reinstated. The profile is visible to approved members again."
        : "Reinstated to Pending review. It is back in the queue and stays hidden until a moderator approves it."
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/moderate" className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Review queue
      </Link>

      {notice || reinstateNotice ? (
        <Notice tone={notice?.tone ?? "success"} title={notice?.title ?? reinstateNotice ?? ""}>
          {done === "approve" || done === "reject" ? (
            next ? (
              <Button asChild size="xs" variant="outline" className="mt-1 bg-card">
                <Link href={`/moderate/${next.id}`} data-testid="review-next">
                  Review next ({queue.length} left) <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : (
              <span>The queue is empty.</span>
            )
          ) : null}
        </Notice>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">
            Profile review · <span className="normal-case">{member.id}</span>
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight" data-testid="review-name">
            {member.displayName}
            {member.isSelf ? <span className="font-sans text-lg font-normal text-muted-foreground"> (your signup)</span> : null}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reports.length > 0 ? (
            <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-900 ring-1 ring-orange-200">
              {reports.length} open {reports.length === 1 ? "report" : "reports"}
            </span>
          ) : null}
          {member.flag ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
              <Flag className="size-3" aria-hidden /> Flagged
            </span>
          ) : null}
          <StatusBadge status={displayStatus(member)} className="text-sm" />
        </div>
      </div>

      {/* Below lg the two columns dissolve and order puts the decision right after the media. */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <section className="order-1 grid grid-cols-2 gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:gap-4 sm:p-4" data-testid="side-by-side">
            <ReviewMedia gate={gate} member={member} kind="photo" />
            <ReviewMedia gate={gate} member={member} kind="video" />
          </section>

          <section className="order-3 flex flex-col gap-4 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">Location check</h2>
            <CountryCheck stated={member.country} detected={member.detectedCountry} />
          </section>

          <section className="order-4 flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">Profile and consent</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
              <dt className="text-muted-foreground">Age</dt><dd>{member.age ?? "Not stated"}</dd>
              <dt className="text-muted-foreground">City</dt><dd>{member.city}</dd>
              <dt className="text-muted-foreground">Languages</dt><dd>{member.languages.join(", ")}</dd>
              <dt className="text-muted-foreground">Looking for</dt><dd>{member.lookingFor ? LOOKING_FOR_LABELS[member.lookingFor] : "Not stated"}</dd>
              {details.map((d) => (
                <div key={d.label} className="contents">
                  <dt className="text-muted-foreground">{d.label}</dt><dd>{d.value}</dd>
                </div>
              ))}
              <dt className="text-muted-foreground">About</dt><dd>{member.about || "Not provided"}</dd>
              <dt className="text-muted-foreground">Terms</dt><dd>{member.terms ? `Version ${member.terms.version}, accepted ${formatDateTime(member.terms.acceptedAt)}` : "Not recorded"}</dd>
              <dt className="text-muted-foreground">Faith data</dt>
              <dd>
                {member.faith.consentedAt
                  ? `Consent ${formatDateTime(member.faith.consentedAt)}${faith.length > 0 ? `: ${faith.map((f) => f.value).join(" · ")}` : ", nothing filled in"}`
                  : "No consent, nothing stored"}
              </dd>
              <dt className="text-muted-foreground">Membership</dt><dd>{accessText}</dd>
              <dt className="text-muted-foreground">Signed up</dt><dd>{formatDateTime(member.createdAt)}</dd>
              <dt className="text-muted-foreground">Submitted</dt><dd>{member.submittedAt ? formatDateTime(member.submittedAt) : "Not yet"}</dd>
              {decision ? (
                <>
                  <dt className="text-muted-foreground">Last decision</dt>
                  <dd>{STATUS_LABELS[decision.status]}{decision.reason ? `: ${decision.reason}` : ""} ({formatDateTime(decision.at)})</dd>
                </>
              ) : null}
              {member.flag ? (<><dt className="text-muted-foreground">Flag</dt><dd>{member.flag.reason ?? "No reason given"} ({formatDateTime(member.flag.at)})</dd></>) : null}
            </dl>
          </section>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <section className="order-2 flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10" aria-labelledby="decision-title">
            <h2 id="decision-title" className="font-heading text-lg font-semibold">Decision</h2>
            {policy.can(viewer, "review.decide") ? (
              <DecisionPanel
                targetId={member.id}
                name={member.displayName}
                status={member.status}
                canRestrict={policy.can(viewer, "account.restrict")}
                checklist={checklistFor(member)}
                suspendedFrom={member.suspendedFrom}
                banned={
                  member.status === "banned" && decision
                    ? { at: formatDateTime(decision.at), by: policy.staffName(decision.by) ?? decision.by, reason: decision.reason }
                    : null
                }
              />
            ) : null}
          </section>

          {reports.length > 0 ? (
            <section className="order-5 flex scroll-mt-6 flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10" id="reports" data-testid="open-reports">
              <h2 className="font-heading text-lg font-semibold">Open reports ({reports.length})</h2>
              {reports.length >= REPORTS_TO_HIDE ? (
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-orange-900 ring-1 ring-orange-200 ring-inset">
                  Hidden from every member until these reports are reviewed.
                </p>
              ) : (
                <p className="text-muted-foreground">The profile is hidden automatically at {REPORTS_TO_HIDE} open reports.</p>
              )}
              <ul className="flex flex-col gap-2">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-lg bg-muted px-3 py-2">
                    <p>{REPORT_REASONS[r.reason as ReportReason] ?? r.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.reporter} · {formatDateTime(r.at)}</p>
                  </li>
                ))}
              </ul>
              <form action={clearReportsAction}>
                <input type="hidden" name="targetId" value={member.id} />
                <SubmitButton variant="outline" size="sm" pendingLabel="Saving..." data-testid="clear-reports">Mark as reviewed</SubmitButton>
              </form>
              <p className="text-xs text-muted-foreground">If the reports hold up, suspend or ban instead (admins).</p>
            </section>
          ) : null}

          {isAdmin ? (
            <section className="order-6 flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
              <h2 className="font-heading text-lg font-semibold">Membership</h2>
              <p>{accessText}</p>
              {member.status === "approved" || member.status === "pending" ? (
                <ComplimentaryForm targetId={member.id} />
              ) : (
                <p className="text-xs text-muted-foreground">Complimentary access applies to approved or pending profiles.</p>
              )}
            </section>
          ) : null}

          <section className="order-7 flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10" id="notes">
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

          <section className="order-8 flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
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
