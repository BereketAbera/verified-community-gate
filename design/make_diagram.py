#!/usr/bin/env python3
"""Draws the signed-link diagram shown at the top of /how-it-works#media.

The steps are data (STEPS below), and two layouts are drawn from the same list:
- wide: three lanes (the member's browser, the server, the media route), shown from 1024 px up;
- narrow: one column with the lane named above each group, shown on phones and tablets.

Teal arrows are the path a request takes when every check passes. A slashed circle marks where it
is refused. Box outlines use the site's --border colour and the lifelines are the muted grey at 35%,
so the diagram's lines are no heavier than the card around it.

Writes components/signed-link-diagram.tsx (inline SVG that uses the page's own fonts, so the
text stays sharp and selectable) and build/diagram/signed-link-{wide,narrow}.svg with the font
names spelled out, a 16-unit margin and a thin frame, which design/build.sh renders to
design/signed-link-flow.png for the README.
Text widths come from build/fonts/Geist.ttf when design/extract_fonts.py has run; otherwise an
average glyph width is used. Standard library only.

Usage, from the repository root:  python3 design/make_diagram.py
"""

import json
import os
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEAL = "#165a5e"
INK = "#1a222b"
GREY = "#5b646f"
TINT = "#e9f2f3"
BORDER = "#e0ded8"  # --border
LIFELINE_OPACITY = "0.35"  # the lifelines are GREY at this opacity
CARD = "#ffffff"
PAD = 16  # margin around the standalone SVGs, so the README image does not touch its edges

LANES = ["Member's browser", "Server: page and policy", "Media route"]
BROWSER, SERVER, MEDIA = 0, 1, 2

# "send": an arrow from one lane to another. "check": a question on a lane, with the refusal
# when the answer is no. "do": an action on a lane, with a detail line.
STEPS = [
    {"kind": "send", "from": BROWSER, "to": SERVER, "text": "Opens a profile"},
    {"kind": "check", "lane": SERVER, "text": "May this viewer see this file?", "no": "No: no link is issued"},
    {"kind": "do", "lane": SERVER, "text": "Signs a link for this viewer", "note": "Expires in 60 s · HMAC-SHA256"},
    {"kind": "send", "from": SERVER, "to": BROWSER, "text": "Sends the page with the signed link"},
    {"kind": "send", "from": BROWSER, "to": MEDIA, "text": "Requests the file with its session", "note": "The viewer is not in the URL"},
    {"kind": "check", "lane": MEDIA, "text": "Signed for this viewer, not expired?", "no": "No: 403"},
    {"kind": "check", "lane": MEDIA, "text": "Policy asked again: still allowed?", "no": "No (suspended, private, blocked): 404"},
    {"kind": "send", "from": MEDIA, "to": BROWSER, "text": "Sends the file", "note": "200 · Cache-Control: private, no-store", "note_font": "mono"},
]
FOOTNOTE = (
    "A slashed circle marks where a request stops. An expired link gets 403; the page then asks for a fresh one, "
    "so the policy is asked again."
)
SUMMARY = (
    "Diagram of the signed-link flow. The server asks the policy before it issues a link, and the media route checks "
    "the signature and asks the policy again when the link is used. A request is refused with no link, with 403 for "
    "a wrong or expired signature, or with 404 when the policy says no. The same steps are listed below."
)
# On the page the footnote is the caption under the figure; the README image carries it inside.
CAPTION = FOOTNOTE

FONTS = {"serif": ("Source Serif 4", "font-heading"), "sans": ("Geist", "font-sans"), "mono": ("Geist Mono", "font-mono")}
LANE_SIZE, LABEL_SIZE, DETAIL_SIZE, MONO_SIZE = 16, 14, 13, 12
LINE = 17  # distance between the two lines of a label


# ---------------------------------------------------------------------------- text widths


def _font_tables(path):
    data = open(path, "rb").read()
    count = struct.unpack(">H", data[4:6])[0]
    tables = {}
    for i in range(count):
        tag, _, off, length = struct.unpack(">4sIII", data[12 + 16 * i : 28 + 16 * i])
        tables[tag.decode("latin-1")] = data[off : off + length]
    return tables


