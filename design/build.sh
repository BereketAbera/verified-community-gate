#!/usr/bin/env bash
# Rebuilds every design asset from the scripts in design/ and exports the files the app serves
# with the Inkscape 1.4 command line. See DESIGN-NOTES.md for what each one is for.
#
# Needs: macOS (Core Text reads the web fonts), Python 3, Inkscape 1.4, and one `pnpm build`
# first, because the fonts come from next/font's build output. Usage: bash design/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."
INKSCAPE="${INKSCAPE:-/opt/homebrew/bin/inkscape}"

# 1. The site's own fonts (Geist, Geist Mono, Source Serif 4) as TrueType, for Inkscape only.
#    They land in build/fonts, which is not committed.
python3 design/extract_fonts.py
export FONTCONFIG_FILE="$PWD/build/fonts/fonts.conf"

# 2. Sources: build/brand/*.svg and build/diagram/*.svg, plus the two components that draw
#    inline (components/brand-mark.tsx, components/signed-link-diagram.tsx).
python3 design/make_brand.py
python3 design/make_diagram.py

# 3. Favicon: a plain SVG for current browsers, and favicon.ico (16, 32, 48 px) for the rest.
"$INKSCAPE" build/brand/favicon.svg --export-type=svg --export-plain-svg --export-filename=app/icon.svg
for size in 16 32 48; do
  "$INKSCAPE" build/brand/favicon.svg --export-type=png --export-width="$size" \
    --export-png-color-mode=RGBA_8 --export-png-compression=9 --export-filename="build/brand/favicon-$size.png"
done
python3 design/make_brand.py ico

# 4. Apple touch icon, 180 px, opaque (iOS rounds the corners itself).
"$INKSCAPE" build/brand/apple-icon.svg --export-type=png --export-width=180 \
  --export-png-color-mode=RGB_8 --export-png-compression=9 --export-filename=app/apple-icon.png

# 5. Social preview card, 1200 x 630, picked up by Next.js as the Open Graph image.
"$INKSCAPE" build/brand/og.svg --export-type=png --export-width=1200 \
  --export-png-color-mode=RGB_8 --export-png-compression=9 --export-filename=app/opengraph-image.png

# 6. The signed-link diagram at 2x for the README (912 units with its margin). The page draws the same diagram inline.
"$INKSCAPE" build/diagram/signed-link-wide.svg --export-type=png --export-width=1824 \
  --export-png-color-mode=RGB_8 --export-png-compression=9 --export-filename=design/signed-link-flow.png

ls -l app/icon.svg app/favicon.ico app/apple-icon.png app/opengraph-image.png design/signed-link-flow.png \
  components/brand-mark.tsx components/signed-link-diagram.tsx
