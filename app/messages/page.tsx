import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MembersOnlyScreen, ViewerStatusScreen } from "@/components/gate-screens";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { param, pick, type RawParams } from "@/lib/params";
import { getGate } from "@/lib/server/gate";

export const metadata: Metadata = { title: "Messages" };

const NOTICES: Record<string, { title: string; body: string }> = {
  requested: { title: "Message request sent", body: "They will see it the next time they open messages, and can accept or decline." },
  declined: { title: "Request declined", body: "The conversation is gone for both of you. They are not told why." },
};

export default async function MessagesPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const notice = pick(NOTICES, param(await searchParams, "notice"));
  const { viewer, policy } = await getGate();
  if (!viewer) return <MembersOnlyScreen />;
  if (viewer.role !== "member") {
    return (
      <div className="flex flex-col gap-6">
        <PageTitle eyebrow="Messages" title="Conversations" />
        <div className="flex flex-col items-start gap-3 rounded-xl bg-card p-6 text-muted-foreground ring-1 ring-foreground/10">
          <p>Staff accounts do not take part in member messaging. Reports about messages reach you in the review queue.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/moderate?view=reports">Open reports</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (viewer.status !== "approved") {
    return <ViewerStatusScreen viewer={viewer} counts={{ canSee: policy.listVisibleMembers(viewer).length, seenBy: policy.countWhoCanSee(viewer) }} />;
  }

  const conversations = policy.listConversations(viewer);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow="Messages" title="Conversations">
        Only conversations where both people are approved and neither has blocked the other are listed. When someone is
        suspended, banned or blocks you, the conversation disappears for both sides.
      </PageTitle>
      {notice ? <Notice tone="success" title={notice.title}>{notice.body}</Notice> : null}
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-8 text-center text-muted-foreground ring-1 ring-foreground/10">
          <p>No conversations yet.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/members">Browse members</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10" data-testid="conversations">
          {conversations.map(({ conversation, other, incoming }) => {
            const last = conversation.messages[conversation.messages.length - 1];
            const preview = incoming
              ? `${other.displayName.split(" ")[0]} would like to talk. Accept or decline, free.`
              : conversation.state === "requested"
                ? `Waiting for ${other.displayName.split(" ")[0]} to accept.`
                : last
                  ? `${last.from === viewer.id ? "You: " : ""}${last.text}`
                  : "";
            return (
              <li key={conversation.id} data-member-id={other.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-muted/60"
                  data-testid={`conversation-${conversation.id}`}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium">{other.displayName}</span>
                    <span className="truncate text-sm text-muted-foreground">{preview}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    {conversation.state === "requested" ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-900 ring-1 ring-amber-200">{incoming ? "Request" : "Waiting"}</span>
                    ) : null}
                    <time dateTime={conversation.at} className="hidden sm:inline">
                      {new Date(conversation.at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    </time>
                    <ChevronRight className="size-4" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
