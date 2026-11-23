import type { Metadata } from "next";
import Link from "next/link";
import { MembersOnlyScreen, ViewerStatusScreen } from "@/components/gate-screens";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { getGate } from "@/lib/server/gate";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const { viewer, policy } = await getGate();
  if (!viewer) return <MembersOnlyScreen />;
  if (viewer.status !== "approved") return <ViewerStatusScreen viewer={viewer} />;

  const conversations = policy.listConversations(viewer);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow="Messages" title="Conversations">
        Only conversations where both people are approved and neither has blocked the other are listed. When someone is
        suspended, banned or blocks you, the conversation disappears for both sides.
      </PageTitle>
      {notice === "requested" ? <Notice tone="success" title="Message request sent">They will see it the next time they open messages.</Notice> : null}
      {viewer.role !== "member" ? (
        <p className="text-muted-foreground">Staff accounts do not take part in member messaging.</p>
      ) : conversations.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-muted-foreground ring-1 ring-foreground/10">No conversations yet.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10" data-testid="conversations">
          {conversations.map(({ conversation, other }) => (
            <li key={conversation.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" data-member-id={other.id}>
              <div className="flex flex-col gap-0.5">
                <Link href={`/members/${other.id}`} className="font-medium underline-offset-4 hover:underline">{other.displayName}</Link>
                <p className="text-sm text-muted-foreground">{conversation.preview}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className={conversation.state === "requested" ? "rounded-full bg-amber-50 px-2 py-0.5 text-amber-900 ring-1 ring-amber-200" : "rounded-full bg-secondary px-2 py-0.5"}>
                  {conversation.state === "requested" ? "Request sent" : "Active"}
                </span>
                <time dateTime={conversation.at}>{new Date(conversation.at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
