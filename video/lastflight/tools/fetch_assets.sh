#!/usr/bin/env bash
# Downloads the third-party assets THE LAST FLIGHT needs but does not redistribute.
#   - Piper neural TTS voices (sherpa-onnx release mirror on GitHub)
#   - the rigged character model shared with the Earth reel (earth/tools/fetch_assets.sh)
set -e
cd "$(dirname "$0")/../.."
bash earth/tools/fetch_assets.sh
mkdir -p lastflight/voices
for v in hi_IN-rohan-medium hi_IN-pratham-medium; do
  if [ ! -d lastflight/voices/vits-piper-$v ]; then
    curl -L -o /tmp/$v.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-$v.tar.bz2
    tar xjf /tmp/$v.tar.bz2 -C lastflight/voices && rm /tmp/$v.tar.bz2
  fi
done
