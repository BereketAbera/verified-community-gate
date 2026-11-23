#!/usr/bin/env python3
"""Draws the mark, the favicon, the Apple touch icon and the social preview card.

The mark is the moderator's view in miniature: a portrait photo beside a video frame, the two
things a person compares before anyone can see a profile. Both halves are built the same way, a
frame with something inside it (a head and shoulders cropped by the frame's bottom edge, a play
triangle), so neither half outweighs the other. It is drawn on a 32-unit grid as one non-zero
path: each frame's inner edge runs the other way round, so the inside stays transparent. The
frames' edges, the triangle's corners and the top, bottom and sides of the head and shoulders sit
on multiples of 0.8 units, which are whole pixels at the header's 40 px.

The favicon is drawn separately on a 16-unit grid with whole-unit edges, so it is sharp at 16, 32
and 48 px instead of being the large mark scaled down onto half pixels.

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


def rounded_rect(x, y, w, h, r, ccw=False):
    """Clockwise by default; ccw=True runs the other way, which cuts a hole in a non-zero path."""
    if r == 0:
        if ccw:
            return f"M{num(x)} {num(y)}V{num(y + h)}H{num(x + w)}V{num(y)}Z"
        return f"M{num(x)} {num(y)}H{num(x + w)}V{num(y + h)}H{num(x)}Z"
    if ccw:
        return (
            f"M{num(x + r)} {num(y)}A{num(r)} {num(r)} 0 0 0 {num(x)} {num(y + r)}"
            f"V{num(y + h - r)}A{num(r)} {num(r)} 0 0 0 {num(x + r)} {num(y + h)}"
            f"H{num(x + w - r)}A{num(r)} {num(r)} 0 0 0 {num(x + w)} {num(y + h - r)}"
            f"V{num(y + r)}A{num(r)} {num(r)} 0 0 0 {num(x + w - r)} {num(y)}Z"
        )
    return (
        f"M{num(x + r)} {num(y)}H{num(x + w - r)}A{num(r)} {num(r)} 0 0 1 {num(x + w)} {num(y + r)}"
        f"V{num(y + h - r)}A{num(r)} {num(r)} 0 0 1 {num(x + w - r)} {num(y + h)}"
        f"H{num(x + r)}A{num(r)} {num(r)} 0 0 1 {num(x)} {num(y + h - r)}"
        f"V{num(y + r)}A{num(r)} {num(r)} 0 0 1 {num(x + r)} {num(y)}Z"
    )


def circle(cx, cy, r):
    return f"M{num(cx - r)} {num(cy)}A{num(r)} {num(r)} 0 1 0 {num(cx + r)} {num(cy)}A{num(r)} {num(r)} 0 1 0 {num(cx - r)} {num(cy)}Z"


def shoulders(cx, base, half_width, height):
    """Half an ellipse standing on `base`. The base sits inside the frame's bottom edge, so the
    shoulders run into the frame the way a portrait photo crops them."""
    return f"M{num(cx - half_width)} {num(base)}A{num(half_width)} {num(height)} 0 0 1 {num(cx + half_width)} {num(base)}Z"


def polygon(points):
    return "M" + "L".join(f"{num(x)} {num(y)}" for x, y in points) + "Z"


# The glyph on the 32-unit grid: photo on the left, video on the right, 3.2 units apart, both
# 12.8 by 17.6 (close to the 3:4 of the member portraits), centred on (16, 16). At 40 px one
# unit is 1.25 px, so every value below that is a multiple of 0.8 lands on a whole pixel.
PHOTO = (1.6, 7.2, 12.8, 17.6)
VIDEO = (17.6, 7.2, 12.8, 17.6)
CORNER, INNER_CORNER, FRAME = 2.4, 0.8, 2.4
HEAD = (8.0, 13.6, 2.4)  # centre x, centre y, radius
SHOULDERS = (8.0, 23.2, 4.0, 5.6)  # centre x, base (inside the bottom edge), half-width, height
PLAY = [(22.4, 12.8), (22.4, 19.2), (27.2, 16.0)]


def frame(x, y, w, h):
    return rounded_rect(x, y, w, h, CORNER) + rounded_rect(x + FRAME, y + FRAME, w - 2 * FRAME, h - 2 * FRAME, INNER_CORNER, ccw=True)


def glyph():
    """Two frames of the same build: a head and shoulders in the photo, a play triangle in the video."""
    return "".join([frame(*PHOTO), circle(*HEAD), shoulders(*SHOULDERS), frame(*VIDEO), polygon(PLAY)])


def favicon_glyph():
    """The same drawing fitted to a 16-unit grid: two 6 by 8 frames with a 1-unit edge, 2 units
    apart, a head and shoulders in the left one and a play triangle in the right."""
    def tile(x):
        return rounded_rect(x, 4, 6, 8, 1) + rounded_rect(x + 1, 5, 4, 6, 0, ccw=True)

    return "".join([tile(1), circle(4, 7, 1), shoulders(4, 11.5, 2, 2.5), tile(9), polygon([(11, 6), (11, 10), (13, 8)])])


def svg(width, height, body, view_box=None):
    vb = view_box or f"0 0 {width} {height}"
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{vb}">\n{body}</svg>\n'


def mark_svg():
    return svg(32, 32, f'  <path fill="currentColor" d="{glyph()}"/>\n')


def favicon_svg():
    return svg(
        16,
        16,
        f'  <rect width="16" height="16" rx="3.5" fill="{TEAL}"/>\n'
        f'  <path fill="{PAPER}" d="{favicon_glyph()}"/>\n',
    )


def apple_icon_svg():
    # iOS rounds the corners itself and fills transparency with black, so the tile is a full square.
    return svg(
        180,
        180,
        f'  <rect width="32" height="32" fill="{TEAL}"/>\n'
        f'  <path fill="{PAPER}" transform="translate(16 16) scale(0.7) translate(-16 -16)" d="{glyph()}"/>\n',
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
        card = f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{TINT}" stroke="{TEAL}" stroke-opacity="0.25" stroke-width="1.5"/>\n'
        colour = TEAL
    return card + text(x + w / 2, y + h / 2 + 14, "HT", 40, "Source Serif 4", 600, colour, "middle", "1")


def og_svg():
    """1200 x 630. Text that has to survive a small link preview (about 300 px wide) is 26 px or more."""
    w, h = 1200, 630
    body = [f'  <rect width="{w}" height="{h}" fill="{PAPER}"/>\n']
    # Mark and name, top left.
    body.append(f'  <path fill="{TEAL}" transform="translate(72 52) scale(1.5)" d="{glyph()}"/>\n')
    body.append(text(134, 88, "Trust gate demo", 30, "Source Serif 4", 600))
    # Headline, the home page's first line.
    for i, line in enumerate(["Nobody is visible", "until a person has", "checked their video."]):
        body.append(text(72, 240 + i * 72, line, 60, "Source Serif 4", 600))
    # Right: the same member before and after review.
    px, top, pw, ph = 734, 120, 105, 140
    lx = px + pw + 26
    body.append(portrait(px, top, pw, ph, pending=True))
    body.append(text(lx, top + 56, "Pending review", 30, weight=600))
    body.append(text(lx, top + 94, "Hidden from everyone", 26, fill=GREY))
    ax, a0, a1 = px + pw / 2, top + ph + 14, top + ph + 92
    body.append(f'  <path d="M{num(ax)} {num(a0)}V{num(a1 - 9)}" stroke="{TEAL}" stroke-width="2.5" stroke-linecap="round" fill="none"/>\n')
    body.append(f'  <path d="{polygon([(ax - 7, a1 - 11), (ax + 7, a1 - 11), (ax, a1)])}" fill="{TEAL}"/>\n')
    body.append(text(lx, a0 + 32, "A person compares", 26, fill=TEAL, weight=500))
    body.append(text(lx, a0 + 64, "video and photo", 26, fill=TEAL, weight=500))
    top2 = a1 + 14
    body.append(portrait(px, top2, pw, ph, pending=False))
    body.append(text(lx, top2 + 56, "Approved", 30, weight=600))
    body.append(text(lx, top2 + 94, "Visible to approved", 26, fill=GREY))
    body.append(text(lx, top2 + 126, "members", 26, fill=GREY))
    # Bottom left: where the demo lives. A preview already shows the domain, so nothing smaller.
    body.append(text(72, 560, "verified-community-gate.vercel.app", 24, "Geist Mono", 500, TEAL))
    return svg(w, h, "".join(body))


COMPONENT = """// The mark: a portrait photo beside a video frame, the two things a moderator compares
// before a profile becomes visible. Path data from design/make_brand.py; change the shapes
// there and run design/build.sh rather than editing this file.
export function BrandMark({{ className }}: {{ className?: string }}) {{
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false" className={{className}}>
      <path d="{d}" />
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
