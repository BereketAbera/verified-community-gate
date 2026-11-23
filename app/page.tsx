import Link from "next/link";
import { ArrowDown, ArrowRight, EyeOff, FileCheck2, KeyRound, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/notice";
import { param, type RawParams } from "@/lib/params";
import { getGate } from "@/lib/server/gate";
import type { Identity } from "@/lib/types";

const IDENTITIES: Array<{ value: Identity; title: string; who: string; body: string; cta: string }> = [
  {
    value: "newcomer",
    title: "Your signup",
    who: "A new member, hidden until approved",
    body: "Sign up, then pick a photo, a video and two prompts. Search is empty and member links return 404.",
    cta: "Start a signup",
  },
  {
    value: "member",
    title: "Amara (member)",
    who: "Amara Okafor, approved, free plan",
    body: "Browse and filter, accept a message request for free, subscribe in test mode to start one, report, block, make media private.",
    cta: "Continue as Amara",
  },
  {
    value: "moderator",
    title: "Morgan (moderator)",
    who: "Morgan Lee",
    body: "Photo beside video with a checklist: same person, five prompts, each language, 2 to 5 minutes. Reject with a reason, flag, notes, reports.",
    cta: "Continue as Morgan",
  },
  {
    value: "admin",
    title: "Riley (admin)",
    who: "Riley Park",
    body: "Everything a moderator does, plus suspend, ban, reinstate and complimentary access with an end date.",
    cta: "Continue as Riley",
  },
];

const STEPS = [
  "As Your signup, fill in the form (or use sample answers), pick a photo, a video and two prompts, and submit. Search shows nobody, and /members/m02 returns 404.",
  "As Morgan (moderator), open your signup, tick the checklist beside the video and approve it.",
  "Switch to Amara (member) and find the profile you just approved in search.",
  "As Amara, open Daniel: starting a conversation asks for a subscription (test mode). Priya's request in Messages can be accepted for free.",
  "As Amara, report Samuel. He already has two reports, so yours hides him until a moderator reviews them.",
  "As Amara, set your video to private, then replace it: your profile goes back to review and disappears.",
  "As Riley (admin), suspend a member, then reinstate them: they return to the status they had before.",
  "Open the audit log to see every decision with actor, reason and time.",
];

export default async function Home({ searchParams }: { searchParams: Promise<RawParams> }) {
  const params = await searchParams;
  const { identity, hasSignedUp } = await getGate();
  const reset = param(params, "reset");
  const notice = param(params, "notice");

  return (
    <div className="flex flex-col gap-10">
      {reset ? <Notice tone="success" title="Demo reset">Your sandbox was cleared. Everything is back to the seed data.</Notice> : null}
      {notice === "storage-full" ? (
        <Notice tone="warning" title="Demo storage is full">Your changes no longer fit in the demo&apos;s cookie. Use Reset demo to start again.</Notice>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div className="flex flex-col gap-4">
          <p className="eyebrow">Working sample · trust and safety layer</p>
          <h1 className="font-heading text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-[2.9rem]">
            Nobody is visible until a person has checked their video.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            A members-only community where every profile is hidden by default. A moderator compares each new member&apos;s
            verification video with their photo before anyone can see them. Photos and videos have no public URL, and the rules are
            covered by automated tests.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button asChild size="lg">
              <a href="#identities">
                Try the demo <ArrowDown aria-hidden />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/how-it-works">
                How it works <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <Link href="/how-it-works#coverage" className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary underline-offset-4 hover:underline">
            <ListChecks className="size-4" aria-hidden /> Your Phase 1 list, R1 to R13, against this sample
          </Link>
        </div>
        <ul className="grid gap-3 text-sm">
          {[
            { icon: EyeOff, text: "Pending, rejected, suspended and banned accounts never appear in search, profiles or messages, and two members who block each other vanish for each other." },
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

      <section className="flex scroll-mt-6 flex-col gap-4" aria-labelledby="identities-title" id="identities">
        <div>
          <h2 id="identities-title" className="font-heading text-2xl font-semibold">Choose a demo identity</h2>
          <p className="text-muted-foreground">Your changes stay in an encrypted cookie in this browser. Reset demo clears them.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {IDENTITIES.map(({ value, title, who, body, cta }) => (
            <Card key={value} className={value === identity ? "ring-2 ring-primary/50" : undefined}>
              <CardHeader>
                <h3 className="font-heading text-lg leading-snug font-medium" data-slot="card-title">{title}</h3>
                <CardDescription>{who}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm text-muted-foreground">{body}</p>
                <form method="post" action="/api/identity" className="mt-auto">
                  <input type="hidden" name="as" value={value} />
                  <Button type="submit" variant={value === identity ? "default" : "outline"} className="w-full" data-testid={`continue-${value}`}>
                    {value === identity ? "Current identity" : value === "newcomer" && hasSignedUp ? "Continue your signup" : cta}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Your questions answered">
        <Card>
          <CardHeader>
            <p className="eyebrow">Your Q2</p>
            <h3 className="font-heading text-xl leading-snug font-medium" data-slot="card-title">How is a private video kept from anyone not approved?</h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>The files sit outside the public folder, so no URL reaches them directly. The only way in is a media route that needs a signature over the asset, the viewer and an expiry 60 seconds away.</p>
            <p>The link is issued only after the policy says yes, and the policy is asked again when the link is used. A private file is visible to its owner and to moderators, nobody else.</p>
            <Link href="/how-it-works#media" className="font-medium text-primary underline-offset-4 hover:underline">Read the signed-link flow</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="eyebrow">Your Q3</p>
            <h3 className="font-heading text-xl leading-snug font-medium" data-slot="card-title">How does a pending account stay unseen and unseeing?</h3>
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
        <ol className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
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
