import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { PageTitle } from "@/components/page-title";
import { excerpt } from "@/lib/server/excerpt";

export const metadata: Metadata = { title: "How it works" };

const STATUS_ROWS: Array<[string, boolean, string, boolean, boolean]> = [
  ["Approved", true, "Opens", true, true],
  ["Pending review", false, "404", false, false],
  ["Rejected", false, "404", false, false],
  ["Suspended", false, "404", false, false],
  ["Banned", false, "404", false, false],
  ["Blocked, either direction", false, "404", false, false],
];

function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-emerald-800"><Check className="size-4" aria-hidden />Yes</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="size-4" aria-hidden />No</span>
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

export default async function HowItWorksPage() {
  const [isVisible, canMessage, canAccessMedia, sign, verify, route] = await Promise.all([
    excerpt("lib/policy.ts", "isVisible"),
    excerpt("lib/policy.ts", "canMessage"),
    excerpt("lib/policy.ts", "canAccessMedia"),
    excerpt("lib/media-signing.ts", "sign"),
    excerpt("lib/media-signing.ts", "verify"),
    excerpt("app/api/media/[assetId]/route.ts", "route"),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <PageTitle eyebrow="How it works" title="One gate, short-lived links, a person in the loop">
        Three ideas carry the whole demo. Every read asks one policy module. Media is reachable only through a link that
        expires in a minute and is checked again when used. And nobody becomes visible until a moderator has looked.
      </PageTitle>

      <nav aria-label="On this page" className="grid gap-2 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10 sm:grid-cols-3">
        {[
          ["#gate", "1. One gate for every read"],
          ["#hidden", "2. Hidden by default"],
          ["#media", "3. Private media"],
          ["#providers", "4. Real video providers"],
          ["#moderation", "5. Moderation and audit"],
          ["#state", "6. How state works here"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">{label}</a>
        ))}
      </nav>

      <Section id="gate" step="1" title="One gate for every read">
        <p>
          Search, member pages, messages, media and the moderation screens all call <code className="font-mono text-sm">lib/policy.ts</code>.
          Pages never filter on their own. When the policy says no, the page calls <code className="font-mono text-sm">notFound()</code>,
          so a hidden profile looks exactly like one that never existed.
        </p>
        <CodeBlock file="lib/policy.ts" code={isVisible} />
        <p>Messaging needs the rule to hold in both directions, so a block on either side ends the conversation for both.</p>
        <CodeBlock file="lib/policy.ts" code={canMessage} />
      </Section>

      <Section id="hidden" step="2" title="Hidden by default">
        <p>What an approved member sees of other accounts, by status. Accounts in any row but the first also see nobody themselves.</p>
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
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
              {STATUS_ROWS.map(([label, search, link, messages, sees]) => (
                <tr key={label} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{label}</td>
                  <td className="px-4 py-2"><YesNo value={search} /></td>
                  <td className="px-4 py-2">{link === "404" ? <span className="font-mono text-muted-foreground">404</span> : <span className="text-emerald-800">Opens</span>}</td>
                  <td className="px-4 py-2"><YesNo value={messages} /></td>
                  <td className="px-4 py-2"><YesNo value={sees} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Every cell is an automated check, for each viewer role and block direction. <Link href="/tests" className="font-medium text-primary underline-offset-4 hover:underline">See the tests</Link>.
        </p>
      </Section>

      <Section id="media" step="3" title="Private media: signed, short-lived, checked twice">
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>The files live in <code className="font-mono text-sm">private-media/</code>, outside <code className="font-mono text-sm">public/</code>. No URL points at them.</li>
          <li>When a page needs a photo or video, it asks the policy first. Only if the answer is yes does the server issue a link: an HMAC-SHA256 over the asset id, the viewer and an expiry 60 seconds away.</li>
          <li>The viewer is not in the URL. The media route takes the viewer from the session and recomputes the signature, so a copied link fails for anyone else, including a signed-out browser.</li>
          <li>The route then asks the policy again. If the owner was suspended, went private or blocked the viewer in the meantime, the answer is 404.</li>
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

      <Section id="providers" step="4" title="The same issuer with a real video provider">
        <p>
          In production the files would sit with a video provider rather than on the app server. The policy check and the
          issuer stay exactly where they are; only the signer changes.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <span className="font-medium">Cloudflare Stream.</span> Turn on <span className="font-mono text-sm">requireSignedURLs</span> for every video.
            After <span className="font-mono text-sm">canAccessMedia</span> says yes, sign a short JWT with a Stream signing key
            (<span className="font-mono text-sm">sub</span> is the video id, <span className="font-mono text-sm">exp</span> one minute out, optional access rules),
            or ask the Stream token endpoint for one. The token takes the place of the video id in the playback URL.
          </li>
          <li>
            <span className="font-medium">Bunny.net.</span> Turn on token authentication for the Stream library or pull zone. The
            server hashes the security key with the video id or path and the expiry (SHA-256), and appends <span className="font-mono text-sm">token</span> and
            <span className="font-mono text-sm"> expires</span> to the URL. Bunny&apos;s edge refuses anything expired or altered.
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

      <Section id="moderation" step="5" title="Moderation and audit">
        <p>
          A moderator sees the photo and the video side by side, with the country the member stated next to the country their
          connection came from at signup. They approve, reject with a reason the member will see, or flag for a second look,
          and they can leave internal notes. Admins can also suspend, ban and reinstate.
        </p>
        <p>
          Approval takes effect on the next request: there is no cache between the decision and the policy. Replacing a photo
          or video puts the profile straight back into the queue and out of sight. Every decision lands in the audit log with
          actor, action, target, reason and time.
        </p>
      </Section>

      <Section id="state" step="6" title="How state works in this demo">
        <p>
          The demo has no database. The fictional seed data is in the code, and everything you change (your signup, decisions,
          notes, blocks, audit entries) is kept in one encrypted, tamper-evident cookie (a JWE with AES-256-GCM). On every
          request the server rebuilds the state as seed plus your sandbox. That is why your changes are visible only in your
          browser, and why Reset demo is instant.
        </p>
        <p>
          In production the same policy functions would run on Postgres queries, and row-level security would enforce the
          same rule a second time inside the database, so a missed check in application code still returns nothing.
        </p>
        <CodeBlock
          file="Production sketch: the isVisible rule as a row-level security policy"
          language="sql"
          code={`alter table profiles enable row level security;

create policy approved_see_approved on profiles for select using (
  status = 'approved'
  and id <> current_setting('app.user_id')::uuid
  and exists (
    select 1 from profiles me
    where me.id = current_setting('app.user_id')::uuid and me.status = 'approved'
  )
  and not exists (
    select 1 from blocks b
    where (b.blocker_id = current_setting('app.user_id')::uuid and b.blocked_id = profiles.id)
       or (b.blocked_id = current_setting('app.user_id')::uuid and b.blocker_id = profiles.id)
  )
);`}
        />
      </Section>
    </div>
  );
}
