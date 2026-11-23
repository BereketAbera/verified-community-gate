#!/usr/bin/env python3
"""Draws the mark, the favicon, the Apple touch icon and the social preview card.

The mark is the moderator's view in miniature: a portrait photo beside a video frame, the two
things a person compares before anyone can see a profile. It is drawn on a 32-unit grid as one
even-odd path, so the cut-outs (head, shoulders, the inside of the video frame) stay transparent.

Writes the sources to build/brand/ and the React component to components/brand-mark.tsx.
design/build.sh then exports the files the app serves with Inkscape. Standard library only.

Usage, from the repository root:
  python3 design/make_brand.py        write the SVG sources and the component
  python3 design/make_brand.py ico    pack build/brand/favicon-{16,32,48}.png into app/favicon.ico
"""

import os
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build", "brand")

# Palette from app/globals.css.
TEAL = "#165a5e"  # --primary
PAPER = "#faf9f6"  # --background
INK = "#1a222b"  # --foreground
GREY = "#5b646f"  # muted text, refusals
TINT = "#e9f2f3"  # --secondary, approved card


def num(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def rounded_rect(x, y, w, h, r):
    return (
        f"M{num(x + r)} {num(y)}H{num(x + w - r)}A{num(r)} {num(r)} 0 0 1 {num(x + w)} {num(y + r)}"
        f"V{num(y + h - r)}A{num(r)} {num(r)} 0 0 1 {num(x + w - r)} {num(y + h)}"
        f"H{num(x + r)}A{num(r)} {num(r)} 0 0 1 {num(x)} {num(y + h - r)}"
        f"V{num(y + r)}A{num(r)} {num(r)} 0 0 1 {num(x + r)} {num(y)}Z"
    )


def circle(cx, cy, r):
    return f"M{num(cx - r)} {num(cy)}A{num(r)} {num(r)} 0 1 0 {num(cx + r)} {num(cy)}A{num(r)} {num(r)} 0 1 0 {num(cx - r)} {num(cy)}Z"


def shoulders(cx, base, half_width, height):
    return f"M{num(cx - half_width)} {num(base)}A{num(half_width)} {num(height)} 0 0 1 {num(cx + half_width)} {num(base)}Z"


def polygon(points):
    return "M" + "L".join(f"{num(x)} {num(y)}" for x, y in points) + "Z"


# The glyph on the 32-unit grid: photo on the left, video on the right, 3 units apart,
# both 13 by 17 (close to the 3:4 of the member portraits), centred on (16, 16).
PHOTO = (1.5, 7.5, 13, 17)
VIDEO = (17.5, 7.5, 13, 17)
CORNER = 2.6

# Two weights of the same drawing. The small one has a thicker frame, a bigger head and a
# smaller play triangle with more room around it, so the favicon still reads at 16 to 32 px.
REGULAR = {"frame": 2.2, "head": 2.5, "head_y": 13.4, "shoulders": (4.4, 3.8), "play": [(22.3, 13.3), (22.3, 18.7), (26.7, 16.0)]}
SMALL = {"frame": 2.8, "head": 2.9, "head_y": 13.2, "shoulders": (4.7, 4.0), "play": [(22.1, 13.0), (22.1, 19.0), (26.3, 16.0)]}


def glyph(weight=REGULAR):
    """The photo with a head and shoulders cut out, and the video frame with a play triangle."""
    px, py, pw, ph = PHOTO
    vx, vy, vw, vh = VIDEO
    cx, frame = px + pw / 2, weight["frame"]
    return "".join(
        [
            rounded_rect(px, py, pw, ph, CORNER),
            circle(cx, weight["head_y"], weight["head"]),
            shoulders(cx, 22.5, *weight["shoulders"]),
            rounded_rect(vx, vy, vw, vh, CORNER),
            rounded_rect(vx + frame, vy + frame, vw - 2 * frame, vh - 2 * frame, 0.6),
            polygon(weight["play"]),
        ]
    )


def svg(width, height, body, view_box=None):
    vb = view_box or f"0 0 {width} {height}"
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{vb}">\n{body}</svg>\n'


def mark_svg():
    return svg(32, 32, f'  <path fill="currentColor" fill-rule="evenodd" d="{glyph()}"/>\n')


def favicon_svg():
    return svg(
        32,
        32,
        f'  <rect width="32" height="32" rx="7" fill="{TEAL}"/>\n'
        f'  <path fill="{PAPER}" fill-rule="evenodd" transform="translate(16 16) scale(0.82) translate(-16 -16)" d="{glyph(SMALL)}"/>\n',
    )


def apple_icon_svg():
    # iOS rounds the corners itself and fills transparency with black, so the tile is a full square.
    return svg(
        180,
        180,
        f'  <rect width="32" height="32" fill="{TEAL}"/>\n'
        f'  <path fill="{PAPER}" fill-rule="evenodd" transform="translate(16 16) scale(0.7) translate(-16 -16)" d="{glyph()}"/>\n',
        view_box="0 0 32 32",
    )


def text(x, y, content, size, family="Geist", weight=400, fill=INK, anchor="start", spacing=None):
    extra = f' letter-spacing="{spacing}"' if spacing else ""
    return (
        f'  <text x="{num(x)}" y="{num(y)}" font-family="{family}" font-weight="{weight}" font-size="{size}"'
        f' fill="{fill}" text-anchor="{anchor}"{extra}>{content}</text>\n'
    )


def portrait(x, y, w, h, pending):
    """An abstract 3:4 portrait card with initials only, no face."""
    if pending:
        card = f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="none" stroke="{GREY}" stroke-width="2" stroke-dasharray="7 6"/>\n'
        colour = GREY
    else:
        card = f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{TINT}" stroke="#c4d8d9" stroke-width="1.5"/>\n'
        colour = TEAL
    return card + text(x + w / 2, y + h / 2 + 14, "HT", 40, "Source Serif 4", 600, colour, "middle", "1")


def og_svg():
    w, h = 1200, 630
    body = [f'  <rect width="{w}" height="{h}" fill="{PAPER}"/>\n']
    # Mark and name, top left.
    body.append(f'  <path fill="{TEAL}" fill-rule="evenodd" transform="translate(72 52) scale(1.5)" d="{glyph()}"/>\n')
    body.append(text(134, 88, "Trust gate demo", 30, "Source Serif 4", 600))
    # Headline, the home page's first line.
    for i, line in enumerate(["Nobody is visible", "until a person has", "checked their video."]):
        body.append(text(72, 240 + i * 72, line, 60, "Source Serif 4", 600))
    # Right: the same member before and after review.
    px, top, pw, ph = 734, 132, 105, 140
    lx = px + pw + 26
    body.append(portrait(px, top, pw, ph, pending=True))
    body.append(text(lx, top + 58, "Pending review", 24, weight=600))
    body.append(text(lx, top + 90, "Hidden from everyone", 21, fill=GREY))
    ax, a0, a1 = px + pw / 2, top + ph + 16, top + ph + 84
    body.append(f'  <path d="M{num(ax)} {num(a0)}V{num(a1 - 9)}" stroke="{TEAL}" stroke-width="2.5" stroke-linecap="round" fill="none"/>\n')
    body.append(f'  <path d="{polygon([(ax - 7, a1 - 11), (ax + 7, a1 - 11), (ax, a1)])}" fill="{TEAL}"/>\n')
    body.append(text(lx, a0 + 27, "A person compares", 20, fill=TEAL, weight=500))
    body.append(text(lx, a0 + 53, "video and photo", 20, fill=TEAL, weight=500))
    top2 = a1 + 16
    body.append(portrait(px, top2, pw, ph, pending=False))
    body.append(text(lx, top2 + 58, "Approved", 24, weight=600))
    body.append(text(lx, top2 + 90, "Visible to approved members", 21, fill=GREY))
    # Bottom left: where the demo lives and the footer wording.
    body.append(text(72, 530, "verified-community-gate.vercel.app", 22, "Geist Mono", 500, TEAL))
    body.append(text(72, 566, "Sample by Bereket A. · fictional people and media", 19, fill=GREY))
    return svg(w, h, "".join(body))


COMPONENT = """// The mark: a portrait photo beside a video frame, the two things a moderator compares
// before a profile becomes visible. Path data from design/make_brand.py; change the shapes
// there and run design/build.sh rather than editing this file.
export function BrandMark({{ className }}: {{ className?: string }}) {{
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false" className={{className}}>
      <path
        fillRule="evenodd"
        d="{d}"
      />
    </svg>
  );
}}
"""


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    print(f"wrote {os.path.relpath(path, ROOT)}")


def pack_ico():
    """Packs PNGs into one .ico (PNG-in-ICO, read by every current browser)."""
    sizes = [16, 32, 48]
    images = [open(os.path.join(OUT, f"favicon-{s}.png"), "rb").read() for s in sizes]
    header = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries = b""
    for size, data in zip(sizes, images):
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    target = os.path.join(ROOT, "app", "favicon.ico")
    with open(target, "wb") as f:
        f.write(header + entries + b"".join(images))
    print(f"wrote {os.path.relpath(target, ROOT)}")


def main():
    if sys.argv[1:] == ["ico"]:
        pack_ico()
        return
    write(os.path.join(OUT, "mark.svg"), mark_svg())
    write(os.path.join(OUT, "favicon.svg"), favicon_svg())
    write(os.path.join(OUT, "apple-icon.svg"), apple_icon_svg())
    write(os.path.join(OUT, "og.svg"), og_svg())
    write(os.path.join(ROOT, "components", "brand-mark.tsx"), COMPONENT.format(d=glyph()))


if __name__ == "__main__":
    main()
