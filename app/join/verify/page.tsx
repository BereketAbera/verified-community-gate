import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { VerifyForm } from "@/components/forms/verify-form";
import { libraryAssetId, SAMPLE_PEOPLE } from "@/lib/reference";
import { getGate } from "@/lib/server/gate";
import { signedLinkForId } from "@/lib/server/media-links";

export const metadata: Metadata = { title: "Verification" };

export default async function VerifyPage() {
  const gate = await getGate();
  const { viewer } = gate;
  if (!viewer || !viewer.isSelf) redirect("/join");

  if (viewer.submittedAt && viewer.status !== "rejected") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <PageTitle eyebrow="Step 2 of 2" title="Verification submitted" />
        <Notice title="Waiting for a moderator">Your photo and video are in the review queue. You can replace them from your profile, which restarts the review.</Notice>
        <Button asChild className="self-start">
          <Link href="/me">Go to my profile</Link>
        </Button>
      </div>
    );
  }

  const samples = SAMPLE_PEOPLE.map((s) => ({
    id: s.id,
    label: s.label,
    seconds: s.seconds,
    photo: signedLinkForId(gate, libraryAssetId("photo", s.id)),
    video: signedLinkForId(gate, libraryAssetId("video", s.id)),
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <PageTitle eyebrow="Step 2 of 2 · verification" title="Your photo and verification video">
        Record a 2 to 5 minute video answering five prompts, three fixed and two you choose, in every language you ticked. A
        moderator compares the person in the video with your photo before anyone can see your profile.
      </PageTitle>
      <p className="-mt-2 mb-8 flex max-w-3xl items-start gap-2 rounded-lg bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground ring-1 ring-primary/10" data-testid="sample-note">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          In this sample nothing is recorded or uploaded: you pick fictional files, and a 6-second clip stands in for the full
          recording. In Phase 1 the member records in the browser or on their phone.
        </span>
      </p>
      <VerifyForm samples={samples} languages={viewer.languages} />
    </div>
  );
}
