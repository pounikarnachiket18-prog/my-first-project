#!/usr/bin/env bash
# Assemble rendered frames into the final vertical video with the original narration.
#   ./encode.sh <frames_dir> <source_video_or_audio> <out.mp4>
set -euo pipefail
FRAMES="$1"; AUDIO_SRC="$2"; OUT="$3"
ffmpeg -y -framerate 30 -start_number 0 -i "$FRAMES/f_%04d.png" -i "$AUDIO_SRC" \
  -map 0:v -map 1:a \
  -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.4:5:5:0.0,format=yuv420p" \
  -c:v libx264 -preset slow -crf 18 -profile:v high -movflags +faststart \
  -c:a aac -b:a 192k -shortest "$OUT"
