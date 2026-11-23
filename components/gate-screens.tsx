import Link from "next/link";
import { ArrowRight, Check, LockKeyhole, ShieldAlert, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/types";
import { BrandMark } from "./brand-mark";
import { StatusBadge } from "./status-badge";

/** A screen leads with an icon, or with something more specific such as the verification steps. */
function Screen({
  icon: Icon,
  lead,
  title,
  children,
  testId,
}: {
  icon?: typeof LockKeyhole;
  lead?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section data-testid={testId} className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10 sm:px-12">
      {lead}
      {Icon ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon className="size-6" aria-hidden />
        </span>
      ) : null}
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <div className="flex flex-col items-center gap-4 text-muted-foreground">{children}</div>
    </section>
  );
}

export function MembersOnlyScreen() {
  return (
    <Screen icon={LockKeyhole} title="Members only" testId="members-only">
      <p>Profiles are visible only to approved members. Choose a demo identity to continue.</p>
      <Button asChild>
        <Link href="/#identities">Choose an identity</Link>
      </Button>
    </Screen>
  );
}

type StepState = "done" | "current" | "next";

/**
 * Where a new member is in review, in their own words. The current step is drawn with the mark
 * (photo beside video), because that comparison is what the member is waiting for.
 */
function VerificationSteps({ submitted }: { submitted: boolean }) {
  const steps: Array<{ label: string; state: StepState }> = [
    { label: "Profile", state: "done" },
    { label: "Photo and video", state: submitted ? "done" : "current" },
    { label: "A moderator compares them", state: submitted ? "current" : "next" },
    { label: "Visible to approved members", state: "next" },
  ];
  return (
    <ol aria-label="Your verification" className="mb-2 flex w-full max-w-xs flex-col gap-3 text-left text-sm sm:max-w-none sm:flex-row sm:gap-0 sm:text-center" data-testid="verification-steps">
      {steps.map((step, i) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          data-state={step.state}
          className="relative flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2"
        >
          {i > 0 ? <span aria-hidden className="absolute top-5 right-1/2 hidden h-px w-full bg-border sm:block" /> : null}
          <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-card">
            {step.state === "done" ? (
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
            ) : step.state === "current" ? (
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary ring-1 ring-primary/25">
                <BrandMark className="size-7 text-primary" />
              </span>
            ) : (
              <span className="size-3 rounded-full border-2 border-muted-foreground/45" />
            )}
          </span>
          <span className={cn("leading-snug sm:px-1", step.state === "current" ? "font-medium text-foreground" : "text-muted-foreground")}>
            {step.label}
            {step.state === "done" ? <span className="sr-only">, done</span> : step.state === "next" ? <span className="sr-only">, not yet</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Both numbers come from the policy, so the screen shows what the rules actually allow. */
export interface VisibilityCounts {
  /** policy.listVisibleMembers(viewer).length */
  canSee: number;
  /** policy.countWhoCanSee(viewer) */
  seenBy: number;
}

function VisibleCount({ canSee, seenBy }: VisibilityCounts) {
  return (
    <dl className="grid w-full max-w-md grid-cols-2 gap-3 pt-2 text-left text-sm">
      <div className="rounded-lg bg-muted px-4 py-3">
        <dt className="text-xs text-muted-foreground">Members you can see</dt>
        <dd className="text-2xl font-semibold text-foreground" data-testid="visible-count">{canSee}</dd>
      </div>
      <div className="rounded-lg bg-muted px-4 py-3">
        <dt className="text-xs text-muted-foreground">Members who can see you</dt>
        <dd className="text-2xl font-semibold text-foreground" data-testid="seen-by-count">{seenBy}</dd>
      </div>
    </dl>
  );
}

/** Switches to the moderator, so the reviewer can follow their own signup into the queue. */
function ReviewAsModerator() {
  return (
    <form method="post" action="/api/identity">
      <input type="hidden" name="as" value="moderator" />
      <Button type="submit" data-testid="review-as-moderator">
        Next: review it as the moderator <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}

/** What a signed-in account that is not approved sees instead of members. */
export function ViewerStatusScreen({ viewer, counts }: { viewer: Account; counts: VisibilityCounts }) {
  if (viewer.status === "pending" && !viewer.submittedAt) {
    return (
      <Screen lead={<VerificationSteps submitted={false} />} title="Finish your verification" testId="verification-needed">
        <StatusBadge status="not_submitted" />
        <p>Add a photo and a 2 to 5 minute video answering five prompts. Until a moderator has compared them, your profile stays hidden.</p>
        <VisibleCount {...counts} />
        <Button asChild>
          <Link href="/join/verify">Continue to verification</Link>
        </Button>
      </Screen>
    );
  }
  if (viewer.status === "pending") {
    return (
      <Screen lead={<VerificationSteps submitted />} title="Your profile is under review" testId="under-review">
        <StatusBadge status="pending" />
        <p>
          A moderator is comparing your video with your photo. Until they approve it, your profile is hidden from everyone and
          member profiles are hidden from you.
        </p>
        <VisibleCount {...counts} />
        <div className="flex flex-wrap justify-center gap-2">
          {viewer.isSelf ? <ReviewAsModerator /> : null}
          <Button asChild variant="outline">
            <Link href="/me">See what you submitted</Link>
          </Button>
        </div>
      </Screen>
    );
  }
  if (viewer.status === "rejected") {
    return (
      <Screen icon={UserRoundX} title="Your profile was not approved" testId="rejected">
        <StatusBadge status="rejected" />
        {viewer.decision?.reason ? <p className="font-medium text-foreground">Reason: {viewer.decision.reason}</p> : null}
        <p>Replace your photo or video to send the profile back for review. It stays hidden until then.</p>
        <VisibleCount {...counts} />
        <Button asChild>
          <Link href="/me">Replace photo or video</Link>
        </Button>
      </Screen>
    );
  }
  return (
    <Screen icon={ShieldAlert} title={viewer.status === "banned" ? "This account is banned" : "This account is suspended"} testId="restricted">
      <StatusBadge status={viewer.status} />
      {viewer.decision?.reason ? <p className="font-medium text-foreground">Reason: {viewer.decision.reason}</p> : null}
      <p>Members, messages and media are not available, and the profile is hidden from everyone.</p>
      <VisibleCount {...counts} />
    </Screen>
  );
}
