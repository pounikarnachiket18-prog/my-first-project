# What If Earth Suddenly Stopped Rotating? (50 s vertical reel, Hinglish)

Final render: `../../earth_stopped_rotating_final.mp4` (1080 × 1920, 30 fps, 1500 frames, exactly 50.000 s, H.264 + AAC 48 kHz stereo, −14 LUFS).

## How it is built

The pipeline is a hybrid of three parts. Everything is procedural or public-domain; there's no stock footage and no copyrighted music.

| Layer | Tool | What it makes |
|---|---|---|
| Ground-level 3D shots | **Blender 5.3 / Cycles** (`bpy` Python module) | City street + inertia fling (C1–C3), FFT storm ocean (D2), coastal wave wall (D3), scorched desert (F2), frozen night side (F3) → JPG sequences in `public/earth/renders/<shot>/` |
| Planetary 3D shots | **Three.js / WebGL in Remotion** (`@remotion/three`) with custom GLSL | Photoreal Earth (NASA Blue Marble day map, Black Marble city lights, ocean glint, topo bump, cloud shadows, limb scattering), Sun, orbit, equator ring |
| Edit, graphics, subtitles | **Remotion 4** | Cuts, transitions, colour grade per scene, particles, speedometer, callouts, word-by-word Hinglish subtitles |
| Voice + sound | **Piper TTS** (`hi_IN-pratham-medium`) + numpy/scipy synthesis | Narration with word timings, procedural score and SFX, ducked mix |

The Earth shots were first built in Cycles too, but a single frame took ~48 s on this 4-core CPU. They moved to a GLSL shader that renders in about 1 s per frame. The Blender ground shots render in roughly 4–20 s per frame at 576 × 1024 (10 samples + OpenImageDenoise + motion blur), and the edit upscales them to 1080 × 1920.

### Source layout

```
video/
  earth/
    tools/narration_script.py   Hinglish lines: (subtitle word, spoken Devanagari word, emphasis) + target windows
    tools/build_narration.py    Piper TTS -> public/earth/audio/narration.wav + src/earth/data/captions.json
    tools/build_audio.py        procedural score + SFX, sidechain ducking, loudnorm -> public/earth/audio/final_mix.wav
    blender/common.py           scene/render setup, cameras, worlds, easing
    blender/city.py             procedural street, facades, cars, people, trees, debris, fog, inertia `fling()`
    blender/ocean.py            FFT Ocean + foam material, breaking wave wall, spray
    blender/landscape.py        terrain + cracked-earth / frozen-ice materials
    blender/shots/*.py          one file per shot (C1 C2 C3 D2 D3 F2 F3)
    blender/render.py           render one shot      blender/render_queue.sh  render many
  src/earth/
    index.ts, EarthRoot.tsx     separate Remotion entry (compositions EarthStopped / EarthStoppedSilent)
    EarthStopped.tsx            top-level edit
    timeline.ts                 every cut and beat (frames), aligned to narration timings
    scenes/S1Hook … S7Ending    one file per storyboard section
    components/three/           EarthGlobe + GLSL shaders, Starfield, Sun, GlowRing, CameraRig, texture preloader
    components/                 Subtitles, Typography (TitleCard/Callout/Tag), Speedometer, Particles,
                                Look (Grade/Shake/Flash/Fade), Transitions (whip blur, zoom punch, diagonal split),
                                FrameSequence (plays Blender renders with bloom)
  public/earth/textures         NASA Blue Marble / Black Marble / clouds / topology / water mask / star map
  public/earth/renders          Blender frame sequences (committed so the edit renders without Blender)
  public/earth/audio            narration, music, sfx stems and final mix
  public/earth/fonts            Anton, Montserrat, JetBrains Mono (from @fontsource, OFL)
```

## Regenerating the video

Run everything from `video/`.

```bash
npm ci

# 1) Voice (optional: narration.wav + captions.json are committed)
pip install piper-tts soundfile scipy numpy
mkdir -p earth/voices && cd earth/voices
curl -L -O https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-hi_IN-pratham-medium.tar.bz2
tar xjf vits-piper-hi_IN-pratham-medium.tar.bz2 && cd ../..
python3 earth/tools/build_narration.py

# 2) Sound design + mix (re-run after changing narration or beat times)
python3 earth/tools/build_audio.py

# 3) Blender shots (optional: frames are committed). Needs Python 3.13.
python3 -m venv /opt/bpyenv && /opt/bpyenv/bin/pip install bpy==5.3.0
BLENDER_PY=/opt/bpyenv/bin/python SAMPLES=10 bash earth/blender/render_queue.sh C1 C2 C3 D3 D2 F2 F3
#    quick look at a single frame:  /opt/bpyenv/bin/python earth/blender/render.py C2 --only 40 --pct 50

# 4) Final render
npx remotion render src/earth/index.ts EarthStopped ../earth_stopped_rotating_final.mp4 \
    --codec=h264 --crf=18 --audio-codec=aac --audio-bitrate=320k
#    preview in the studio:  npx remotion studio src/earth/index.ts
```

`remotion.config.ts` points Remotion at the container's pre-installed Chrome headless shell and uses SwiftShader WebGL (`swangle`), so it renders on CPU without a GPU. On a normal desktop you can delete the `setBrowserExecutable` line, and `--gl=angle` is faster.

## Storyboard ↔ timeline

| Time | Section | Shots |
|---|---|---|
| 0–5 s | Hook: dolly-in, Earth's spin freezes on "band" (2.67 s), impact and shake, title | A1 (WebGL) |
| 5–12 s | Invisible speed: orbit with eastward speed trails, equator ring, speedometer → 1,670 km/h, 40,075 km ÷ 24 h | B1, B2 (WebGL) |
| 12–20 s | Inertia: morning traffic, the ground stops (13.33 s), slow-motion fling east, "INERTIA" callout, towers shear | C1–C3 (Blender) |
| 20–28 s | Destruction: atmosphere races over the stopped surface, storm ocean, wave wall hits coast (25.47 s), global storms | D1, D4 (WebGL), D2, D3 (Blender) |
| 28–37 s | Year-long day: still Earth, then orbit diagram with fixed orientation; "1 DIN = 24 GHANTE" struck out → "1 DIN = 1 SAAL" | E1, E2 (WebGL) |
| 37–44 s | Twist: half-lit planet "6 MAHINE DIN / RAAT", extreme heat → diagonal split → freezing darkness | F1 (WebGL), F2, F3 (Blender) |
| 44–50 s | Ending: sunrise over the limb, Earth spinning again, pull-back, black at 49.47 s, final hit | G1 (WebGL) |

## Science notes

- Hypothesis: the solid Earth stops spinning. The atmosphere, oceans and unanchored objects keep their eastward momentum (≈ 465 m/s ≈ 1,670 km/h at the equator; 40,075 km ÷ 24 h). That's why everything in the city shots, the dust and the wave travel east. The magnetic field isn't mentioned.
- The Earth keeps orbiting the Sun. In the orbit diagram only rotation is removed: the planet keeps a fixed orientation, so a marked location takes about half an orbit (about 6 months) to go from day to night. The diagram is idealised, not to scale, and ignores axial tilt, as its on-screen tag says.
- City lights and textures: NASA Blue Marble / Black Marble (public domain), via the `three-globe` npm package.
