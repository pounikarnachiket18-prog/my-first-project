#!/usr/bin/env bash
# Downloads third-party assets that are not committed to this repo.
#  - Ready Player Me sample avatar from the three.js examples (rigged human used for every character)
#  - Piper Hindi voice (male, "pratham") for the narration
set -e
cd "$(dirname "$0")/../.."
mkdir -p earth/assets earth/voices
curl -L -o earth/assets/readyplayer.me.glb https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/readyplayer.me.glb
if [ ! -d earth/voices/vits-piper-hi_IN-pratham-medium ]; then
  curl -L -o /tmp/pratham.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-hi_IN-pratham-medium.tar.bz2
  tar xjf /tmp/pratham.tar.bz2 -C earth/voices
fi
echo "assets ready"
