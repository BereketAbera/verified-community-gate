import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, EyeOff, UsersRound } from "lucide-react";
import { subscribeAction, unblockAction, visibilityAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { MembersOnlyScreen } from "@/components/gate-screens";
import { MediaPlaceholder } from "@/components/media-placeholder";
import { Notice } from "@/components/notice";
import { ReplaceMediaForm } from "@/components/forms/replace-media-form";
import { PendingSubmit, SubmitButton } from "@/components/forms/submit-button";
import { SignedMedia } from "@/components/signed-media";
import { displayStatus, StatusBadge } from "@/components/status-badge";
import { ACCESS_LABELS, hasActiveAccess } from "@/lib/access";
import { formatDate, formatDateTime } from "@/lib/format";
import { param, pick, type RawParams } from "@/lib/params";
import { describe, EXTRA_FIELDS, FAITH_FIELDS } from "@/lib/profile-fields";
import { countryName, LOOKING_FOR_LABELS } from "@/lib/reference";
import { getGate, type Gate } from "@/lib/server/gate";
import { signedLinkFor } from "@/lib/server/media-links";
import { cn } from "@/lib/utils";
import type { Account, MediaKind } from "@/lib/types";

export const metadata: Metadata = { title: "My profile" };

const NOTICES: Record<string, { tone: "success" | "warning" | "info"; title: string; body: string }> = {
  "replaced-video": { tone: "warning", title: "New video sent for review", body: "Your profile is hidden from everyone again until a moderator approves the new video." },
  "replaced-photo": { tone: "warning", title: "New photo sent for review", body: "Your profile is hidden from everyone again until a moderator approves the new photo." },
  "visibility-photo": { tone: "success", title: "Photo visibility updated", body: "The change applies to new links at once, and to links already issued on their next request." },
  "visibility-video": { tone: "success", title: "Video visibility updated", body: "The change applies to new links at once, and to links already issued on their next request." },
  unblocked: { tone: "success", title: "Member unblocked", body: "You can see each other again, as long as both profiles stay approved." },
  subscribed: { tone: "success", title: "Test-mode subscription active", body: "In Phase 1 this opens the processor's hosted checkout; its webhook writes the same record." },
  "storage-full": { tone: "warning", title: "Demo storage is full", body: "Use Reset demo to start again." },
  error: { tone: "warning", title: "That change was not allowed", body: "Nothing was changed." },
};

function headline(viewer: Account) {
  switch (viewer.status) {
    case "approved":
      return "Visible to approved members";
    case "pending":
      return viewer.submittedAt ? "Hidden from everyone while a moderator reviews it" : "Hidden: verification not submitted yet";
    case "rejected":
      return "Hidden: not approved";
    default:
      return "Hidden: account restricted";
  }
}

function MediaManager({ gate, viewer, kind }: { gate: Gate; viewer: Account; kind: MediaKind }) {
  const slot = gate.policy.mediaSlot(viewer, viewer, kind);
  const link = slot.state === "available" ? signedLinkFor(gate, slot.asset) : null;
  const visibility = link?.visibility;
  const restricted = viewer.status === "suspended" || viewer.status === "banned";
  const noun = kind === "photo" ? "photo" : "video";
  const labelId = `${kind}-visibility-label`;

  let media: React.ReactNode;
  if (link) media = <SignedMedia link={link} alt={`Your ${noun}`} autoPlay />;
  else if (restricted) media = <MediaPlaceholder kind={kind} reason="ended" />;
  else if (!viewer.submittedAt)
    media = (
      <MediaPlaceholder
        kind={kind}
        reason="empty"
        action={
          <Button asChild size="sm">
            <Link href="/join/verify">Add photo and video</Link>
          </Button>
        }
      />
    );
  else media = <MediaPlaceholder kind={kind} reason="none" />;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10" data-testid={`my-${kind}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">{kind === "photo" ? "Photo" : "Verification video"}</h2>
        {visibility ? (
          <span className="text-xs text-muted-foreground" data-testid={`${kind}-visibility`}>
            {visibility === "members" ? "Approved members" : "Private"}
          </span>
        ) : null}
      </div>
      {media}
      {link ? (
        <div className="flex flex-col gap-2" role="group" aria-labelledby={labelId}>
          <p id={labelId} className="text-xs font-medium text-muted-foreground">Who can see your {noun}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["members", "private"] as const).map((option) => (
              <form key={option} action={visibilityAction}>
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="visibility" value={option} />
                <PendingSubmit
                  data-testid={`${kind}-visibility-${option}`}
                  aria-pressed={visibility === option}
                  className={cn(
                    "flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs ring-1 ring-inset transition disabled:opacity-60",
                    visibility === option ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-foreground/15 hover:bg-muted",
                  )}
                >
                  {option === "members" ? <UsersRound className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
                  {option === "members" ? "Approved members" : "Private"}
                </PendingSubmit>
              </form>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Private: only you and the moderators. Nobody else gets a link.</p>
        </div>
      ) : null}
      {!restricted && viewer.submittedAt ? <ReplaceMediaForm kind={kind} /> : null}
    </div>
  );
}

function Membership({ gate, viewer }: { gate: Gate; viewer: Account }) {
  const { access } = viewer;
  const active = hasActiveAccess(access, Date.now());
  const founding = gate.policy.foundingPlaces();
  let summary: string;
  if (access.kind === "founding" && access.until === null) summary = "Founding member: your three free months start when a moderator approves you.";
  else if (access.kind === "free") summary = "Free plan: browse, reply and accept requests.";
  else if (!active) summary = `${ACCESS_LABELS[access.kind]} ended ${formatDate(access.until)}. Free plan now: browse, reply and accept requests.`;
  else if (access.kind === "complimentary") summary = `Complimentary until ${formatDate(access.until)}${access.setBy ? `, set by ${gate.policy.staffName(access.setBy) ?? "staff"}` : ""}.`;
  else if (access.kind === "founding") summary = `Founding member: free until ${formatDate(access.until)}.`;
  else summary = `Paid subscription (test mode) until ${formatDate(access.until)}.`;

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10" data-testid="membership">
      <h2 className="font-heading text-lg font-semibold">Membership</h2>
      <p>{summary}</p>
      <p className="text-xs text-muted-foreground">
        {active ? "You can start conversations." : "Starting a conversation needs a membership; replying stays free."} Founding
        promotion: {founding.taken} of {founding.total} places taken.
      </p>
      {!active && viewer.status === "approved" ? (
        <form action={subscribeAction}>
          <SubmitButton size="sm" pendingLabel="Starting test subscription...">
            <CreditCard aria-hidden /> Subscribe in test mode
          </SubmitButton>
        </form>
      ) : null}
    </section>
  );
}

export default async function MePage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const message = pick(NOTICES, param(await searchParams, "notice"));
  const gate = await getGate();
  const { viewer, policy } = gate;
  if (!viewer) return <MembersOnlyScreen />;
  if (viewer.role !== "member") redirect("/moderate");

  const blocked = policy.listBlockedByViewer(viewer);
  const details = describe(EXTRA_FIELDS, viewer.extra);
  const faith = describe(FAITH_FIELDS, viewer.faith.answers);

  return (
    <div className="flex flex-col gap-6">
      {message ? <Notice tone={message.tone} title={message.title}>{message.body}</Notice> : null}

      <section className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="eyebrow">My profile</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{viewer.displayName}</h1>
          <p className="text-sm text-muted-foreground" data-testid="profile-visibility">{headline(viewer)}</p>
          {viewer.decision?.reason && viewer.status !== "approved" ? (
            <p className="text-sm font-medium">Reason: {viewer.decision.reason}</p>
          ) : null}
        </div>
        <StatusBadge status={displayStatus(viewer)} className="self-start text-sm sm:self-center" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <MediaManager gate={gate} viewer={viewer} kind="photo" />
        <MediaManager gate={gate} viewer={viewer} kind="video" />

        <div className="flex flex-col gap-6">
          <Membership gate={gate} viewer={viewer} />
          <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">Details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">Age</dt><dd>{viewer.age ?? "Not stated"}</dd>
              <dt className="text-muted-foreground">Lives in</dt><dd>{viewer.city}, {countryName(viewer.country)}</dd>
              <dt className="text-muted-foreground">Languages</dt><dd>{viewer.languages.join(", ")}</dd>
              <dt className="text-muted-foreground">Looking for</dt><dd>{viewer.lookingFor ? LOOKING_FOR_LABELS[viewer.lookingFor] : "Not stated"}</dd>
              {details.map((d) => (
                <div key={d.label} className="contents">
                  <dt className="text-muted-foreground">{d.label}</dt><dd>{d.value}</dd>
                </div>
              ))}
              <dt className="text-muted-foreground">Faith</dt>
              <dd>{faith.length > 0 ? faith.map((f) => f.value).join(" · ") : viewer.faith.consentedAt ? "Consent given, nothing filled in" : "Not shared"}</dd>
            </dl>
          </section>
          <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">Consent record</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">Terms</dt>
              <dd>
                {viewer.terms ? (
                  <>
                    <Link href="/terms" className="text-primary underline underline-offset-2">Version {viewer.terms.version}</Link>, accepted {formatDateTime(viewer.terms.acceptedAt)}
                  </>
                ) : (
                  "Not recorded"
                )}
              </dd>
              <dt className="text-muted-foreground">Faith data</dt>
              <dd>{viewer.faith.consentedAt ? `Consent given ${formatDateTime(viewer.faith.consentedAt)}` : "No consent, nothing stored"}</dd>
            </dl>
          </section>
          {viewer.status === "approved" ? (
            <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
              <h2 className="font-heading text-lg font-semibold">Blocked members</h2>
              {blocked.length === 0 ? <p className="text-muted-foreground">Nobody.</p> : null}
              <ul className="flex flex-col gap-2">
                {blocked.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-2">
                    <span>{member.displayName}</span>
                    <form action={unblockAction}>
                      <input type="hidden" name="targetId" value={member.id} />
                      <SubmitButton variant="outline" size="xs" pendingLabel="Unblocking...">Unblock</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
