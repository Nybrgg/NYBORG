#!/bin/bash
# Renders the key stops of every chapter into $1 and builds a contact sheet.
OUT=$1; shift
TS="0.0024 0.086 0.136 0.2024 0.286 0.336 0.4024 0.486 0.536 0.6024 0.686 0.736 0.8024 0.886 0.936 0.974"
timeout 900 node shoot-world.mjs $OUT $TS 2>&1 | grep -vE "clearcoat|saved" | tail -5
python3 - "$OUT" <<'PY'
import sys, glob
from PIL import Image
out = sys.argv[1]
files = sorted(f for f in glob.glob(out + '/t*.png') if 'sheet' not in f)
ims = [Image.open(f).resize((480, 300)) for f in files]
cols = 4
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (480 * cols, 300 * rows))
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * 480, (i // cols) * 300))
sheet.save(out + '/sheet.png')
print(len(ims), 'frames')
PY
