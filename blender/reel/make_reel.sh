#!/usr/bin/env bash
# Build the Instagram Reel end to end.
#   ./make_reel.sh <original_video.mp4> [frames_dir] [out.mp4]
# Every step is resumable: frames that already exist are not rendered again.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$1"
FRAMES="${2:-$HERE/build/frames}"
OUT="${3:-$HERE/../out/metal-detector-reel-mindsetmode.mp4}"
PY="${PYTHON:-python}"
cd "$HERE"
mkdir -p build "$(dirname "$OUT")"

"$PY" prep_audio.py --src "$SRC" --out build                      # narration.wav + timeline.json
"$PY" build_reel.py --out build/reel.blend --assets build/assets  # the 3D scene
"$PY" anchors.py --blend build/reel.blend --out build/anchors.json
# Cycles frames: two processes x 2 threads is the fastest split on a 4-core CPU
"$PY" ../render.py --blend build/reel.blend --out "$FRAMES" --range 0:709 --threads 2 > build/render_a.log 2>&1 &
"$PY" ../render.py --blend build/reel.blend --out "$FRAMES" --range 709:1417 --threads 2 > build/render_b.log 2>&1
wait
"$PY" sound.py --narration build/narration.wav --out build/mix.wav
"$PY" post.py --frames "$FRAMES" --timeline build/timeline.json --anchors build/anchors.json \
             --audio build/mix.wav --out "$OUT"
echo "done: $OUT"
