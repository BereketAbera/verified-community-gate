# Trust gate demo

Verified community: hidden by default, video-checked by a person.

A small working sample of the trust and safety layer for a members-only community. Every new member is screened by a
moderator, who compares a short video with their photo before the profile is visible to anyone. Photos and videos have
no public URL. The hidden-by-default rules are enforced in one place and proved by automated tests.

Live demo: https://verified-community-gate.vercel.app

## What it proves

| Rule | Where to see it |
| --- | --- |
| **Video verification.** A photo plus a short video; a moderator compares them; the profile stays invisible until approved. Replacing the photo or video sends the profile back to review. | `/join`, `/join/verify`, `/me` |
| **Moderator dashboard.** Review queue, photo and video side by side, stated country against the country detected at signup, approve, reject with a reason, flag, internal notes, audit log. Moderators and admins have different permissions (only admins suspend, ban and reinstate). | `/moderate`, `/moderate/[id]`, `/moderate/audit` |
| **Private media.** Files live outside `public/`. They are served only by one route, through 60-second links signed with HMAC-SHA256 over the asset, the viewer and the expiry, and the access policy is checked again on every request. Members can set their photo and video to approved members or private. | `/api/media/[assetId]`, `/me` |
| **Hidden by default.** Pending, rejected, suspended, banned and blocked accounts never appear in search or messages, direct links return a real 404, and those accounts cannot see members or media themselves. | `/members`, `/members/[id]`, `/messages` |
| **Tests.** Table-driven unit tests over every status, viewer role and block direction, for search, member pages, messaging and media; signed-link tests; Playwright tests in a real browser. | `/tests` |

## Try it

There is no real sign-in. Pick a demo identity from the menu at the top of any page:

- **New member (pending):** sign up (18+ confirmation, versioned terms acceptance, and a separate, unticked consent for
  faith-related profile data), pick a sample photo and video, and see that search is empty and `/members/m02` is a 404.
- **Approved member:** browse and filter, open a profile, request to message, block. On `/me`, switch your photo or video
  between approved members and private, copy a signed link and open it after a minute, or replace your video and watch
  the profile go back to review.
- **Moderator:** open the queue, compare photo and video, approve, reject with a reason, flag, add notes, read the audit log.
- **Admin:** everything a moderator does, plus suspend, ban and reinstate.

**Reset demo** clears your changes.

## How it works

**One policy module.** Every read goes through `lib/policy.ts`: `isVisible(viewer, target)`, `listVisibleMembers(viewer, filters)`,
`canMessage(a, b)`, `canAccessMedia(viewer, asset)` and the staff permissions. Pages, route handlers and server actions
never filter on their own; when the policy says no, the page calls `notFound()`. State changes are pure functions in
`lib/domain.ts` that ask the same policy for permission.

**Signed media links.** `lib/media-signing.ts` issues `/api/media/<asset>?exp=<unix>&sig=<hmac>` only after
`canAccessMedia` allows it. The viewer is not in the URL: the media route recomputes the signature with the viewer from
the session, compares it in constant time, checks the expiry, then asks the policy again. Responses:

- `200` with `Cache-Control: private, no-store` (byte ranges supported for video),
- `403` for a missing, altered, expired or foreign signature,
- `404` when the signature is fine but the viewer may not know the file exists.

In a real build the same issuer would sign Cloudflare Stream tokens or Bunny.net token-authentication URLs instead;
`/how-it-works` shows the mapping.

**State without a database.** The fictional seed data lives in `lib/seed.ts`. Everything a visitor changes (their signup,
moderator decisions, notes, blocks, audit entries) is stored in their own sandbox: one httpOnly cookie, validated with zod
and sealed as a JWE (direct key, AES-256-GCM), so it is encrypted and tamper-evident. The audit log is capped at 25 entries
per visitor to keep the cookie small. On every request the server rebuilds the state as seed plus sandbox.

The sandbox exists only so the demo needs no database. In production the same policy functions would run on Postgres
queries, with row-level security enforcing the same rule a second time inside the database as defence in depth.

## Run it locally

Requires Node 20 or newer and pnpm.

```bash
pnpm install
pnpm dev            # http://localhost:3000, uses development-only secrets
```

For a production build, set two secrets first (never commit them):

```bash
cp .env.example .env.local
# fill both values with: openssl rand -hex 32
pnpm build && pnpm start
```

| Variable | Purpose |
| --- | --- |
| `MEDIA_SIGNING_SECRET` | HMAC key for media links |
| `SESSION_SECRET` | Key for the encrypted sandbox cookie |

## Tests and checks

```bash
pnpm test                                     # Vitest: policy matrix, signed links, sandbox, workflows
pnpm test:e2e                                 # Playwright against a local production build (port 4372)
BASE_URL=https://example.app pnpm test:e2e    # Playwright against a deployment
pnpm lint
pnpm typecheck
pnpm build                                    # runs the unit tests, then next build
```

`pnpm exec playwright install chromium` installs the browser the first time. `pnpm build` writes the unit test results
to `generated/`, and the `/tests` page lists every test from that run, with a visibility matrix built from the results.

## Project layout

```
app/                      routes, server actions (app/actions.ts) and the media route
lib/policy.ts             the single access policy
lib/domain.ts             state changes as pure functions
lib/media-signing.ts      signed link issue and verify
lib/sandbox*.ts           the per-visitor cookie sandbox
lib/seed.ts               fictional members, conversations and audit history
lib/server/               session, request gate, secrets (server only)
private-media/            sample photos and videos, outside public/
tests/unit/               Vitest suites
e2e/                      Playwright suites
scripts/generate-media.mjs  regenerates the sample media (needs ffmpeg and rsvg-convert)
```

## Limits of the demo

- Identities are switched from a menu; there is no authentication.
- New members pick from sample files instead of uploading or recording.
- Each visitor's changes live only in their own browser; nobody else sees them.
- Media is served from the app's own function. A real build would keep video with a provider and sign provider URLs.

Sample by Bereket A. · fictional people and media
