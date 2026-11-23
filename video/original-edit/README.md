# Original reel edit: woman attendant + Mindset Mode Explainers badge

Edits the original reel directly. Only the attendant's shot (8.4–11.6s) changes.
His head is tracked frame by frame (position + camera push-in), and a drawn
overlay is composited on top: long hair, bindi, eyeliner, lip colour, blush.
It fades with the shot's crossfades. Also adds the branding badge and the
train sound, and cuts at 43.6s, before the end card.

Needs Python with `opencv-python-headless`, `numpy` and `pillow`, plus ffmpeg.

```bash
SRC=path/to/original.mp4
python badge.py Baloo2.ttf badge.png
python swap_video.py "$SRC" . 1308 track.log \
 | ffmpeg -y -f rawvideo -pix_fmt rgb24 -s 720x1280 -r 30 -i - -i "$SRC" \
     -i ../public/audio/train-ambience.mp3 -loop 1 -i badge.png \
     -filter_complex "[0:v][3:v]overlay=0:0:shortest=1,format=yuv420p[v];\
[1:a]atrim=0:43.6,asetpts=PTS-STARTPTS[vo];\
[2:a]atrim=0:43.6,asetpts=PTS-STARTPTS,volume=0.35,afade=t=in:d=0.3[tr];\
[vo][tr]amix=inputs=2:duration=first:normalize=0,afade=t=out:st=43.35:d=0.25[a]" \
     -map "[v]" -map "[a]" -c:v libx264 -crf 18 -c:a aac -b:a 192k -t 43.6 \
     ../out/original-woman-attendant.mp4
```

- `overlay.py`: the woman features, drawn in the coordinates of the 9.0s frame
- `swap_video.py`: head tracking + compositing, streams raw frames to ffmpeg
- `badge.py`: "Mindset Mode Explainers" badge (Baloo 2, SIL Open Font License)
- Train volume: `volume=0.35`. End cut: `1308` frames / `43.6`s

## Recolour (blue → maroon)

```bash
python recolor_video.py ../public/video/remix-base.mp4 350 . 1.05 0.85 \
 | ffmpeg -y -f rawvideo -pix_fmt rgb24 -s 720x1280 -r 30 -i - -i ../public/video/remix-base.mp4 \
     -map 0:v -map 1:a -c:v libx264 -crf 16 -pix_fmt yuv420p -c:a copy ../public/video/remix-base-maroon.mp4
```

Shifts only saturated blues (hue ~195–260°) to the target hue; skin, hair, greys and whites are untouched.
