#!/usr/bin/env bash
# Renders Blender shots one after another (Cycles already uses every core).
#   bash earth/blender/render_queue.sh C1 C2 C3 D2 D3 F2 F3
# Re-running resumes: frames that already exist are skipped.
cd "$(dirname "$0")/../.." || exit 1
PY=${BLENDER_PY:-/opt/bpyenv/bin/python}
for shot in "$@"; do
  echo "=== $shot $(date +%T)"
  SKIP_EXISTING=1 "$PY" earth/blender/render.py "$shot" --samples "${SAMPLES:-10}" 2>&1 | grep -E "DONE|Error|Traceback|frame [0-9]+0 "
done
echo "=== queue finished $(date +%T)"
