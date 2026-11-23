import Link from "next/link";
import { ArrowRight, EyeOff, FileCheck2, Gavel, KeyRound, ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/notice";
import { getGate } from "@/lib/server/gate";
import type { Identity } from "@/lib/types";

const IDENTITIES: Array<{ value: Identity; title: string; who: string; body: string; icon: typeof UsersRound }> = [
  {
    value: "newcomer",
    title: "New member (pending)",
    who: "Your own signup",
    body: "Sign up, pick a sample photo and video, and see what a pending account can reach: nothing. Direct member links return 404.",
    icon: UserRoundPlus,
  },
  {
    value: "member",
    title: "Approved member",
    who: "Amara Okafor",
    body: "Browse verified members, set your photo or video to private, copy a signed link and watch it expire, replace your video and drop back into review.",
    icon: UsersRound,
  },
  {
    value: "moderator",
    title: "Moderator",
    who: "Morgan Lee",
    body: "Work the review queue: photo beside video, stated against detected country, approve, reject with a reason, flag, notes, audit log.",
    icon: Gavel,
  },
  {
    value: "admin",
    title: "Admin",
    who: "Riley Park",
    body: "Everything a moderator can do, plus suspend, ban and reinstate. A suspended member disappears from search and messages at once.",
    icon: ShieldCheck,
  },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  const { identity } = await getGate();

  return (
    <div className="flex flex-col gap-14">
      {reset ? <Notice tone="success" title="Demo reset">Your sandbox was cleared. Everything is back to the seed data.</Notice> : null}

      <section className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end">
        <div className="flex flex-col gap-4">
          <p className="eyebrow">Working sample · trust and safety layer</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Nobody is visible until a person has checked their video.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            A members-only community where every profile is hidden by default. A moderator compares each new member&apos;s short
            video with their photo before anyone can see them. Photos and videos have no public URL, and the rules are covered by
            automated tests.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild size="lg">
              <Link href="/how-it-works">
                How it works <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/tests">See the tests</Link>
            </Button>
          </div>
        </div>
        <ul className="grid gap-3 text-sm">
          {[
            { icon: EyeOff, text: "Pending, rejected, suspended, banned and blocked accounts never appear in search, profiles or messages." },
            { icon: KeyRound, text: "Media is served only through 60-second signed links, bound to the viewer and re-checked on every request." },
            { icon: FileCheck2, text: "One policy module answers every read. Table-driven tests cover each status, role and block direction." },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="identities">
        <div>
          <h2 id="identities" className="font-heading text-2xl font-semibold">Choose a demo identity</h2>
          <p className="text-muted-foreground">There is no real sign-in. Your changes stay in an encrypted cookie in this browser.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {IDENTITIES.map(({ value, title, who, body, icon: Icon }) => (
            <Card key={value} className={value === identity ? "ring-2 ring-primary/50" : undefined}>
              <CardHeader>
                <Icon className="mb-1 size-5 text-primary" aria-hidden />
                <CardTitle className="font-heading text-lg">{title}</CardTitle>
                <CardDescription>{who}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm text-muted-foreground">{body}</p>
                <form method="post" action="/api/identity" className="mt-auto">
                  <input type="hidden" name="as" value={value} />
                  <Button type="submit" variant={value === identity ? "default" : "outline"} className="w-full" data-testid={`continue-${value}`}>
                    {value === identity ? "Current identity" : `Continue as ${title.replace(" (pending)", "")}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Questions answered">
        <Card>
          <CardHeader>
            <p className="eyebrow">Question</p>
            <CardTitle className="font-heading text-xl">How is a private video kept from anyone not approved?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>The files sit outside the public folder, so no URL reaches them directly. The only way in is a media route that needs a signature over the asset, the viewer and an expiry 60 seconds away.</p>
            <p>The link is issued only after the policy says yes, and the policy is asked again when the link is used. A private file is visible to its owner and to moderators, nobody else.</p>
            <Link href="/how-it-works#media" className="font-medium text-primary underline-offset-4 hover:underline">Read the signed-link flow</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="eyebrow">Question</p>
            <CardTitle className="font-heading text-xl">How does a pending account stay unseen and unseeing?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>Search, member pages, messages and media all ask one function whether a viewer may see a profile. It says yes only when both people are approved and neither has blocked the other.</p>
            <p>So a pending account gets an empty search and a real 404 on any member link, and nobody can find it in return. The test suite checks every combination.</p>
            <Link href="/tests" className="font-medium text-primary underline-offset-4 hover:underline">See the visibility matrix</Link>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="try">
        <h2 id="try" className="font-heading text-2xl font-semibold">What to try</h2>
        <ol className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            "As a new member, sign up and submit. Search shows nobody, and /members/m02 returns 404.",
            "As the moderator, open your signup in the queue, compare photo and video, and approve it.",
            "As the approved member, find your new profile in search. Copy a signed link and open it after a minute.",
            "Set your video to private, then replace it: your profile goes back to review and disappears.",
            "As the admin, suspend a member. They vanish from search and from conversations straight away.",
            "Open the audit log to see every decision with actor, reason and time.",
          ].map((step, i) => (
            <li key={step} className="flex gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
