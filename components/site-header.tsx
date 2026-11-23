import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getGate } from "@/lib/server/gate";
import { IdentitySwitcher, type IdentityOption } from "./identity-switcher";
import { NavLinks } from "./nav-links";
import { StatusBadge } from "./status-badge";

export async function SiteHeader() {
  const gate = await getGate();
  const { identity, viewer, policy } = gate;

  const options: IdentityOption[] = [
    { value: "visitor", label: "Visitor", detail: "Signed out" },
    { value: "newcomer", label: "New member (pending)", detail: gate.hasSignedUp ? "Your own signup" : "Sign up and verify" },
    { value: "member", label: "Approved member", detail: "Amara Okafor" },
    { value: "moderator", label: "Moderator", detail: "Morgan Lee" },
    { value: "admin", label: "Admin", detail: "Riley Park" },
  ];

  const nav: Array<{ href: string; label: string }> = [];
  if (viewer?.role === "member") {
    nav.push({ href: "/members", label: "Members" }, { href: "/messages", label: "Messages" }, { href: "/me", label: "My profile" });
  }
  if (policy.can(viewer, "review.read")) {
    nav.push({ href: "/moderate", label: "Review queue" }, { href: "/moderate/audit", label: "Audit log" });
  }
  nav.push({ href: "/how-it-works", label: "How it works" }, { href: "/tests", label: "Tests" });

  return (
    <header className="border-b border-border/80 bg-card/70 backdrop-blur">
      <div className="bg-secondary/80 text-secondary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
          <p className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden />
            Demo identities, no real sign-in
          </p>
          <div className="flex items-center gap-2">
            {viewer && viewer.role === "member" ? <StatusBadge status={viewer.status} /> : null}
            <IdentitySwitcher current={identity} options={options} />
            <form method="post" action="/api/reset">
              <button type="submit" className="rounded-md px-2 py-1 text-sm text-secondary-foreground/80 underline-offset-4 hover:text-secondary-foreground hover:underline">
                Reset demo
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block font-heading text-lg font-semibold tracking-tight">Trust gate demo</span>
            <span className="block text-xs text-muted-foreground sm:text-sm">Verified community: hidden by default, video-checked by a person</span>
          </span>
        </Link>
        <NavLinks items={nav} />
      </div>
    </header>
  );
}
