import type { Metadata } from "next";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/notice";
import { PageTitle } from "@/components/page-title";
import { SignupForm } from "@/components/forms/signup-form";
import { countryName } from "@/lib/reference";
import { getGate } from "@/lib/server/gate";

export const metadata: Metadata = { title: "Join" };

export default async function JoinPage() {
  const gate = await getGate();
  const detected = (await headers()).get("x-vercel-ip-country");

  if (gate.hasSignedUp) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <PageTitle eyebrow="Step 1 of 2" title="You already signed up" />
        <Notice title="One signup per browser">
          Switch to the New member identity to continue with it, or reset the demo to start again.
        </Notice>
        <div className="flex gap-2">
          <form method="post" action="/api/identity">
            <input type="hidden" name="as" value="newcomer" />
            <Button type="submit">Continue as new member</Button>
          </form>
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
        Your profile stays hidden from everyone until a moderator has compared a short video of you with your photo.
        Nobody can see you, and you cannot see anyone, until then.
      </PageTitle>
      <SignupForm detectedCountry={detected ? `${countryName(detected)} (${detected})` : null} />
    </div>
  );
}