def _cmap(table):
    """Unicode BMP to glyph id, from the (3, 1) format 4 subtable."""
    for i in range(struct.unpack(">H", table[2:4])[0]):
        platform, encoding, off = struct.unpack(">HHI", table[4 + 8 * i : 12 + 8 * i])
        if (platform, encoding) != (3, 1) or struct.unpack(">H", table[off : off + 2])[0] != 4:
            continue
        segs = struct.unpack(">H", table[off + 6 : off + 8])[0] // 2
        arr = lambda start: struct.unpack(f">{segs}H", table[start : start + 2 * segs])
        ends = arr(off + 14)
        starts = arr(off + 16 + 2 * segs)
        deltas = arr(off + 16 + 4 * segs)
        ranges_at = off + 16 + 6 * segs
        ranges = arr(ranges_at)
        out = {}
        for s in range(segs):
            for code in range(starts[s], ends[s] + 1):
                if code == 0xFFFF:
                    continue
                if ranges[s] == 0:
                    out[code] = (code + deltas[s]) & 0xFFFF
                else:
                    at = ranges_at + 2 * s + ranges[s] + 2 * (code - starts[s])
                    gid = struct.unpack(">H", table[at : at + 2])[0]
                    out[code] = (gid + deltas[s]) & 0xFFFF if gid else 0
        return out
    return {}


def _measurer():
    path = os.path.join(ROOT, "build", "fonts", "Geist.ttf")
    if not os.path.exists(path):
        return None
    t = _font_tables(path)
    upem = struct.unpack(">H", t["head"][18:20])[0]
    metrics = struct.unpack(">H", t["hhea"][34:36])[0]
    advances = [struct.unpack(">H", t["hmtx"][4 * i : 4 * i + 2])[0] for i in range(metrics)]
    cmap = _cmap(t["cmap"])
    return lambda s: sum(advances[min(cmap.get(ord(c), 0), metrics - 1)] for c in s) / upem


_GEIST = _measurer()


def width(text, size, font="sans", weight=400):
    """Approximate advance width in px. Heavier weights run a little wider than the regular master."""
    if font == "mono":
        return len(text) * size * 0.6
    per_em = _GEIST(text) if _GEIST else len(text) * 0.53
    if font == "serif":
        per_em *= 1.04
    return per_em * size * (1.05 if weight >= 600 else 1.02 if weight >= 500 else 1.0)


def wrap(text, size, limit):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if line and width(trial, size) > limit:
            lines.append(line)
            line = word
        else:
            line = trial
    return lines + [line]


# ----------------------------------------------------------------------------- elements

WARNINGS = []


