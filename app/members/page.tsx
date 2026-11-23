import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { unblockAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { MemberCard } from "@/components/member-card";
import { MembersOnlyScreen, ViewerStatusScreen } from "@/components/gate-screens";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { oneOf, param, type RawParams } from "@/lib/params";
import { COUNTRY_CODES, COUNTRIES, LANGUAGES, LOOKING_FOR_LABELS } from "@/lib/reference";
import { getGate } from "@/lib/server/gate";
import { signedLinkFor } from "@/lib/server/media-links";
import { LOOKING_FOR } from "@/lib/types";

export const metadata: Metadata = { title: "Members" };

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function MembersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const gate = await getGate();
  const { viewer, policy } = gate;

  if (!viewer) return <MembersOnlyScreen />;
  if (viewer.status !== "approved") {
    return <ViewerStatusScreen viewer={viewer} counts={{ canSee: policy.listVisibleMembers(viewer).length, seenBy: policy.countWhoCanSee(viewer) }} />;
  }

  const filters = {
    q: param(params, "q"),
    country: oneOf(params, "country", COUNTRY_CODES),
    language: oneOf(params, "language", LANGUAGES),
    lookingFor: oneOf(params, "lookingFor", LOOKING_FOR),
  };
  const notice = param(params, "notice");
  const blockedId = param(params, "who", 24);
  const members = policy.listVisibleMembers(viewer, filters);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow="Approved members only" title="Members">
        Everyone here was checked by a moderator. Pending, rejected, suspended and banned profiles never appear, and
        neither does anyone you blocked or who blocked you.
      </PageTitle>

      {notice === "blocked" ? (
        <Notice tone="success" title="Member blocked">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>You will not see each other anywhere now: search, profiles, messages or media.</span>
            {blockedId ? (
              <form action={unblockAction}>
                <input type="hidden" name="targetId" value={blockedId} />
                <input type="hidden" name="back" value="member" />
                <SubmitButton size="xs" variant="outline" className="bg-card" data-testid="undo-block">Undo</SubmitButton>
              </form>
            ) : null}
          </div>
        </Notice>
      ) : null}
      {notice === "reported-hidden" ? (
        <Notice tone="success" title="Report sent">
          That was the third open report, so the profile is hidden from every member until a moderator reviews the reports.
        </Notice>
      ) : null}
      {notice === "storage-full" ? <Notice tone="warning" title="Demo storage is full">Use Reset demo to start again.</Notice> : null}

      <form
        method="get"
        className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end lg:gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q" className="max-lg:sr-only">Name or city</Label>
          <Input id="q" name="q" defaultValue={filters.q} placeholder="Search by name or city" className="h-9 bg-card" maxLength={40} />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-2 lg:contents">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="country" className="max-lg:sr-only">Country</Label>
            <select id="country" name="country" defaultValue={filters.country ?? ""} className={selectClass}>
              <option value="">Any country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="language" className="max-lg:sr-only">Language</Label>
            <select id="language" name="language" defaultValue={filters.language ?? ""} className={selectClass}>
              <option value="">Any language</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-1.5 lg:col-span-1">
            <Label htmlFor="lookingFor" className="max-lg:sr-only">Looking for</Label>
            <select id="lookingFor" name="lookingFor" defaultValue={filters.lookingFor ?? ""} className={selectClass}>
              <option value="">Looking for anything</option>
              {LOOKING_FOR.map((l) => (
                <option key={l} value={l}>{LOOKING_FOR_LABELS[l]}</option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" className="col-start-2 row-start-1 h-9 self-end lg:col-start-auto lg:row-start-auto">
          <Search aria-hidden /> Search
        </Button>
      </form>

      <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground" data-testid="result-count">
        <span>
          {members.length} {members.length === 1 ? "member" : "members"}
          {filtered ? " match your filters" : " visible to you"}
        </span>
        {filtered ? (
          <Link href="/members" className="font-medium text-primary underline-offset-4 hover:underline">Clear filters</Link>
        ) : null}
      </p>

      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-8 text-center text-muted-foreground ring-1 ring-foreground/10">
          <p>{filtered ? "No members match these filters." : "Nobody is visible to you right now."}</p>
          {filtered ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/members">Clear filters</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4" data-testid="member-grid">
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
