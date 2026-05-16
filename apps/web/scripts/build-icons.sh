#!/usr/bin/env bash
# Generate the committed PWA icon set in apps/web/public/ from sources in
# apps/web/src/assets/. Reproducible: re-running yields identical output.
#
# Requires: ImageMagick 7 (`magick`), Python 3.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$APP_DIR/src/assets"
OUT="$APP_DIR/public"
BG="#0C0D0F"

mkdir -p "$OUT"

# ── favicon.svg — quadratic-viewBox wrapper around favicon-mark.svg ─────────
python3 - "$SRC/favicon-mark.svg" "$OUT/favicon.svg" <<'PY'
import re, sys
src, dst = sys.argv[1], sys.argv[2]
with open(src) as f:
    svg = f.read()
m = re.search(r'viewBox="([\-\d.\s]+)"', svg)
x0, y0, w, h = map(float, m.group(1).split())
side = max(w, h)
dx = (side - w) / 2 - x0
dy = (side - h) / 2 - y0
inner = re.search(r'<svg[^>]*>(.*)</svg>', svg, re.S).group(1)
out = (
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side:g} {side:g}">\n'
    f'  <g transform="translate({dx:g},{dy:g})">{inner}</g>\n'
    '</svg>\n'
)
with open(dst, 'w') as f:
    f.write(out)
PY

# ── favicon.ico — multi-resolution (16/32/48) ───────────────────────────────
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for s in 16 32 48; do
    magick "$SRC/favicon-512.png" \
        -background none -resize "${s}x${s}" \
        -gravity center -extent "${s}x${s}" \
        "$TMP/fav-${s}.png"
done
magick "$TMP/fav-16.png" "$TMP/fav-32.png" "$TMP/fav-48.png" "$OUT/favicon.ico"

# ── any-purpose icons: pad to square on transparent background ──────────────
for s in 192 512; do
    magick "$SRC/favicon-${s}.png" \
        -background none -resize "${s}x${s}" \
        -gravity center -extent "${s}x${s}" \
        "$OUT/icon-${s}.png"
done

# ── maskable icons: solid #0C0D0F bg, logo at ~80% safe area ────────────────
for s in 192 512; do
    inner=$(( s * 80 / 100 ))
    magick -size "${s}x${s}" "xc:$BG" \
        \( "$SRC/favicon-512.png" -background none -resize "${inner}x${inner}" \) \
        -gravity center -composite \
        "$OUT/icon-${s}-maskable.png"
done

# ── apple-touch-icon: 180×180, solid #0C0D0F bg, logo at 80% ────────────────
inner=$(( 180 * 80 / 100 ))
magick -size 180x180 "xc:$BG" \
    \( "$SRC/favicon-512.png" -background none -resize "${inner}x${inner}" \) \
    -gravity center -composite \
    "$OUT/apple-touch-icon.png"

echo "Icons written to $OUT"
ls -1 "$OUT"
