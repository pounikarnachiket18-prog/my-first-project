#!/usr/bin/env bash
# Mix train SFX under the original narration (ducked) and loudness-normalise to -14 LUFS.
# Usage: mix_audio.sh <source.mp4> <passing.mp3> <horn_arrival.mp3> <inside_train.mp3> <brake.wav> <out.wav>
set -euo pipefail
SRC=$1; S1=$2; S2=$3; S3=$4; BRAKE=$5; OUT=$6
ffmpeg -v error -y -i "$SRC" -i "$S1" -i "$S2" -i "$S3" -i "$BRAKE" -filter_complex "
[2:a]atrim=0:1.9,asetpts=PTS-STARTPTS,afade=t=out:st=1.5:d=0.4,volume=1.0,adelay=100|100[A];
[1:a]atrim=0.5:2.4,asetpts=PTS-STARTPTS,afade=t=in:d=0.4,afade=t=out:st=1.7:d=0.2,volume=0.4[B];
[1:a]atrim=1.0:3.1,asetpts=PTS-STARTPTS,afade=t=in:d=0.05,afade=t=out:st=1.85:d=0.2,volume=1.0,adelay=2200|2200[C];
[3:a]pan=stereo|c0=c0|c1=c0,atrim=5:6.95,asetpts=PTS-STARTPTS,afade=t=in:d=0.1,afade=t=out:st=1.75:d=0.15,volume=0.5,adelay=4230|4230[D];
[2:a]atrim=6.5:9.0,asetpts=PTS-STARTPTS,afade=t=in:d=0.1,afade=t=out:st=2.25:d=0.2,volume=0.85,adelay=6130|6130[E];
[3:a]pan=stereo|c0=c0|c1=c0,atrim=20:40.95,asetpts=PTS-STARTPTS,afade=t=in:d=0.15,afade=t=out:st=20.75:d=0.15,volume=0.45,adelay=8530|8530[F];
[2:a]atrim=0:1.7,asetpts=PTS-STARTPTS,lowpass=f=1100,afade=t=out:st=1.3:d=0.4,volume=0.7,adelay=20900|20900[G];
[1:a]atrim=3:5.95,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=1.0:d=1.9,volume=1.0,adelay=29370|29370[H];
[4:a]volume=0.55,adelay=29400|29400[I];
[3:a]pan=stereo|c0=c0|c1=c0,atrim=45:50.25,asetpts=PTS-STARTPTS,afade=t=in:d=0.15,afade=t=out:st=5.0:d=0.15,volume=0.45,adelay=32230|32230[J];
[2:a]atrim=5.5:12.2,asetpts=PTS-STARTPTS,afade=t=in:d=0.2,afade=t=out:st=5.6:d=1.1,volume=0.9,adelay=37370|37370[K];
[2:a]atrim=0:1.9,asetpts=PTS-STARTPTS,afade=t=out:st=1.4:d=0.5,volume=0.85,adelay=37550|37550[L];
[A][B][C][D][E][F][G][H][I][J][K][L]amix=inputs=12:normalize=0:duration=longest,atrim=0:44,aformat=sample_rates=48000:channel_layouts=stereo[sfx];
[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[v1][v2];
[sfx][v1]sidechaincompress=threshold=0.06:ratio=3:attack=20:release=300:makeup=1[duck];
[v2][duck]amix=inputs=2:normalize=0:weights=1 1.7,alimiter=limit=0.89:level=disabled,loudnorm=I=-14:TP=-1.5:LRA=11[out]" \
  -map "[out]" -ar 48000 -c:a pcm_s16le "$OUT"
