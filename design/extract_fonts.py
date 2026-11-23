#!/usr/bin/env python3
"""Copy the site's web fonts out of the Next.js build so Inkscape can set text in them.

next/font fetches Geist, Geist Mono and Source Serif 4 when the app is built and keeps the
latin files as WOFF2 in .next/static/media. Inkscape cannot read WOFF2, so this script opens
each file with macOS Core Text (through ctypes) and writes its tables back out as a plain
TrueType file in build/fonts/. Nothing is downloaded, and the fonts stay out of the repository:
they are only needed to render the PNGs.

Usage, from the repository root, after `pnpm build`:  python3 design/extract_fonts.py
"""

import ctypes
import glob
import os
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.join(ROOT, ".next", "static", "media")
OUT = os.path.join(ROOT, "build", "fonts")
FAMILIES = {"Geist": "Geist.ttf", "Geist Mono": "GeistMono.ttf", "Source Serif 4": "SourceSerif4.ttf"}

if sys.platform != "darwin":
    sys.exit("extract_fonts.py uses macOS Core Text to read WOFF2. Run it on a Mac.")

CF = ctypes.cdll.LoadLibrary("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation")
CT = ctypes.cdll.LoadLibrary("/System/Library/Frameworks/CoreText.framework/CoreText")
ptr = ctypes.c_void_p
for fn, res, args in [
    (CF.CFDataCreate, ptr, [ptr, ctypes.c_char_p, ctypes.c_long]),
    (CF.CFDataGetLength, ctypes.c_long, [ptr]),
    (CF.CFDataGetBytePtr, ptr, [ptr]),
    (CF.CFArrayGetCount, ctypes.c_long, [ptr]),
    (CF.CFArrayGetValueAtIndex, ptr, [ptr, ctypes.c_long]),
    (CF.CFStringGetCString, ctypes.c_bool, [ptr, ctypes.c_char_p, ctypes.c_long, ctypes.c_uint32]),
    (CT.CTFontManagerCreateFontDescriptorFromData, ptr, [ptr]),
    (CT.CTFontCreateWithFontDescriptor, ptr, [ptr, ctypes.c_double, ptr]),
    (CT.CTFontCopyFamilyName, ptr, [ptr]),
    (CT.CTFontCopyAvailableTables, ptr, [ptr, ctypes.c_uint32]),
    (CT.CTFontCopyTable, ptr, [ptr, ctypes.c_uint32, ctypes.c_uint32]),
]:
    fn.restype, fn.argtypes = res, args

UTF8 = 0x08000100


def open_font(path):
    """Returns (family name, {table tag: bytes}) for a WOFF2 file, as Core Text decodes it."""
    raw = open(path, "rb").read()
    desc = CT.CTFontManagerCreateFontDescriptorFromData(CF.CFDataCreate(None, raw, len(raw)))
    if not desc:
        return None, {}
    font = CT.CTFontCreateWithFontDescriptor(desc, 12.0, None)
    buf = ctypes.create_string_buffer(256)
    CF.CFStringGetCString(CT.CTFontCopyFamilyName(font), buf, 256, UTF8)
    tags = CT.CTFontCopyAvailableTables(font, 0)
    tables = {}
    for i in range(CF.CFArrayGetCount(tags)):
        tag = (CF.CFArrayGetValueAtIndex(tags, i) or 0).to_bytes(4, "big")
        data = CT.CTFontCopyTable(font, int.from_bytes(tag, "big"), 0)
        tables[tag.decode("latin-1")] = ctypes.string_at(CF.CFDataGetBytePtr(data), CF.CFDataGetLength(data))
    return buf.value.decode(), tables


def checksum(data):
    data += b"\0" * (-len(data) % 4)
    return sum(struct.unpack(">%dI" % (len(data) // 4), data)) & 0xFFFFFFFF


def truetype(tables):
    """Packs tables into a TrueType file: offset table, table records sorted by tag, 4-byte aligned data."""
    tags = sorted(tables)
    count = len(tags)
    selector = count.bit_length() - 1
    search = (1 << selector) * 16
    header = struct.pack(">IHHHH", 0x00010000, count, search, selector, count * 16 - search)
    offset = 12 + 16 * count
    records, body, head_at = b"", b"", 0
    for tag in tags:
        data = tables[tag]
        if tag == "head":  # checkSumAdjustment is computed over the whole file below
            data = data[:8] + b"\0\0\0\0" + data[12:]
            head_at = offset + len(body)
        records += struct.pack(">4sIII", tag.encode("latin-1"), checksum(data), offset + len(body), len(data))
        body += data + b"\0" * (-len(data) % 4)
    font = bytearray(header + records + body)
    font[head_at + 8 : head_at + 12] = struct.pack(">I", (0xB1B0AFBA - checksum(bytes(font))) & 0xFFFFFFFF)
    return bytes(font)


def main():
    # The latin subsets are the preloaded files (".p.woff2"); keep the newest per family.
    found = {}
    for path in sorted(glob.glob(os.path.join(MEDIA, "*.p.woff2")), key=os.path.getmtime):
        family, tables = open_font(path)
        if family in FAMILIES:
            found[family] = tables
    missing = sorted(set(FAMILIES) - set(found))
    if missing:
        sys.exit(f"No latin font file for {', '.join(missing)} in .next/static/media. Run `pnpm build` first.")
    os.makedirs(OUT, exist_ok=True)
    for family, tables in found.items():
        target = os.path.join(OUT, FAMILIES[family])
        with open(target, "wb") as f:
            f.write(truetype(tables))
        print(f"{family:15} -> {os.path.relpath(target, ROOT)}")
    with open(os.path.join(OUT, "fonts.conf"), "w") as f:
        f.write(
            '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n'
            f"  <dir>{OUT}</dir>\n  <cachedir>{os.path.join(OUT, 'cache')}</cachedir>\n</fontconfig>\n"
        )


if __name__ == "__main__":
    main()