def num(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def el(tag, attrs, children=None):
    return (tag, attrs, children or [])


def txt(x, y, s, size, font="sans", weight=400, fill=INK, anchor="start", limit=None, spacing=None):
    if limit is not None and width(s, size, font, weight) > limit:
        WARNINGS.append(f"'{s}' is {width(s, size, font, weight):.0f} px wide, room for {limit:.0f}")
    attrs = {"@font": font, "x": x, "y": y, "font-size": size, "fill": fill}
    if weight != 400:
        attrs["font-weight"] = weight
    if anchor != "start":
        attrs["text-anchor"] = anchor
    if spacing:
        attrs["letter-spacing"] = spacing
    return el("text", attrs, [s])


def rect(x, y, w, h, rx, fill, stroke=None):
    attrs = {"x": x, "y": y, "width": w, "height": h, "rx": rx, "fill": fill}
    if stroke:
        attrs.update({"stroke": stroke, "stroke-width": 1})
    return el("rect", attrs)


def line(x1, y1, x2, y2, colour, dash=None, opacity=None):
    attrs = {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "stroke": colour, "stroke-width": 1.5}
    if opacity:
        attrs["stroke-opacity"] = opacity
    if dash:
        attrs["stroke-dasharray"] = dash
    return el("line", attrs)


def arrow(x1, y1, x2, y2):
    """A teal arrow; the head is a filled triangle whose tip sits on (x2, y2)."""
    head = 8
    if y1 == y2:
        d = 1 if x2 > x1 else -1
        tip, back = (x2, y2), x2 - d * head
        pts = [tip, (back, y2 - 4.5), (back, y2 + 4.5)]
        shaft = line(x1, y1, back, y2, TEAL)
    else:
        back = y2 - head
        pts = [(x2, y2), (x2 - 4.5, back), (x2 + 4.5, back)]
        shaft = line(x1, y1, x2, back, TEAL)
    poly = el("path", {"d": "M" + "L".join(f"{num(a)} {num(b)}" for a, b in pts) + "Z", "fill": TEAL})
    return [shaft, poly]


def refusal_icon(cx, cy):
    """A small circle with a slash: the request stops here."""
    return [
        el("circle", {"cx": cx, "cy": cy, "r": 5, "fill": "none", "stroke": GREY, "stroke-width": 1.5}),
        line(cx - 3.3, cy + 3.3, cx + 3.3, cy - 3.3, GREY),
    ]


def step_box(x, y, w, step):
    """A check or an action: the question or action, then the refusal or the detail in grey."""
    h = 56
    out = [rect(x, y, w, h, 8, CARD, BORDER), txt(x + 14, y + 23, step["text"], LABEL_SIZE, weight=500, limit=w - 28)]
    if step["kind"] == "check":
        out += refusal_icon(x + 20, y + 38.5)
        out.append(txt(x + 32, y + 43, step["no"], DETAIL_SIZE, fill=GREY, limit=w - 46))
    else:
        out.append(txt(x + 14, y + 43, step["note"], DETAIL_SIZE, fill=GREY, limit=w - 28))
    return out, h


def label_lines(step):
    lines = [(step["text"], LABEL_SIZE, "sans", INK)]
    if step.get("note"):
        font = step.get("note_font", "sans")
        lines.append((step["note"], MONO_SIZE if font == "mono" else DETAIL_SIZE, font, GREY))
    return lines


def send_label(cx, y, step, limit):
    """Label above a horizontal arrow, on a card-coloured patch so lifelines never run through text."""
    lines = label_lines(step)
    out = []
    for i, (s, sz, f, colour) in enumerate(lines):
        w = width(s, sz, f)
        base = y + 15 + LINE * i
        out.append(rect(cx - w / 2 - 6, base - sz + 1, w + 12, sz + 5, 3, CARD))
        out.append(txt(cx, base, s, sz, f, fill=colour, anchor="middle", limit=limit))
    return out, 15 + LINE * (len(lines) - 1)


# ------------------------------------------------------------------------------ layouts


def wide():
    w = 880
    lane_x = [150, 440, 730]  # centred: the lane pills leave 30 units on each side
    box_w = 276
    body, y = [], 64
    for step in STEPS:
        if step["kind"] == "send":
            a, b = lane_x[step["from"]], lane_x[step["to"]]
            parts, label_h = send_label((a + b) / 2, y, step, abs(b - a) - 24)
            arrow_y = y + label_h + 12
            body += parts + arrow(a, arrow_y, b - (2 if b > a else -2), arrow_y)
            y = arrow_y + 14
        else:
            parts, h = step_box(lane_x[step["lane"]] - box_w / 2, y, box_w, step)
            body += parts
            y += h + 12
    end = y - 2
    lanes = []
    for i, name in enumerate(LANES):
        lanes.append(line(lane_x[i], 40, lane_x[i], end, GREY, "3 5", LIFELINE_OPACITY))
        lanes.append(rect(lane_x[i] - 120, 0, 240, 40, 8, TINT))
        lanes.append(txt(lane_x[i], 26, name, LANE_SIZE, "serif", 600, anchor="middle", limit=224))
    foot, fy = [], end + 30
    for line_text in wrap(FOOTNOTE, DETAIL_SIZE, w - 60):
        foot.append(txt(30, fy, line_text, DETAIL_SIZE, fill=GREY))
        fy += LINE
    return w, end + 4, fy - 4, lanes + body, foot


def narrow():
    w, x0 = 340, 8
    inner = w - 2 * x0
    rail = x0 + 22  # vertical arrows run down this line
    body, y, lane = [], 0, None

    def pill(name):
        nonlocal y
        body.append(rect(x0, y, 220, 32, 8, TINT))
        body.append(txt(x0 + 12, y + 21.5, name, LANE_SIZE - 1, "serif", 600, limit=196))
        y += 32

    for i, step in enumerate(STEPS):
        if step["kind"] == "send":
            if lane != step["from"]:
                pill(LANES[step["from"]])
            lines = label_lines(step)
            h = 24 + LINE * len(lines)
            body += arrow(rail, y + 6, rail, y + h - 6)
            for j, (s, sz, f, colour) in enumerate(lines):
                body.append(txt(rail + 16, y + 13 + (h - LINE * len(lines)) / 2 + LINE * j, s, sz, f, fill=colour, limit=w - rail - 22))
            y += h
            pill(LANES[step["to"]])
            lane = step["to"]
            if i + 1 < len(STEPS) and STEPS[i + 1]["kind"] != "send":
                y += 8
        else:
            if lane != step["lane"]:
                pill(LANES[step["lane"]])
                lane = step["lane"]
                y += 8
            parts, h = step_box(x0, y, inner, step)
            body += parts
            y += h
            if i + 1 < len(STEPS) and STEPS[i + 1]["kind"] != "send":
                body += arrow(rail, y + 3, rail, y + 15)
                y += 18
    page_h, foot = y + 2, []
    y += 28
    for line_text in wrap(FOOTNOTE, DETAIL_SIZE, inner):
        foot.append(txt(x0, y, line_text, DETAIL_SIZE, fill=GREY))
        y += LINE
    return w, page_h, y - 4, body, foot


# ---------------------------------------------------------------------------- serialise

JSX_NAMES = {"class": "className"}


def jsx_name(name):
    if name in JSX_NAMES:
        return JSX_NAMES[name]
    head, *rest = name.split("-")
    return head + "".join(p.capitalize() for p in rest)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def render(node, mode, depth):
    tag, attrs, children = node
    pad = "  " * depth
    parts = []
    for key, value in attrs.items():
        if key == "@font":
            family, cls = FONTS[value]
            parts.append(f'className="{cls}"' if mode == "jsx" else f'font-family="{family}"')
            continue
        name = jsx_name(key) if mode == "jsx" else key
        if isinstance(value, (int, float)):
            parts.append(f"{name}={{{num(value)}}}" if mode == "jsx" else f'{name}="{num(value)}"')
        else:
            parts.append(f'{name}="{esc(value)}"')
    open_tag = f"<{tag} {' '.join(parts)}"
    if not children:
        return f"{pad}{open_tag} />" if mode == "jsx" else f"{pad}{open_tag}/>"
    if all(isinstance(c, str) for c in children):
        inner = "".join("{" + json.dumps(c, ensure_ascii=False) + "}" if mode == "jsx" else esc(c) for c in children)
        return f"{pad}{open_tag}>{inner}</{tag}>"
    inner = "\n".join(render(c, mode, depth + 1) for c in children)
    return f"{pad}{open_tag}>\n{inner}\n{pad}</{tag}>"


def standalone(w, h, nodes):
    """The diagram on a white card with a PAD margin and a 1-unit frame in the border colour."""
    body = "\n".join(render(n, "svg", 1) for n in nodes)
    fw, fh = w + 2 * PAD, h + 2 * PAD
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{num(fw)}" height="{num(fh)}" viewBox="{-PAD} {-PAD} {num(fw)} {num(fh)}">\n'
        f'  <rect x="{-PAD + 0.5}" y="{-PAD + 0.5}" width="{num(fw - 1)}" height="{num(fh - 1)}" rx="12" fill="{CARD}" stroke="{BORDER}"/>\n'
        f"{body}\n</svg>\n"
    )


