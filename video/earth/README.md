# What If Earth Suddenly Stopped Rotating? (50 s vertical reel, Hinglish, Indian setting)

Final render: `../../earth_stopped_rotating_final.mp4`. It is 1080 × 1920 at 30 fps: 1,500 frames, exactly 50.000 s, with H.264 video and AAC 48 kHz stereo audio at −14 LUFS.

## Look

All 17 shots are rendered in **Blender 5.3 Cycles**, following the reference video's style:
- bright overcast daylight
- wet asphalt and zebra crossings
- one recurring character
- slow-motion flying people and vehicles
- a wall of water beside a promenade
- a simple dark-space orbit diagram
- one-word captions

The setting is Mumbai and India:
- balconied buildings with grilles, chhajjas, AC units and laundry
- Hindi/English shop signboards
- black-and-yellow kerbs, electric poles and wires
- kaali-peeli taxis, auto-rickshaws and a red BEST bus
- Marine Drive with tetrapods for the wave
- the Thar desert for the heat
- Ladakh-style ice for the frozen night side
- India facing the camera on the globe

Remotion handles the edit, captions, the few science overlays (the 1,670 km/h counter, "1 din = 1 saal", "6 mahine din/raat", orbit labels), camera shake, flashes, light rain, debris and snow, and the audio.

| Time | Shot | Blender file |
|---|---|---|
| 0–5 s | Earth with India in view; the spin freezes on "band" (2.67 s). The clouds keep drifting. | `shots/A1.py` |
| 5–8.5 s | Hero on a Mumbai zebra crossing, with a low orbiting camera and normal traffic | `B1.py` |
| 8.5–12 s | The equator lights up and the counter reaches 1,670 km/h | `B2.py` |
| 12–13.3 s | Ordinary morning: the hero crosses the street | `C1.py` |
| 13.3–17 s | The ground stops. The hero, taxis, autos and a bus keep their eastward speed, in slow motion. | `C2.py` |
| 17–20 s | Everything streams east; signboards rip off and trees bend | `C3.py` |
| 20–22.3 s | Superfast winds | `D1.py` |
| 22.3–25.6 s | Marine Drive: the Arabian Sea rears into a wall of water that hits on "destruction" | `D2.py`, `D3.py` |
| 25.6–28 s | The wrecked street | `D4.py` |
| 28–31 s | The survivor sits up | `E1.py` |
| 31–37 s | Orbit diagram: Earth keeps orbiting but doesn't rotate, so Bharat goes from DIN to RAAT over half an orbit (1 din = 1 saal) | `E2.py` (+ `export_track.py` for the labels) |
| 37–40.5 s | Half-lit planet: 6 mahine din / 6 mahine raat | `F1.py` |
| 40.5–42.5 s | Thar: extreme heat | `F2.py` |
| 42.5–44.1 s | Ladakh: freezing darkness | `F3.py` |
| 44.1–46.7 s | Sunrise on Marine Drive | `G1.py` |
| 46.7–50 s | Earth spinning again, pull-back, black, final hit | `G2.py` |

## Source layout

```
video/earth/
  blender/common.py        scene + render setup, cameras, worlds, easing
  blender/look.py          the reference look: bright overcast daylight + light haze
  blender/india.py         Mumbai kit: buildings (one multi-material mesh each), signboards, kerbs, poles,
                           wires, neem trees, taxi, auto-rickshaw, BEST bus, hatchback, scooter, clutter
  blender/character.py     rigged people (restyled avatar: kurta/jacket colours, skin tones, hair),
                           posed by aiming limbs at directions; stand / walk / flail / sit / shield-eyes / hug-cold
  blender/mumbai.py        street assembly + inertia physics: objects keep ~465 m/s east, slow-motion clock
  blender/street_scene.py  per-shot variants (traffic, walkers, clearing the lens path)
  blender/marine.py        Marine Drive: ocean, tetrapods, sea wall, promenade, art-deco row, wave wall
  blender/ocean.py         FFT ocean + foam, breaking-wave mesh
  blender/landscape.py     dunes / ice terrain + materials
  blender/planet.py        fast Cycles Earth (NASA day/night/cloud textures), atmosphere, markers, rings
  blender/shots/*.py       one file per shot
  blender/render.py        render one shot;  blender/render_queue.sh  render many (resumable)
  tools/narration_script.py, build_narration.py   Hinglish narration (Piper TTS) + word timings
  tools/build_audio.py     procedural score + SFX, ducking, loudness
  tools/make_signboards.js Hindi/English signboard textures (Chromium, correct Devanagari shaping)
  tools/fetch_assets.sh    downloads the third-party character model and the TTS voice
video/src/earth/           Remotion edit: EarthStopped.tsx, timeline.ts, components/
```

## Regenerating

Run everything from `video/`.

```bash
npm ci
bash earth/tools/fetch_assets.sh                 # avatar .glb + Hindi voice (not committed)
node earth/tools/make_signboards.js              # optional: signboard PNGs are committed
python3 earth/tools/build_narration.py           # optional: narration + captions.json are committed
python3 earth/tools/build_audio.py               # sound design + final mix

# Blender shots (frames are committed; re-render only if you change a shot). Needs Python 3.13.
python3 -m venv /opt/bpyenv && /opt/bpyenv/bin/pip install bpy==5.3.0
SAMPLES=8 bash earth/blender/render_queue.sh A1 B2 F1 G2 E2
SAMPLES=4 bash earth/blender/render_queue.sh B1 C1 C2 C3 D1 D2 D3 D4 E1 G1 F2 F3
/opt/bpyenv/bin/python earth/blender/export_track.py      # orbit-diagram label positions
#   one test frame:  /opt/bpyenv/bin/python earth/blender/render.py C2 --only 40 --pct 50 --out _test

# Render in 300-frame chunks (one long render can stall a browser tab in this CPU-only container),
# then join and add the mix:
for r in 0-299 300-599 600-899 900-1199 1200-1499; do
  npx remotion render src/earth/index.ts EarthStoppedSilent out/chunks/c_$r.mp4 --frames=$r --crf=16 --muted --timeout=120000
done
printf "file 'c_%s.mp4'\n" 0-299 300-599 600-899 900-1199 1200-1499 > out/chunks/list.txt
ffmpeg -f concat -safe 0 -i out/chunks/list.txt -i public/earth/audio/final_mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 320k -t 50 -movflags +faststart ../earth_stopped_rotating_final.mp4
```

Render settings: Cycles on CPU with OpenImageDenoise. Earth shots use 720 × 1280 at 8 samples. Ground shots use 648 × 1152 at 4 samples, with motion blur on the action shots. The edit scales everything to 1080 × 1920.

## Science notes

- Hypothesis: the solid Earth stops rotating. The air, oceans, people and unanchored objects keep their eastward momentum: about 1,670 km/h at the equator (40,075 km ÷ 24 h), modelled as about 465 m/s in the scenes. That's why everything flies, and the sea surges, to the east. The magnetic field isn't mentioned.
- The Earth keeps orbiting the Sun. Only rotation is removed, so a place takes half an orbit (about 6 months) to go from day to night. The diagram is idealised, not to scale, and ignores axial tilt.

## Credits / licences

- Earth textures: NASA Blue Marble / Black Marble (public domain), via the `three-globe` npm package.
- The character is the Ready Player Me sample avatar from the three.js examples repository. It's downloaded at build time and not redistributed here.
- Fonts: Anton, Montserrat, Baloo 2, Noto Sans Devanagari (SIL OFL, via @fontsource).
- The voice is Piper `hi_IN-pratham-medium`.
- All music and SFX are synthesised procedurally in `build_audio.py`.
