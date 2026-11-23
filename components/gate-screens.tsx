import Link from "next/link";
import { ArrowRight, Clock3, EyeOff, LockKeyhole, ShieldAlert, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Account } from "@/lib/types";
import { StatusBadge } from "./status-badge";

function Screen({
  icon: Icon,
  title,
  children,
  testId,
}: {
  icon: typeof EyeOff;
  title: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section data-testid={testId} className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10 sm:px-12">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-6" aria-hidden />
      </span>
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
      <Screen icon={Clock3} title="Finish your verification" testId="verification-needed">
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
      <Screen icon={Clock3} title="Your profile is under review" testId="under-review">
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
