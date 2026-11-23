# Design notes

Four visual changes, each made for the people this sample is for: a founder whose product is trust and safety, and
the security reviewer they plan to bring in. Everything else on screen is unchanged apart from the copy and small
fixes listed at the end.

## 1. The mark: a photo beside a video

**What.** Two matching frames side by side: a portrait photo, with a head and shoulders cropped by the frame's bottom
edge, and a video frame with a play triangle. Both halves are built the same way, so the pair reads as two things being
compared rather than a contact card next to a play button. It replaces a stock shield-and-check icon in a teal tile.

**Where.** The header on every page (`components/brand-mark.tsx`, used in `components/site-header.tsx`), the favicon
(`app/icon.svg`, `app/favicon.ico`), the Apple touch icon (`app/apple-icon.png`) and the social card. The frames'
edges fall on whole pixels at the header's 40 px size. The favicon is a separate drawing on a 16-unit grid with
whole-unit edges, so it is sharp at 16, 32 and 48 px; at 16 px the two frames, the head and the triangle still show.

**Why.** The one manual step in this product is a moderator comparing a new member's video with their photo before
anyone can see them. The mark draws that step, so it says the same thing as the tagline ("video-checked by a person")
instead of borrowing a generic security symbol. It appears only where the product is named (header, browser tab, home
screen, link preview), never as an icon inside a screen. The same change removes stock icons that stood in for
identity: the icons above the four demo identity titles (the gavel read as punishment), the shield on "Show security
details" (the toggle now has a plain chevron; the key stays with the link countdown it reveals), and the sparkle on
"Fill with sample answers", which suggested automatic filling on the signup of a community that promises review by
people.

## 2. The signed-link diagram

**What.** A sequence diagram of a private photo or video request: the member's browser, the server and the media
route; the policy check before a link is issued; the signature check and the second policy check when it is used; and
where a request stops (no link, 403, 404). Teal arrows are the path when every check passes; a slashed circle marks
where a request stops. Box outlines use the site's border colour and the lifelines are the muted grey at 35%, so the
diagram's lines are no heavier than the card around it.

**Where.** The top of "Private media" on `/how-it-works#media` (`components/signed-link-diagram.tsx`). Three centred
lanes from 1024 px up. Below that, one column drawn at its natural size: the figure is at most 380 px wide, so on a
tablet the labels stay at the page's text size instead of being scaled up, and the caption is as wide as the diagram.
`design/signed-link-flow.png` is the same diagram for the README, with a margin and a thin frame so it reads as a card
on light and dark pages.

**Why.** Q2 in the post (how a private video is kept from anyone not approved) is one of the two questions at the heart
of the product, and both the Q2 answer and the home page's Q2 card link straight to this section. It used to open on
four code blocks. The diagram lets a non-engineer follow the rule in one look and repeat it to the security reviewer.
The numbered list under it says the same in words, and the code stays below for the reviewer. The diagram is inline
SVG, so its text uses the page's own fonts, stays sharp when zoomed and can be translated later; the figure carries a
short text summary for screen readers.

## 3. Social preview card

**What.** A 1200 x 630 image: the home page headline, and the same member, shown only by the initials HT, going from
"Pending review, hidden from everyone" to "Approved, visible to approved members" once a person has compared their
video and photo. Open Graph and Twitter card tags point to it. The labels are 26 to 30 px on the canvas so they stay
legible in a mid-sized preview, and there is no small print: a preview already shows the domain, and the card ends on
the demo's address.

**Where.** `app/opengraph-image.png` with `app/opengraph-image.alt.txt`; the tags are in `app/layout.tsx`. The pages
still ask search engines not to index them.

**Why.** The demo link is the main thing this sample hands over, and it is likely to be forwarded to a co-founder or the
security reviewer. It used to unfurl as a bare URL. The card says what the link proves before anyone opens it.
Initials keep faces out of the preview; the illustrated portraits inside the demo stay, because the photo-versus-video
comparison depends on them.

## 4. Where a new member is in review

