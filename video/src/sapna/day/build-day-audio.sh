#!/usr/bin/env bash
# Full soundtrack for the day reel: 5 s station opening + 105.4 s voice track.
# Usage: build-day-audio.sh <public/night dir> <intro_audio.wav> <output.wav>
#   train_inside.mp3    : continuous inside-express ambience (bed for the whole reel)
#   train_horn_pass.mp3 : horn (0.5-5 s), train passing (5-14 s)
#   train_clatter.mp3   : wheel clatter (1.5-8 s), squeal (8-9.5 s)
set -euo pipefail
D="$1"; INTRO="$2"; OUT="$3"
ffmpeg -v error -y \
  -i "$INTRO" \
  -i "$D/voice_music.wav" \
  -i "$D/train_inside.mp3" \
  -i "$D/train_horn_pass.mp3" \
  -i "$D/train_clatter.mp3" \
  -i "$D/train_horn_pass.mp3" \
  -i "$D/train_horn_pass.mp3" \
  -filter_complex "
    [0:a]aresample=48000,volume=0.9[intro];
    [1:a]aresample=48000,adelay=5000|5000,asplit=2[voice][key];
    [2:a]aresample=48000,pan=stereo|c0=c0|c1=c0,atrim=0:110.4,afade=t=in:d=1.5,afade=t=out:st=108.4:d=2,volume=0.55[bed];
    [3:a]atrim=5.0:8.5,asetpts=PTS-STARTPTS,afade=t=in:d=0.3,afade=t=out:st=2.6:d=0.9,volume=1.1,adelay=5000|5000[charge];
    [4:a]atrim=1.5:9.6,asetpts=PTS-STARTPTS,afade=t=in:d=0.6,afade=t=out:st=6.6:d=1.5,volume=1.3,adelay=22000|22000[close];
    [5:a]atrim=5.0:16.0,asetpts=PTS-STARTPTS,afade=t=in:d=0.8,afade=t=out:st=8.5:d=2.5,volume=1.2,adelay=96500|96500[pass];
    [6:a]atrim=0.5:3.0,asetpts=PTS-STARTPTS,afade=t=out:st=1.6:d=0.9,volume=0.45,adelay=107800|107800[horn];
    [bed][charge][close][pass]amix=inputs=4:normalize=0:duration=longest[sfx];
    [sfx][key]sidechaincompress=threshold=0.05:ratio=2.5:attack=15:release=350[duck];
    [intro][voice][duck][horn]amix=inputs=4:normalize=0:duration=longest,atrim=0:110.4,loudnorm=I=-14:TP=-1.5:LRA=11
  " -ar 48000 -ac 2 -c:a pcm_s16le "$OUT"
echo "wrote $OUT"
