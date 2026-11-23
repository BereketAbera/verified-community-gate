import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { VerifyForm } from "@/components/forms/verify-form";
import { getGate } from "@/lib/server/gate";

export const metadata: Metadata = { title: "Verification" };

export default async function VerifyPage() {
  const { viewer } = await getGate();
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

  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <PageTitle eyebrow="Step 2 of 2 · verification" title="Add a photo and a short video">
        A moderator compares the person in the video with the photo. In a real build you would record a few seconds on your
        phone; here you pick from fictional sample files, so nothing is uploaded.
      </PageTitle>
      <VerifyForm />
    </div>
  );
}
