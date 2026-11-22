#!/usr/bin/env bash
# Soundtrack for the voice-timed full reel (123.8 s).
# Usage: build-full-audio.sh <public/night dir> <intro_audio.wav> <music.wav> <voiceover> <output.wav>
# Effect times are in voiceover seconds (design times passed through the inverse of warp.ts).
set -euo pipefail
D="$1"; INTRO="$2"; MUSIC="$3"; VO="$4"; OUT="$5"
LEN=123.82
ffmpeg -v error -y \
  -i "$INTRO" -i "$VO" -i "$D/train_inside.mp3" -i "$D/train_horn_pass.mp3" -i "$D/train_clatter.mp3" \
  -i "$D/train_horn_pass.mp3" -i "$D/train_horn_pass.mp3" -i "$MUSIC" \
  -filter_complex "
    [0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=0.35[intro];
    [1:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=1.0,asplit=2[voice][key];
    [2:a]aresample=48000,pan=stereo|c0=c0|c1=c0,aloop=loop=1:size=6000000,atrim=0:$LEN,afade=t=in:d=1.5,afade=t=out:st=121.3:d=2.5,volume=0.2[bed];
    [3:a]atrim=5.0:8.5,asetpts=PTS-STARTPTS,afade=t=in:d=0.3,afade=t=out:st=2.6:d=0.9,volume=0.3,adelay=6870|6870[charge];
    [4:a]atrim=1.5:9.6,asetpts=PTS-STARTPTS,afade=t=in:d=0.6,afade=t=out:st=6.6:d=1.5,volume=0.4,adelay=25100|25100[close];
    [5:a]atrim=5.0:16.0,asetpts=PTS-STARTPTS,afade=t=in:d=0.8,afade=t=out:st=8.5:d=2.5,volume=0.4,adelay=109800|109800[pass];
    [6:a]atrim=0.5:3.0,asetpts=PTS-STARTPTS,afade=t=out:st=1.6:d=0.9,volume=0.25,adelay=120900|120900[horn];
    [7:a]aresample=48000,pan=stereo|c0=c0|c1=c0,atempo=0.9,afade=t=in:d=1.0,afade=t=out:st=113:d=3.5,volume=0.3,adelay=6870|6870[music];
    [intro][bed][charge][close][pass][music]amix=inputs=6:normalize=0:duration=longest[sfx];
    [sfx][key]sidechaincompress=threshold=0.05:ratio=3:attack=15:release=350[duck];
    [voice][duck][horn]amix=inputs=3:normalize=0:duration=longest,atrim=0:$LEN,loudnorm=I=-14:TP=-1.5:LRA=11
  " -ar 48000 -ac 2 -c:a pcm_s16le "$OUT"
echo "wrote $OUT"
