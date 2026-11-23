import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Ban, Languages, MapPin, MessageCircle, Send } from "lucide-react";
import { blockAction, messageRequestAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { MediaPlaceholder } from "@/components/media-placeholder";
import { SignedMedia } from "@/components/signed-media";
import { countryName, LOOKING_FOR_LABELS } from "@/lib/reference";
import { getGate, type Gate } from "@/lib/server/gate";
import { signedLinkFor } from "@/lib/server/media-links";
import type { Account, MediaKind } from "@/lib/types";

export const metadata: Metadata = { title: "Member" };

function MediaFor({ gate, member, kind }: { gate: Gate; member: Account; kind: MediaKind }) {
  const slot = gate.policy.mediaSlot(gate.viewer, member, kind);
  const link = slot.state === "available" ? signedLinkFor(gate, slot.asset) : null;
  if (link) return <SignedMedia link={link} alt={`${kind === "photo" ? "Photo" : "Video"} of ${member.displayName}`} autoPlay />;
  return <MediaPlaceholder kind={kind} reason={slot.state === "private" ? "private" : "none"} />;
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await getGate();
  const { viewer, policy } = gate;
  if (viewer && viewer.id === id) redirect("/me");

  // Hidden by default: anyone this viewer may not see is indistinguishable from an id that never existed.
  const member = policy.getVisibleMember(viewer, id);
  if (!member) notFound();

  const canMessage = policy.canMessage(viewer, member);
  const talking = viewer ? policy.hasConversation(viewer, member) : false;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="grid grid-cols-2 gap-4">
        <MediaFor gate={gate} member={member} kind="photo" />
        <MediaFor gate={gate} member={member} kind="video" />
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

        <p className="text-base leading-relaxed">{member.about}</p>

        <dl className="grid gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Looking for</dt>
            <dd className="font-medium">{member.lookingFor ? LOOKING_FOR_LABELS[member.lookingFor] : "Not stated"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Faith and values</dt>
            <dd className="font-medium">{member.faith.value ?? "Not shared"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Verified</dt>
            <dd className="font-medium">Video checked by a moderator</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="font-medium">{new Date(member.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          {canMessage && talking ? (
            <Button asChild>
              <Link href="/messages"><MessageCircle aria-hidden /> Open messages</Link>
            </Button>
          ) : null}
          {canMessage && !talking ? (
            <form action={messageRequestAction}>
              <input type="hidden" name="targetId" value={member.id} />
              <Button type="submit" data-testid="request-message"><Send aria-hidden /> Request to message</Button>
            </form>
          ) : null}
          {viewer?.role === "member" ? (
            <form action={blockAction}>
              <input type="hidden" name="targetId" value={member.id} />
              <Button type="submit" variant="outline" data-testid="block-member"><Ban aria-hidden /> Block</Button>
            </form>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Media links on this page last 60 seconds and work only for you, in this browser. Blocking hides you from each other everywhere.
        </p>
      </div>
    </div>
  );
}