def inline(w, h, nodes, class_name):
    body = "\n".join(render(n, "jsx", 5) for n in nodes)
    return (
        f'        <svg viewBox="0 0 {num(w)} {num(h)}" className="{class_name}" aria-hidden="true" focusable="false">\n'
        f"{body}\n        </svg>"
    )


COMPONENT = """// The signed-link flow for /how-it-works#media: where the policy is asked, where the signature
// is checked, and where a request is refused. Drawn by design/make_diagram.py from its STEPS
// list; change the steps there and run design/build.sh rather than editing this file.

const SUMMARY =
  {summary};

export function SignedLinkDiagram() {{
  return (
    <figure className="flex w-full max-w-[364px] flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:max-w-[380px] sm:p-5 lg:max-w-none" data-testid="signed-link-diagram">
      <div role="img" aria-label={{SUMMARY}}>
{wide}
{narrow}
      </div>
      <figcaption className="text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}}
"""


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    print(f"wrote {os.path.relpath(path, ROOT)}")


def main():
    ww, wh, wh_png, wide_nodes, wide_foot = wide()
    nw, nh, nh_png, narrow_nodes, narrow_foot = narrow()
    write(os.path.join(ROOT, "build", "diagram", "signed-link-wide.svg"), standalone(ww, wh_png, wide_nodes + wide_foot))
    write(os.path.join(ROOT, "build", "diagram", "signed-link-narrow.svg"), standalone(nw, nh_png, narrow_nodes + narrow_foot))
    write(
        os.path.join(ROOT, "components", "signed-link-diagram.tsx"),
        COMPONENT.format(
            summary=json.dumps(SUMMARY),
            wide=inline(ww, wh, wide_nodes, "hidden h-auto w-full lg:block"),
            narrow=inline(nw, nh, narrow_nodes, "block h-auto w-full lg:hidden"),
            caption=CAPTION,
        ),
    )
    if not _GEIST:
        print("note: build/fonts/Geist.ttf not found, text widths are estimates")
    for warning in WARNINGS:
        print(f"warning: {warning}", file=sys.stderr)


if __name__ == "__main__":
    main()
