# How a gun fires a bullet (5 s cutaway)

Vertical 1080×1920, 60 fps. Hindi titles and subtitles with English underneath.
Everything is drawn in code (Canvas 2D) and the sound is synthesised, so no stock footage or samples are used.

- `index.html` + `scene.js`: the animation. Open `index.html` in a browser to watch it loop.
- `sfx.py`: generates the sound effects (needs numpy).
- `render.js`: renders all frames with Playwright, then muxes them with the audio using ffmpeg → `out/bullet_firing_5s.mp4`.
  `node render.js --stills 0.3,2.5` renders single check frames.
- `fonts/`: Noto Sans Devanagari (SIL Open Font License).
