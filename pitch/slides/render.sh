#!/usr/bin/env bash
# Renders slides/NN.html -> slides/png/NN.png (1920x1080) and combines them into slides/deck.pdf.
# Usage: ./render.sh            (from anywhere)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/png"
CHROME="${CHROME:-$(command -v chromium || command -v chromium-browser || command -v google-chrome || echo /usr/bin/chromium)}"
mkdir -p "$OUT"
PROFILE="$(mktemp -d)"
trap 'rm -rf "$PROFILE"' EXIT

for f in "$DIR"/[0-9][0-9].html; do
  n="$(basename "$f" .html)"
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --user-data-dir="$PROFILE" --force-device-scale-factor=1 \
    --allow-file-access-from-files --virtual-time-budget=3000 \
    --window-size=1920,1080 --screenshot="$OUT/$n.png" "file://$f" >/dev/null 2>&1
  echo "rendered $n.png"
done

python3 - "$OUT" "$DIR/deck.pdf" <<'PY'
import sys, glob, os
from PIL import Image
out, pdf = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(out, "[0-9][0-9].png")))
imgs = [Image.open(p).convert("RGB") for p in files]
for p, im in zip(files, imgs):
    assert im.size == (1920, 1080), f"{p} is {im.size}, expected 1920x1080"
# 144 dpi -> 13.33 x 7.5 in (standard 16:9 slide size)
imgs[0].save(pdf, save_all=True, append_images=imgs[1:], resolution=144.0)
print(f"wrote {pdf} ({len(imgs)} pages)")
PY
