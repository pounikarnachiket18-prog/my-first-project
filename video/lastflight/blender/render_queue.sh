#!/usr/bin/env bash
# Renders Blender shots one after another (Cycles already uses every core).
#   SAMPLES=4 PCT=75 bash lastflight/blender/render_queue.sh S1A S1B ...
# Re-running resumes: frames that already exist are skipped.
cd "$(dirname "$0")/../.." || exit 1
PY=${BLENDER_PY:-/opt/bpyenv/bin/python}
for shot in "$@"; do
  echo "=== $shot $(date +%T)"
  SKIP_EXISTING=1 "$PY" lastflight/blender/render.py "$shot" --samples "${SAMPLES:-4}" --pct "${PCT:-75}" 2>&1 | grep -E "DONE|Error|Traceback|frame [0-9]+0 "
done
echo "=== queue finished $(date +%T)"
