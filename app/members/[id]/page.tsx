import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Ban, CreditCard, Languages, MapPin, MessageCircle, Send } from "lucide-react";
import { blockAction, messageRequestAction, subscribeAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ReportForm } from "@/components/forms/report-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { MediaPlaceholder } from "@/components/media-placeholder";
import { Notice } from "@/components/notice";
import { SecurityDetails, SignedMedia } from "@/components/signed-media";
import { hasActiveAccess } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { param, pick, type RawParams } from "@/lib/params";
import { describe, EXTRA_FIELDS, FAITH_FIELDS } from "@/lib/profile-fields";
import { countryName, LOOKING_FOR_LABELS } from "@/lib/reference";
import { getGate, type Gate } from "@/lib/server/gate";
import { signedLinkFor } from "@/lib/server/media-links";
import type { Account, MediaKind } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { viewer, policy } = await getGate();
  const member = policy.getVisibleMember(viewer, id);
  return { title: member ? member.displayName : "Not found" };
}

const NOTICES: Record<string, { tone: "success" | "warning" | "info"; title: string; body: string }> = {
  subscribe: { tone: "info", title: "A membership is needed to start a conversation", body: "Replying to someone who writes to you stays free." },
  subscribed: { tone: "success", title: "Test-mode subscription active", body: "In Phase 1 this button opens the processor's hosted checkout; its webhook writes the same record. You can start conversations now." },
  reported: { tone: "success", title: "Report sent", body: "Moderators review every report. The profile stays visible until three reports are open." },
  unblocked: { tone: "success", title: "Member unblocked", body: "You can see each other again, as long as both profiles stay approved." },
  "storage-full": { tone: "warning", title: "Demo storage is full", body: "Use Reset demo to start again." },
  error: { tone: "warning", title: "That did not work", body: "Nothing was changed." },
};

function MediaFor({ gate, member, kind }: { gate: Gate; member: Account; kind: MediaKind }) {
  const slot = gate.policy.mediaSlot(gate.viewer, member, kind);
  const link = slot.state === "available" ? signedLinkFor(gate, slot.asset) : null;
  if (link) return <SignedMedia link={link} alt={`${kind === "photo" ? "Photo" : "Verification video"} of ${member.displayName}`} controls="toggle" />;
  return <MediaPlaceholder kind={kind} reason={slot.state === "private" ? "private" : "none"} />;
}

export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<RawParams> }) {
  const { id } = await params;
  const notice = pick(NOTICES, param(await searchParams, "notice"));
  const gate = await getGate();
  const { viewer, policy } = gate;
  if (viewer && viewer.id === id) redirect("/me");

  // Hidden by default: anyone this viewer may not see is indistinguishable from an id that never existed.
  const member = policy.getVisibleMember(viewer, id);
  if (!member) notFound();

  const canMessage = policy.canMessage(viewer, member);
  const canStart = policy.canStartConversation(viewer, member);
  const conversation = viewer ? policy.conversationWith(viewer, member) : null;
  const details = describe(EXTRA_FIELDS, member.extra);
  const faith = describe(FAITH_FIELDS, member.faith.answers);
  const paidUp = viewer ? hasActiveAccess(viewer.access, Date.now()) : false;

  return (
    <div className="flex flex-col gap-6">
      {notice ? <Notice tone={notice.tone} title={notice.title}>{notice.body}</Notice> : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <SecurityDetails>
            <div className="grid grid-cols-2 gap-4">
              <MediaFor gate={gate} member={member} kind="photo" />
              <MediaFor gate={gate} member={member} kind="video" />
            </div>
          </SecurityDetails>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Verified member</p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="member-name">
              {member.displayName}
              {member.age ? <span className="font-sans text-xl font-normal text-muted-foreground">, {member.age}</span> : null}
            </h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{member.city}, {countryName(member.country)}</span>
              <span className="flex items-center gap-1"><Languages className="size-4" aria-hidden />{member.languages.join(", ")}</span>
            </p>
          </div>

          <p className="text-base leading-relaxed">{member.about || "No introduction yet."}</p>

          <dl className="grid gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Looking for</dt>
              <dd className="font-medium">{member.lookingFor ? LOOKING_FOR_LABELS[member.lookingFor] : "Not stated"}</dd>
            </div>
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-muted-foreground">{d.label}</dt>
                <dd className="font-medium">{d.value}</dd>
              </div>
            ))}
            {faith.length > 0 ? (
              faith.map((f) => (
                <div key={f.label}>
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="font-medium">{f.value}</dd>
                </div>
              ))
            ) : (
              <div>
                <dt className="text-muted-foreground">Faith and values</dt>
                <dd className="font-medium">Not shared</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Verified by a moderator</dt>
              <dd className="font-medium">{member.approvedAt ? formatDate(member.approvedAt) : "Not verified"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="font-medium">{new Date(member.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</dd>
            </div>
          </dl>

          {canMessage && !conversation && !canStart ? (
            <div className="flex flex-col gap-3 rounded-xl bg-secondary/70 p-4 text-sm text-secondary-foreground ring-1 ring-primary/10" data-testid="subscribe-card">
              <p className="font-medium">Starting a conversation needs a membership.</p>
              <p className="opacity-90">
                Creating a profile, browsing and replying to messages are free. One price for everyone.
                {!paidUp && viewer?.access.kind === "founding" && viewer.access.until ? ` Your founding months ended ${formatDate(viewer.access.until)}.` : ""}
              </p>
              <form action={subscribeAction}>
                <input type="hidden" name="targetId" value={member.id} />
                <SubmitButton pendingLabel="Starting test subscription..." data-testid="subscribe">
                  <CreditCard aria-hidden /> Subscribe in test mode
                </SubmitButton>
              </form>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {canMessage && conversation ? (
              <Button asChild>
                <Link href={`/messages/${conversation.id}`}><MessageCircle aria-hidden /> Open conversation</Link>
              </Button>
            ) : null}
            {canStart && !conversation ? (
              <form action={messageRequestAction}>
                <input type="hidden" name="targetId" value={member.id} />
                <SubmitButton pendingLabel="Sending..." data-testid="request-message"><Send aria-hidden /> Request to message</SubmitButton>
              </form>
            ) : null}
            {viewer?.role === "member" ? (
              <form action={blockAction}>
                <input type="hidden" name="targetId" value={member.id} />
                <SubmitButton variant="outline" pendingLabel="Blocking..." data-testid="block-member"><Ban aria-hidden /> Block</SubmitButton>
              </form>
            ) : null}
            {viewer?.role === "member" ? <ReportForm targetId={member.id} name={member.displayName.split(" ")[0]} alreadyReported={policy.hasReported(viewer, member.id)} /> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Blocking hides you from each other everywhere. Photos and videos open only through short-lived links issued to you.
          </p>
        </div>
      </div>
    </div>
  );
}
