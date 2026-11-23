# Design notes

Four visual changes, each made for the people this sample is for: a founder whose product is trust and safety, and
the security reviewer they plan to bring in. Everything else on screen is unchanged apart from the copy fixes listed
at the end.

## 1. The mark: a photo beside a video

**What.** A small drawing of a portrait photo next to a video frame. It replaces a stock shield-and-check icon in a
teal tile.

**Where.** The header on every page (`components/brand-mark.tsx`, used in `components/site-header.tsx`), the favicon
(`app/icon.svg`, `app/favicon.ico`) and the Apple touch icon (`app/apple-icon.png`). The favicon uses a heavier cut of
the same drawing (thicker frame, bigger head and shoulders) so it still reads at 16 to 32 px.

**Why.** The one manual step in this product is a moderator comparing a new member's video with their photo before
anyone can see them. The mark draws that step, so it says the same thing as the tagline ("video-checked by a person")
instead of borrowing a generic security symbol. The same change removes stock icons that stood in for identity: the
icons above the four demo identity titles (the gavel read as punishment), the shield on "Show security details" (it
now has the key used beside the link countdown), and the sparkle on "Fill with sample answers", which suggested
automatic filling on the signup of a community that promises review by people.

## 2. The signed-link diagram

**What.** A sequence diagram of a private photo or video request: the member's browser, the server and the media
route; the policy check before a link is issued; the signature check and the second policy check when it is used; and
where a request stops (no link, 403, 404). Teal is the path when every check passes, grey is where it stops.

**Where.** The top of "Private media" on `/how-it-works#media` (`components/signed-link-diagram.tsx`). Three lanes from
1024 px up, one column on phones and tablets. `design/signed-link-flow.png` is the same diagram for the README.

**Why.** Q2 in the post (how a private video is kept from anyone not approved) is one of the two questions at the heart
of the product, and both the Q2 answer and the home page's Q2 card link straight to this section. It used to open on
four code blocks. The diagram lets a non-engineer follow the rule in one look and repeat it to the security reviewer.
The numbered list under it says the same in words, and the code stays below for the reviewer. The diagram is inline
SVG, so its text uses the page's own fonts, stays sharp when zoomed and can be translated later; the figure carries a
short text summary for screen readers.

## 3. Social preview card

**What.** A 1200 x 630 image: the home page headline, and the same member, shown only by the initials HT, going from
"Pending review, hidden from everyone" to "Approved, visible to approved members" once a person has compared their
video and photo. Open Graph and Twitter card tags point to it.

**Where.** `app/opengraph-image.png` with `app/opengraph-image.alt.txt`; the tags are in `app/layout.tsx`. The pages
still ask search engines not to index them.

**Why.** The demo link is the main thing this sample hands over, and it is likely to be forwarded to a co-founder or the
security reviewer. It used to unfurl as a bare URL. The card says what the link proves before anyone opens it.
Initials keep faces out of the preview; the illustrated portraits inside the demo stay, because the photo-versus-video
comparison depends on them.

## 4. Where a new member is in review

**What.** A four-step strip at the top of the pending screens: Profile, Photo and video, A moderator compares them,
Visible to approved members. Finished steps show a check, the current step shows the mark, later steps an empty dot.
On phones it is a vertical list.

**Where.** `components/gate-screens.tsx`: "Finish your verification" and "Your profile is under review", which a
pending account sees at `/members`.

**Why.** The first thing a reviewer is asked to try (sign up as "Your signup") lands here. A clock in a circle said
"wait" without saying for what. The strip shows what is done, that a person is comparing the photo and video now, and
what changes after approval, which is what members of a screened community ask while they wait. It is an ordered list
with `aria-current="step"`, so screen readers read it in order.

## Copy fixes

- `/how-it-works`: the title and lead now name the two rules plainly ("How profiles stay hidden and media stays
  private"; links that expire in 60 seconds), and the step 3 and 4 headings are plain statements instead of three-beat
  slogans.
- Home: the Q3 card follows the post's own wording ("kept from seeing or being seen"), and the first fact says a
  block in either direction hides two members from each other.
- `/join`: the hint under Country describes the field ("Shown on your profile with your city").
- 404: "Page not found". Hidden and missing profiles still share this one page.
- Messages: Daniel's reply now follows what Amara actually wrote.

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
| `design/make_brand.py` | `components/brand-mark.tsx`, and the sources for `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` and `app/opengraph-image.png` |
| `design/make_diagram.py` | `components/signed-link-diagram.tsx` and the source for `design/signed-link-flow.png`. The steps are a list at the top of the script. |

Change the drawing in the script and rerun `design/build.sh` rather than editing `components/brand-mark.tsx` or
`components/signed-link-diagram.tsx` by hand. Colours come from `app/globals.css`: teal `#165a5e`, paper `#faf9f6`,
ink `#1a222b`, grey `#5b646f`, tint `#e9f2f3`.
