import type { Metadata } from "next";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberCard } from "@/components/member-card";
import { MembersOnlyScreen, ViewerStatusScreen } from "@/components/gate-screens";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { COUNTRIES, LANGUAGES, LOOKING_FOR_LABELS } from "@/lib/reference";
import { getGate } from "@/lib/server/gate";
import { signedLinkFor } from "@/lib/server/media-links";
import { LOOKING_FOR, type LookingFor } from "@/lib/types";

export const metadata: Metadata = { title: "Members" };

type Params = { q?: string; country?: string; language?: string; lookingFor?: string; notice?: string };

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function MembersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const gate = await getGate();
  const { viewer, policy } = gate;

  if (!viewer) return <MembersOnlyScreen />;
  if (viewer.status !== "approved") return <ViewerStatusScreen viewer={viewer} />;

  const filters = {
    q: params.q?.slice(0, 40) || undefined,
    country: params.country || undefined,
    language: params.language || undefined,
    lookingFor: LOOKING_FOR.includes(params.lookingFor as LookingFor) ? (params.lookingFor as LookingFor) : undefined,
  };
  const members = policy.listVisibleMembers(viewer, filters);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow="Approved members only" title="Members">
        Everyone here has been checked by a moderator. Pending, rejected, suspended and banned profiles never appear, and
        neither does anyone you have blocked or who has blocked you.
      </PageTitle>

      {params.notice === "blocked" ? (
        <Notice tone="success" title="Member blocked">You will not see each other anywhere now: search, profiles, messages or media.</Notice>
      ) : null}

      <form method="get" className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q">Name or city</Label>
          <Input id="q" name="q" defaultValue={filters.q} placeholder="Search" className="bg-card" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <select id="country" name="country" defaultValue={filters.country ?? ""} className={selectClass}>
            <option value="">Any country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="language">Language</Label>
          <select id="language" name="language" defaultValue={filters.language ?? ""} className={selectClass}>
            <option value="">Any language</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lookingFor">Looking for</Label>
          <select id="lookingFor" name="lookingFor" defaultValue={filters.lookingFor ?? ""} className={selectClass}>
            <option value="">Anything</option>
            {LOOKING_FOR.map((l) => (
              <option key={l} value={l}>{LOOKING_FOR_LABELS[l]}</option>
            ))}
          </select>
        </div>
        <Button type="submit" className="h-9">
          <Search aria-hidden /> Search
        </Button>
      </form>

      <p className="text-sm text-muted-foreground" data-testid="result-count">
        {members.length} {members.length === 1 ? "member" : "members"}
        {filtered ? " match your filters" : " visible to you"}
      </p>

      {members.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-muted-foreground ring-1 ring-foreground/10">No members match these filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="member-grid">
          {members.map((member) => {
            const slot = policy.mediaSlot(viewer, member, "photo");
            return (
              <MemberCard
                key={member.id}
                member={member}
                photo={slot.state === "available" ? signedLinkFor(gate, slot.asset) : null}
                photoPrivate={slot.state === "private"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
