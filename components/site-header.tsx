import Link from "next/link";
import { getGate } from "@/lib/server/gate";
import { BrandMark } from "./brand-mark";
import { IdentitySwitcher, type IdentityOption } from "./identity-switcher";
import { NavLinks } from "./nav-links";
import { displayStatus, StatusBadge } from "./status-badge";

/** Identities are named by person, not by status; the badge beside the menu shows the live status. */
export function identityOptions(hasSignedUp: boolean, selfName: string | null): IdentityOption[] {
  return [
    { value: "visitor", label: "Visitor", detail: "Signed out" },
    { value: "newcomer", label: "Your signup", detail: hasSignedUp && selfName ? `${selfName}, the profile you created` : "A new member: sign up and verify" },
    { value: "member", label: "Amara (member)", detail: "Amara Okafor, approved member on the free plan" },
    { value: "moderator", label: "Morgan (moderator)", detail: "Morgan Lee, reviews new profiles" },
    { value: "admin", label: "Riley (admin)", detail: "Riley Park, can also suspend and ban" },
  ];
}

export async function SiteHeader() {
  const gate = await getGate();
  const { identity, viewer, policy } = gate;

  const nav: Array<{ href: string; label: string }> = [];
  if (viewer?.role === "member") {
    nav.push({ href: "/members", label: "Members" }, { href: "/messages", label: "Messages" }, { href: "/me", label: "My profile" });
  }
  if (policy.can(viewer, "review.read")) {
    nav.push({ href: "/moderate", label: "Review queue" }, { href: "/moderate/audit", label: "Audit log" });
  }
  nav.push({ href: "/how-it-works", label: "How it works" }, { href: "/tests", label: "Tests" });

  return (
    <header className="border-b border-border/80 bg-card/70">
      <div className="bg-secondary/80 text-secondary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2 text-xs sm:px-6 sm:text-sm">
          <p className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden />
            Demo identities, no real sign-in
          </p>
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {viewer && viewer.role === "member" ? (
              <StatusBadge status={displayStatus(viewer)} className="bg-card" />
            ) : null}
            <IdentitySwitcher current={identity} options={identityOptions(gate.hasSignedUp, gate.selfName)} />
            <form method="post" action="/api/reset">
              <button type="submit" className="rounded-md px-1.5 py-1 whitespace-nowrap text-secondary-foreground/80 underline-offset-4 hover:text-secondary-foreground hover:underline sm:px-2">
                Reset demo
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="group flex items-center gap-3 self-start rounded-lg">
          <BrandMark className="size-10 shrink-0 text-primary" />
          <span className="leading-tight">
            <span className="block font-heading text-lg font-semibold tracking-tight">Trust gate demo</span>
            <span className="hidden text-xs text-muted-foreground sm:block sm:text-sm">Verified community: hidden by default, video-checked by a person</span>
          </span>
        </Link>
        <NavLinks items={nav} />
      </div>
    </header>
  );
}
