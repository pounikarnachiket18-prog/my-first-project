#!/usr/bin/env bash
# Mixes the night reel's voice+music with the two train sound effects.
# Usage: build-audio.sh <public/night dir> <output.wav>
#
#   train_horn_pass.mp3 : horn (0.5-5 s), then a train passing (5-14 s)
#   train_clatter.mp3   : wheel clatter (1.5-8 s), squeal (8-9.5 s)
#
# Layout:
#   0.0 s   horn + pull-away rumble opens the reel
#   bed     clatter loop under the whole reel, ducked under the voice
#   17.0 s  close clatter for the "metal body" train close-up
#   91.5 s  train passing for the closing night train shots
#   102.8 s short horn on "FOLLOW karo!"
set -euo pipefail
D="$1"
OUT="$2"
TMP="$(mktemp -d)"

# Seamless clatter bed: 5.5 s slice, chained with crossfades to ~110 s
ffmpeg -v error -y -ss 2.0 -t 5.5 -i "$D/train_clatter.mp3" -ar 48000 -ac 2 "$TMP/slice.wav"
cp "$TMP/slice.wav" "$TMP/bed.wav"
for i in $(seq 1 22); do
  ffmpeg -v error -y -i "$TMP/bed.wav" -i "$TMP/slice.wav" -filter_complex "acrossfade=d=0.6:c1=tri:c2=tri" "$TMP/bed2.wav"
  mv "$TMP/bed2.wav" "$TMP/bed.wav"
done

ffmpeg -v error -y \
  -i "$D/voice_music.wav" \
  -i "$D/train_horn_pass.mp3" \
  -i "$TMP/bed.wav" \
  -i "$D/train_clatter.mp3" \
  -i "$D/train_horn_pass.mp3" \
  -i "$D/train_horn_pass.mp3" \
  -filter_complex "
    [0:a]aresample=48000,asplit=2[voice][key];
    [1:a]atrim=0.4:8.0,asetpts=PTS-STARTPTS,afade=t=out:st=5.6:d=2.0,volume=0.50[open];
    [2:a]atrim=0:106,lowpass=f=3200,volume=0.6[bed];
    [3:a]atrim=1.5:9.6,asetpts=PTS-STARTPTS,afade=t=in:d=0.6,afade=t=out:st=6.6:d=1.5,volume=1.4,adelay=17000|17000[close];
    [4:a]atrim=5.0:16.0,asetpts=PTS-STARTPTS,afade=t=in:d=0.8,afade=t=out:st=8.5:d=2.5,volume=1.3,adelay=91500|91500[pass];
    [5:a]atrim=0.5:3.0,asetpts=PTS-STARTPTS,afade=t=out:st=1.6:d=0.9,volume=0.40,adelay=102800|102800[horn];
    [bed][close][pass]amix=inputs=3:normalize=0:duration=longest[sfx];
    [sfx][key]sidechaincompress=threshold=0.05:ratio=2.5:attack=15:release=350[duck];
    [voice][duck][open][horn]amix=inputs=4:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11
  " -ar 48000 -c:a pcm_s16le "$OUT"

rm -rf "$TMP"
echo "wrote $OUT"
