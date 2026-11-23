import type { Metadata } from "next";
import Link from "next/link";
import { Check, CircleDashed, Clock3, Minus } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { PageTitle } from "@/components/page-title";
import { SignedLinkDiagram } from "@/components/signed-link-diagram";
import { FOUNDING } from "@/lib/access";
import { createPolicy } from "@/lib/policy";
import { freshSandbox } from "@/lib/sandbox";
import { excerpt } from "@/lib/server/excerpt";
import { buildWorld } from "@/lib/world";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "How it works" };

type Cell = { yes: boolean; text: string };
const yes = (text = "Yes"): Cell => ({ yes: true, text });
const no = (text = "No"): Cell => ({ yes: false, text });

/** What an approved member sees of other accounts. Every cell is covered by a unit test. */
const STATUS_ROWS: Array<{ label: string; search: Cell; link: Cell; messages: Cell; sees: Cell }> = [
  { label: "Approved", search: yes(), link: yes("Opens"), messages: yes(), sees: yes() },
  { label: "Pending review", search: no(), link: no("404"), messages: no(), sees: no() },
  { label: "Rejected", search: no(), link: no("404"), messages: no(), sees: no() },
  { label: "Suspended", search: no(), link: no("404"), messages: no(), sees: no() },
  { label: "Banned", search: no(), link: no("404"), messages: no(), sees: no() },
  { label: "Blocked, either direction", search: no("Not to each other"), link: no("404 to each other"), messages: no("Not with each other"), sees: yes("Yes, except each other") },
  { label: "Three open reports", search: no(), link: no("404"), messages: no(), sees: yes("Yes") },
];

type Coverage = "working" | "partly" | "sketched" | "later";
const COVERAGE_STYLE: Record<Coverage, { label: string; className: string; icon: typeof Check }> = {
  working: { label: "Working here", className: "bg-emerald-50 text-emerald-800 ring-emerald-200", icon: Check },
  partly: { label: "Partly here", className: "bg-sky-50 text-sky-900 ring-sky-200", icon: CircleDashed },
  sketched: { label: "Sketched here", className: "bg-violet-50 text-violet-900 ring-violet-200", icon: CircleDashed },
  later: { label: "Later milestone", className: "bg-muted text-muted-foreground ring-foreground/10", icon: Clock3 },
};

/** The client's Phase 1 list (R1 to R13) against this sample. Milestones follow the post: M1 to M6. */
const COVERAGE: Array<{ id: string; title: string; status: Coverage; here: string; later?: string }> = [
  { id: "R1", title: "Signup and profiles", status: "working", here: "18+ confirmation, versioned terms with the time, a separate unticked faith consent. Optional and faith fields come from one config file.", later: "M1: your full list of about 15 fields in that config." },
  { id: "R2", title: "Video verification", status: "working", here: "Photo plus video, five prompts (three fixed, two chosen), every language on the profile, a 2:00 to 5:00 length check. Replacing a file sends the profile back to review.", later: "M2: recording and upload instead of sample files." },
  { id: "R3", title: "Moderator dashboard", status: "working", here: "Queue, video beside photo, checklist, approve, reject with a reason, flag, notes, stated against detected country, audit log, moderator and admin roles.", later: "M2: alerts to moderators." },
  { id: "R4", title: "Private media", status: "working", here: "60-second links signed for one viewer, issued after a policy check and checked again on use. Photo and video can each be approved members or private.", later: "M2: files with Cloudflare Stream or Bunny.net." },
  { id: "R5", title: "Hidden by default", status: "working", here: "Pending, rejected, suspended and banned accounts never appear, direct links are real 404s, and they see nobody. Proved by table-driven tests." },
  { id: "R6", title: "Subscriptions", status: "sketched", here: "Starting a conversation needs paid, complimentary or founding access; replying is free. Admin-set complimentary access with an end date, the founding counter, and a test-mode checkout through one billing interface.", later: "M3: the Stripe or Authorize.net adapter." },
  { id: "R7", title: "Messaging", status: "partly", here: "Request, accept, decline, block and report.", later: "M4: sending messages and email notifications." },
  { id: "R8", title: "Browse and search", status: "working", here: "Name or city, country, language and looking-for filters, over approved members only." },
  { id: "R9", title: "Safety", status: "partly", here: "Reports with auto-hide at three, suspend, ban and reinstate.", later: "M5: warn and restrict, email and IP bans, text screening with OpenAI Moderation or Perspective." },
  { id: "R10", title: "Privacy", status: "later", here: "Consent records only.", later: "M5: data export and deletion, including the video at the provider; your attorney's regional notices." },
  { id: "R11", title: "Security", status: "partly", here: "Automated tests prove the hidden-by-default rules; signed links; an encrypted, tamper-evident state cookie.", later: "M5 and M6: staff 2FA, daily backups with a tested restore, fixes from the security review." },
  { id: "R12", title: "Responsive, calm design", status: "working", here: "Phone to desktop, keyboard focus, readable contrast.", later: "M1: strings moved into translation files (English at launch)." },
  { id: "R13", title: "Handover", status: "later", here: "README and tests in this repository.", later: "M6: code in your GitHub, documentation and the warranty." },
];

