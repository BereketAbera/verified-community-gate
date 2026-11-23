import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { SignupForm } from "@/components/forms/signup-form";
import { getGate } from "@/lib/server/gate";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage() {
  const gate = await getGate();

  if (gate.hasSignedUp) {
    const viewingSignup = gate.identity === "newcomer";
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <PageTitle title="You already signed up" />
        <Notice title="One signup per browser">
          {viewingSignup
            ? "Your profile is saved. Carry on with its verification, or reset the demo to start a new one."
            : "Switch to Your signup to carry on with it, or reset the demo to start a new one."}
        </Notice>
        <div className="flex flex-wrap gap-2">
          {viewingSignup ? (
            <Button asChild>
              <Link href="/me">Go to my profile</Link>
            </Button>
          ) : (
            <form method="post" action="/api/identity">
              <input type="hidden" name="as" value="newcomer" />
              <Button type="submit">Switch to Your signup</Button>
            </form>
          )}
          <form method="post" action="/api/reset">
            <Button type="submit" variant="outline">Reset demo</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageTitle eyebrow="Step 1 of 2 · new member" title="Create your profile">
        Your profile stays hidden from everyone until a moderator has compared your verification video with your photo.
        Nobody can see you, and you cannot see anyone, until then.
      </PageTitle>
      <SignupForm />
    </div>
  );
}