**What.** A four-step strip at the top of the pending screens: Profile, Photo and video, A moderator compares them,
Visible to approved members. Finished steps show a check, the current step a teal ring with a dot, later steps an
empty dot. Each sits on a 4 px ring in the card colour, so the joining line stops the same distance from every step.
From 640 px up every step is labelled. On phones the row stays and only the current step is named under it ("Step 3
of 4: A moderator compares them"), which keeps each screen's main button within the first screen of a 390 x 844
phone. The status badge that sat under the title is gone from these two screens: the strip says the same thing, and
the top bar still shows the status. The signup pages count the same steps ("Step 1 of 4 · profile" on `/join`, "Step 2
of 4 · photo and video" on `/join/verify`).

**Where.** `components/gate-screens.tsx`: "Finish your verification" and "Your profile is under review", which a
pending account sees at `/members`; the eyebrows in `app/join/page.tsx` and `app/join/verify/page.tsx`.

**Why.** The first thing a reviewer is asked to try (sign up as "Your signup") lands here. A clock in a circle said
"wait" without saying for what. The strip shows what is done, that a person is comparing the photo and video now, and
what changes after approval, which is what members of a screened community ask while they wait. The current step has
its own plain marker rather than the mark, which stays on the brand surfaces. It is an ordered list with
`aria-current="step"`, so screen readers read every step in order on phones too.

## Copy fixes

- `/how-it-works`: the title and lead now name the two rules plainly ("How profiles stay hidden and media stays
  private"; links that expire in 60 seconds), and the step 3 and 4 headings are plain statements instead of three-beat
  slogans.
- Home: the Q3 card follows the post's own wording ("kept from seeing or being seen"), and the first fact says a
  block in either direction hides two members from each other.
- `/join`: the hint under Country describes the field ("Shown on your profile with your city").
- 404: "Page not found". Hidden and missing profiles still share this one page.
- Messages: Daniel's reply answers what Amara wrote instead of repeating it back.
- Home, "What to try" step 4: "open Lucía", not Daniel. Amara already has a conversation with Daniel, so his page
  shows "Open conversation" and no subscription prompt.
- Line breaks: page titles, the two home question titles and the How it works section headings are balanced, and page
  leads and the How it works sections use the browser's "pretty" wrapping, which avoids a lone word on the last line.
  "60 seconds" never splits across two lines.

## Small fixes

- The top bar's status, identity menu and "Reset demo" wrap onto a second line on screens narrower than 360 px
  instead of running off the edge.

## Not changed

- The R1 to R13 status pills on `/how-it-works#coverage` still use Tailwind's emerald, sky and violet. Recolouring them
  would have been a fifth visual change for a minor gain.

## Rebuilding the assets

Every asset is drawn by a script in `design/` (Python 3, standard library only) and exported with the Inkscape 1.4
command line. `design/build.sh` holds the exact commands.

```bash
pnpm build             # once: next/font fetches the web fonts the PNGs are set in
bash design/build.sh   # writes the files listed below
```

| Script | Writes |
| --- | --- |
| `design/extract_fonts.py` | `build/fonts/`: Geist, Geist Mono and Source Serif 4 as TrueType, read from the build's WOFF2 files with macOS Core Text so Inkscape can use them. Nothing is downloaded, and the fonts are not committed. |
| `design/make_brand.py` | `components/brand-mark.tsx`, and the sources for `app/icon.svg`, `app/favicon.ico` (the 16-unit favicon drawing), `app/apple-icon.png` and `app/opengraph-image.png` |
| `design/make_diagram.py` | `components/signed-link-diagram.tsx` and the source for `design/signed-link-flow.png`. The steps are a list at the top of the script. |

Change the drawing in the script and rerun `design/build.sh` rather than editing `components/brand-mark.tsx` or
`components/signed-link-diagram.tsx` by hand. Colours come from `app/globals.css`: teal `#165a5e`, paper `#faf9f6`,
ink `#1a222b`, grey `#5b646f`, tint `#e9f2f3`, border `#e0ded8`. Fainter lines are one of these at a lower opacity (the
diagram's lifelines, the approved tile's outline on the social card), never a new grey.