function YesNo({ cell }: { cell: Cell }) {
  return cell.yes ? (
    <span className="inline-flex items-center gap-1 text-emerald-800"><Check className="size-4 shrink-0" aria-hidden />{cell.text}</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="size-4 shrink-0" aria-hidden />{cell.text}</span>
  );
}

function Section({ id, step, title, children }: { id: string; step: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t pt-10">
      <p className="eyebrow">{step}</p>
      <h2 className="mt-1 mb-4 font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-col gap-4 text-base leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

const mono = "font-mono text-sm";

export default async function HowItWorksPage() {
  const [isVisible, canMessage, canAccessMedia, sign, verify, route, approval, access, provider, apply] = await Promise.all([
    excerpt("lib/policy.ts", "isVisible"),
    excerpt("lib/policy.ts", "canMessage"),
    excerpt("lib/policy.ts", "canAccessMedia"),
    excerpt("lib/media-signing.ts", "sign"),
    excerpt("lib/media-signing.ts", "verify"),
    excerpt("app/api/media/[assetId]/route.ts", "route"),
    excerpt("lib/verification.ts", "approval"),
    excerpt("lib/access.ts", "access"),
    excerpt("lib/billing.ts", "provider"),
    excerpt("lib/billing.ts", "apply"),
  ]);
  const founding = createPolicy(buildWorld(freshSandbox())).foundingPlaces();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <PageTitle eyebrow="How it works" title="One gate, short-lived links, a person in the loop">
        Three ideas carry the whole demo. Every read asks one policy module. Media is reachable only through a link that
        expires in a minute and is checked again when used. And nobody becomes visible until a moderator has looked.
      </PageTitle>

      <nav aria-label="On this page" className="grid gap-2 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10 sm:grid-cols-3">
        {[
          ["#coverage", "Your Phase 1 list"],
          ["#gate", "1. One gate for every read"],
          ["#hidden", "2. Hidden by default"],
          ["#verification", "3. Verification"],
          ["#media", "4. Private media"],
          ["#providers", "5. Real video providers"],
          ["#billing", "6. Subscriptions"],
          ["#moderation", "7. Moderation and reports"],
          ["#state", "8. How state works here"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">{label}</a>
        ))}
      </nav>

      <section id="coverage" className="flex scroll-mt-24 flex-col gap-4">
        <div>
          <p className="eyebrow">Your Phase 1 list</p>
          <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight">R1 to R13 against this sample</h2>
          <p className="mt-2 text-muted-foreground">
            What works in this sample today, what is sketched, and the milestone from your post where the rest lands. Recommended
            stack: Next.js and TypeScript, Postgres with row-level security, Cloudflare Stream (or Bunny.net) for video, and the
            payment processor behind one billing interface.
          </p>
        </div>
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10" data-testid="coverage">
          {COVERAGE.map((row) => {
            const style = COVERAGE_STYLE[row.status];
            const Icon = style.icon;
            return (
              <li key={row.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[3.25rem_11rem_1fr] sm:gap-4">
                <span className="font-mono text-xs font-semibold text-primary sm:pt-0.5">{row.id}</span>
                <span className="flex flex-col items-start gap-1.5">
                  <span className="font-medium">{row.title}</span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", style.className)}>
                    <Icon className="size-3" aria-hidden />
                    {style.label}
                  </span>
                </span>
                <span className="flex flex-col gap-1 text-muted-foreground">
                  <span>{row.here}</span>
                  {row.later ? <span className="text-foreground/80">{row.later}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <Section id="gate" step="Step 1" title="One gate for every read">
        <p>
          Search, member pages, messages, media and the moderation screens all call <code className={mono}>lib/policy.ts</code>.
          Pages never filter on their own. When the policy says no, the page calls <code className={mono}>notFound()</code>,
          so a hidden profile looks exactly like one that never existed.
        </p>
        <CodeBlock file="lib/policy.ts" code={isVisible} />
        <p>
          Messaging needs the rule to hold in both directions, so a block on either side ends the conversation for both.
          Starting a conversation also needs an active membership; replying never does.
        </p>
        <CodeBlock file="lib/policy.ts" code={canMessage} />
      </Section>

      <Section id="hidden" step="Step 2" title="Hidden by default">
        <p>
          What an approved member sees of other accounts. Pending, rejected, suspended and banned accounts also see nobody
          themselves. A block only hides the two members from each other.
        </p>
        <div className="hidden overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10 sm:block" role="region" aria-label="Visibility by status" tabIndex={0}>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-2 font-medium">Other account</th>
                <th className="px-4 py-2 font-medium">In search</th>
                <th className="px-4 py-2 font-medium">Direct link</th>
                <th className="px-4 py-2 font-medium">In messages</th>
                <th className="px-4 py-2 font-medium">Can see others</th>
              </tr>
            </thead>
            <tbody>
              {STATUS_ROWS.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-medium">{row.label}</th>
                  <td className="px-4 py-2"><YesNo cell={row.search} /></td>
                  <td className="px-4 py-2"><YesNo cell={row.link} /></td>
                  <td className="px-4 py-2"><YesNo cell={row.messages} /></td>
                  <td className="px-4 py-2"><YesNo cell={row.sees} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-col gap-2 sm:hidden">
          {STATUS_ROWS.map((row) => (
            <li key={row.label} className="rounded-xl bg-card p-3 text-sm ring-1 ring-foreground/10">
              <p className="mb-2 font-medium">{row.label}</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <dt className="text-muted-foreground">In search</dt><dd><YesNo cell={row.search} /></dd>
                <dt className="text-muted-foreground">Direct link</dt><dd><YesNo cell={row.link} /></dd>
                <dt className="text-muted-foreground">In messages</dt><dd><YesNo cell={row.messages} /></dd>
                <dt className="text-muted-foreground">Can see others</dt><dd><YesNo cell={row.sees} /></dd>
              </dl>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Every cell is an automated check, for each viewer role and block direction.{" "}
          <Link href="/tests" className="font-medium text-primary underline-offset-4 hover:underline">See the tests</Link>.
        </p>
        <p className="rounded-lg bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground ring-1 ring-primary/10">
          A question for you: R5 lists &ldquo;blocked&rdquo; alongside account statuses. This sample reads it as a block between two
          members. If you meant a staff-level block, that is Suspended here.
        </p>
      </Section>

      <Section id="verification" step="Step 3" title="Verification: five prompts, every language, a person decides">
        <p>
          A new member records a 2 to 5 minute video answering five prompts, three asked of everyone and two they choose, in
          every language on their profile. The moderator watches it beside the photo and ticks what they saw and heard: the same
          person, each prompt, each language. The length is checked from the recording. Approve stays off until every item
          passes, and the checklist is saved in the audit log with the decision.
        </p>
        <CodeBlock file="lib/verification.ts" code={approval} />
        <p>
          The country the connection came from at signup is stored and shown to staff only, next to the country the member
          stated. A difference is a reason for a second look, never an automatic rejection: travel and VPNs are common. Members
          are not told what was detected, so the check does not teach anyone which country to fake.
        </p>
      </Section>

      <Section id="media" step="Step 4" title="Private media: signed, short-lived, checked twice">
        <SignedLinkDiagram />
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>The files live in <code className={mono}>private-media/</code>, outside <code className={mono}>public/</code>. No URL points at them.</li>
          <li>When a page needs a photo or video, it asks the policy first. Only if the answer is yes does the server issue a link: an HMAC-SHA256 over the asset id, the viewer and an expiry 60 seconds away.</li>
          <li>The viewer is not in the URL. The media route takes the viewer from the session and recomputes the signature, so a copied link fails for anyone else, including a signed-out browser.</li>
          <li>The route then asks the policy again. If the owner was suspended, went private or blocked the viewer in the meantime, the answer is 404.</li>
          <li>A page restored by Back after its links expired asks for fresh links, and the policy is asked again each time.</li>
        </ol>
        <CodeBlock file="lib/media-signing.ts" code={sign} />
        <CodeBlock file="lib/media-signing.ts" code={verify} />
        <CodeBlock file="app/api/media/[assetId]/route.ts" code={route} />
        <CodeBlock file="lib/policy.ts" code={canAccessMedia} />
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10"><p className="font-mono font-semibold">200</p><p className="text-muted-foreground">Valid link, policy still allows it. Sent with <span className="font-mono">Cache-Control: private, no-store</span>; byte ranges supported for video.</p></div>
          <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10"><p className="font-mono font-semibold">403</p><p className="text-muted-foreground">Missing, altered or expired signature, or a link issued to someone else.</p></div>
          <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10"><p className="font-mono font-semibold">404</p><p className="text-muted-foreground">Signature fine, but this viewer may not know the file exists.</p></div>
        </div>
      </Section>

      <Section id="providers" step="Step 5" title="The same issuer with a real video provider">
        <p>
          In production the files would sit with a video provider rather than on the app server. The policy check and the
          issuer stay exactly where they are; only the signer changes.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <span className="font-medium">Cloudflare Stream.</span> Turn on <span className={mono}>requireSignedURLs</span> for every video.
            After <span className={mono}>canAccessMedia</span> says yes, sign a short JWT with a Stream signing key
            (<span className={mono}>sub</span> is the video id, <span className={mono}>exp</span> one minute out, optional access rules),
            or ask the Stream token endpoint for one. The token takes the place of the video id in the playback URL.
          </li>
          <li>
            <span className="font-medium">Bunny.net.</span> Turn on token authentication for the Stream library or pull zone. The
            server hashes the security key with the video id or path and the expiry (SHA-256), and appends <span className={mono}>token</span> and
            <span className={mono}> expires</span> to the URL. Bunny&apos;s edge refuses anything expired or altered.
          </li>
        </ul>
        <CodeBlock
          file="Sketch: the same issuer, a different signer"
          code={`async function playbackUrl(viewer: Account, asset: MediaAsset) {
  if (!policy.canAccessMedia(viewer, asset)) return null; // unchanged
  const exp = Math.floor(Date.now() / 1000) + 60;

  // Cloudflare Stream: RS256 JWT signed with a Stream signing key
  const token = await new SignJWT({ sub: asset.streamUid, kid: STREAM_KEY_ID, exp })
    .setProtectedHeader({ alg: "RS256", kid: STREAM_KEY_ID })
    .sign(streamPrivateKey);
  return \`https://customer-\${CODE}.cloudflarestream.com/\${token}/manifest/video.m3u8\`;

  // Bunny Stream: sha256(securityKey + videoId + exp), sent as ?token=&expires=
}`}
        />
        <p className="text-sm text-muted-foreground">
          Because provider links cannot be re-checked on every byte, keep them short and re-issue them per view, exactly as
          this demo does with its own route.
        </p>
      </Section>

      <Section id="billing" step="Step 6" title="Subscriptions behind one interface">
        <p>
          Creating a profile, browsing and replying are free. Starting a conversation needs paid, complimentary or founding
          access that has not ended; everyone pays the same price. The status lives in your own database, so the processor can
          change without touching these rules.
        </p>
        <CodeBlock file="lib/access.ts" code={access} />
        <p>
          The processor sits behind one interface. Its webhooks become three events, and each event is written to your own
          record once, by event id, so a retried webhook changes nothing.
        </p>
        <CodeBlock file="lib/billing.ts" code={provider} />
        <CodeBlock file="lib/billing.ts" code={apply} />
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <span className="font-medium">Stripe adapter.</span> A Checkout Session in subscription mode, created with an idempotency
            key; webhooks verified with the endpoint secret; subscription and invoice events mapped to the three above.
          </li>
          <li>
            <span className="font-medium">Authorize.net adapter.</span> Accept Hosted for the card form, Automated Recurring Billing
            (ARB) for renewals, and webhooks checked with the <span className={mono}>X-ANET-Signature</span> header (an HMAC-SHA512 of
            the body) before they are mapped.
          </li>
          <li>
            <span className="font-medium">Complimentary access</span> is set by an admin with an end date, and lands in the audit log.
          </li>
          <li>
            <span className="font-medium">Founding promotion:</span> {FOUNDING.months} free months for the first {FOUNDING.places} sign-ups,
            counted from approval so time spent in review is not lost. In this sample {founding.taken} of {founding.total} places are taken.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          This demo plugs in a test-mode provider with no network: its webhook is signed and verified like a real one, then
          written through the same function.
        </p>
      </Section>

      <Section id="moderation" step="Step 7" title="Moderation, reports and audit">
        <p>
          A moderator sees the photo and the video side by side, with the checklist and the country check beside them. They
          approve, reject with a reason the member will see, or flag for a second look, and they can leave internal notes.
          Admins can also suspend, ban, reinstate and give complimentary access.
        </p>
        <p>
          Reinstating restores the status a suspension interrupted, so a profile that was still pending goes back to the queue
          rather than straight to Approved. Members can report each other; three open reports hide a profile from everyone until
          a moderator has reviewed them. Every decision lands in the audit log with actor, action, target, reason and time.
        </p>
      </Section>

      <Section id="state" step="Step 8" title="How state works in this demo">
        <p>
          The demo has no database. The fictional seed data is in the code, and everything you change (your signup, decisions,
          notes, blocks, reports, audit entries) is kept in one encrypted, tamper-evident cookie (a JWE with AES-256-GCM). On
          every request the server rebuilds the state as seed plus your sandbox. That is why your changes are visible only in
          your browser, and why Reset demo is instant.
        </p>
        <p>
          In production the same policy functions would run on Postgres queries, and row-level security would enforce the
          same rule a second time inside the database, so a missed check in application code still returns nothing. The app
          connects as a role that owns no tables, because table owners skip row-level security.
        </p>
        <CodeBlock
          file="Production sketch: the isVisible rule as row-level security (tested on PostgreSQL 17)"
          language="sql"
          code={`-- Run as the table owner. The app connects as app_user, which owns nothing,
-- so row-level security always applies to it.
create function app_user_id() returns uuid language sql stable
  as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

-- Owner-only lookups, so the policy never reads profiles through itself.
create function viewer_is_approved() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from profiles
                       where id = app_user_id() and status = 'approved') $$;

create function hidden_from_viewer(target uuid) returns boolean
  language sql stable security definer set search_path = public
  as $$
    select exists (select 1 from blocks
                   where (blocker_id = app_user_id() and blocked_id = target)
                      or (blocked_id = app_user_id() and blocker_id = target))
        or (select count(*) from reports
            where target_id = target and reviewed_at is null) >= 3
  $$;

revoke all on function viewer_is_approved(), hidden_from_viewer(uuid) from public;
grant execute on function viewer_is_approved(), hidden_from_viewer(uuid) to app_user;

alter table profiles enable row level security;

create policy members_see_approved_members on profiles for select to app_user using (
  role = 'member'
  and status = 'approved'
  and approved_at is not null
  and id <> app_user_id()
  and viewer_is_approved()
  and not hidden_from_viewer(id)
);
-- Everyone can read their own row, for their own profile page.
create policy members_see_themselves on profiles for select to app_user
  using (id = app_user_id());`}
        />
      </Section>
    </div>
  );
}
