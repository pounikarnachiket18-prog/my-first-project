#!/usr/bin/env bash
# Warm saffron colour grade + strip original audio (voice) from the source reel.
# Usage: scripts/grade-original.sh /path/to/original.mp4
set -euo pipefail
IN="$1"
OUT="$(dirname "$0")/../public/original-graded.mp4"
GRADE="hue=h=38:s=1.15,colorbalance=rs=-0.05:bs=0.12:gs=0.02:rm=0.12:gm=-0.04:bm=-0.12:rh=0.12:gh=-0.06:bh=-0.12,eq=contrast=1.06:saturation=1.1"
ffmpeg -v error -y -i "$IN" -an -vf "$GRADE" -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p "$OUT"
echo "wrote $OUT"
