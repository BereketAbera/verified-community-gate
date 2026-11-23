import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EyeOff, UsersRound } from "lucide-react";
import { unblockAction, visibilityAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { MembersOnlyScreen } from "@/components/gate-screens";
import { MediaPlaceholder } from "@/components/media-placeholder";
import { Notice } from "@/components/notice";
import { ReplaceMediaForm } from "@/components/forms/replace-media-form";
import { SignedMedia } from "@/components/signed-media";
import { StatusBadge } from "@/components/status-badge";
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
      {link ? <SignedMedia link={link} alt={`Your ${kind}`} /> : <MediaPlaceholder kind={kind} reason={restricted ? "ended" : "none"} />}
      {link ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Who can see it</p>
          <div className="grid grid-cols-2 gap-2">
            {(["members", "private"] as const).map((option) => (
              <form key={option} action={visibilityAction}>
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="visibility" value={option} />
                <button
                  type="submit"
                  data-testid={`${kind}-visibility-${option}`}
                  aria-pressed={visibility === option}
                  className={cn(
                    "flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs ring-1 ring-inset transition",
                    visibility === option ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-foreground/15 hover:bg-muted",
                  )}
                >
                  {option === "members" ? <UsersRound className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
                  {option === "members" ? "Approved members" : "Private"}
                </button>
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

export default async function MePage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const gate = await getGate();
  const { viewer, policy } = gate;
  if (!viewer) return <MembersOnlyScreen />;
  if (viewer.role !== "member") redirect("/moderate");

  const message = notice ? NOTICES[notice] : undefined;
  const blocked = policy.listBlockedByViewer(viewer);

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
        <div className="flex items-center gap-3">
          <StatusBadge status={viewer.status} className="text-sm" />
          {viewer.status === "pending" && !viewer.submittedAt ? (
            <Button asChild size="sm"><Link href="/join/verify">Add photo and video</Link></Button>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <MediaManager gate={gate} viewer={viewer} kind="photo" />
        <MediaManager gate={gate} viewer={viewer} kind="video" />

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">Details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">Age</dt><dd>{viewer.age ?? "Not stated"}</dd>
              <dt className="text-muted-foreground">Lives in</dt><dd>{viewer.city}, {countryName(viewer.country)}</dd>
              <dt className="text-muted-foreground">Languages</dt><dd>{viewer.languages.join(", ")}</dd>
              <dt className="text-muted-foreground">Looking for</dt><dd>{viewer.lookingFor ? LOOKING_FOR_LABELS[viewer.lookingFor] : "Not stated"}</dd>
              <dt className="text-muted-foreground">Faith</dt><dd>{viewer.faith.value ?? "Not shared"}</dd>
            </dl>
          </section>
          <section className="flex flex-col gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
            <h2 className="font-heading text-lg font-semibold">Consent record</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">Terms</dt>
              <dd>{viewer.terms ? `Version ${viewer.terms.version}, accepted ${new Date(viewer.terms.acceptedAt).toUTCString().slice(5, 22)} UTC` : "Not recorded"}</dd>
              <dt className="text-muted-foreground">Faith data</dt>
              <dd>{viewer.faith.consentedAt ? `Consent given ${new Date(viewer.faith.consentedAt).toUTCString().slice(5, 22)} UTC` : "No consent, nothing stored"}</dd>
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
                      <Button type="submit" variant="outline" size="xs">Unblock</Button>
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
