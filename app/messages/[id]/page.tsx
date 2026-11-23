import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { answerRequestAction } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Notice } from "@/components/notice";
import { formatDateTime } from "@/lib/format";
import { param, type RawParams } from "@/lib/params";
import { getGate } from "@/lib/server/gate";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { viewer, policy } = await getGate();
  const entry = policy.getConversation(viewer, id);
  return { title: entry ? `Conversation with ${entry.other.displayName}` : "Not found" };
}

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<RawParams> }) {
  const { id } = await params;
  const accepted = param(await searchParams, "notice") === "accepted";
  const { viewer, policy } = await getGate();
  // Same rule as the list: a conversation with someone you may not see does not exist.
  const entry = policy.getConversation(viewer, id);
  if (!viewer || !entry) notFound();
  const { conversation, other, incoming } = entry;
  const first = other.displayName.split(" ")[0];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/messages" className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Conversations
      </Link>
      {accepted ? <Notice tone="success" title="Request accepted">Replying is free for every member. You can talk now.</Notice> : null}
      <div className="flex flex-col gap-1">
        <p className="eyebrow">{conversation.state === "requested" ? "Message request" : "Conversation"}</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          <Link href={`/members/${other.id}`} className="underline-offset-4 hover:underline">{other.displayName}</Link>
        </h1>
      </div>

      <ol className="flex flex-col gap-3" data-testid="thread">
        {conversation.messages.map((message, i) => {
          const mine = message.from === viewer.id;
          return (
            <li key={i} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
              <p className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-foreground/10")}>
                {message.text}
              </p>
              <span className="text-xs text-muted-foreground">{mine ? "You" : first} · {formatDateTime(message.at)}</span>
            </li>
          );
        })}
        {conversation.messages.length === 0 ? (
          <li className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
            You asked to start a conversation on {formatDateTime(conversation.at)}. {first} has not answered yet.
          </li>
        ) : null}
      </ol>

      {incoming ? (
        <div className="flex flex-col gap-3 rounded-xl bg-secondary/70 p-4 text-sm text-secondary-foreground ring-1 ring-primary/10" data-testid="request-actions">
          <p>{first} would like to talk. Accepting and replying are free; only starting a conversation needs a membership.</p>
          <div className="flex flex-wrap gap-2">
            <form action={answerRequestAction}>
              <input type="hidden" name="conversationId" value={conversation.id} />
              <input type="hidden" name="answer" value="accept" />
              <SubmitButton pendingLabel="Accepting..." data-testid="accept-request"><Check aria-hidden /> Accept</SubmitButton>
            </form>
            <form action={answerRequestAction}>
              <input type="hidden" name="conversationId" value={conversation.id} />
              <input type="hidden" name="answer" value="decline" />
              <SubmitButton variant="outline" className="bg-card" pendingLabel="Declining..." data-testid="decline-request"><X aria-hidden /> Decline</SubmitButton>
            </form>
          </div>
        </div>
      ) : conversation.state === "requested" ? (
        <p className="text-sm text-muted-foreground">Waiting for {first} to accept.</p>
      ) : null}

      <p className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">
        Threads are read-only in this sample. Phase 1 adds sending, with text screening (R9) and email notifications (R7).
      </p>
    </div>
  );
}
