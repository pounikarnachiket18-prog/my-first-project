# JUST KNOW IT — "Why do mosquitoes bite some people more?"

A 35-second, 1080×1920, 30 fps vertical 3D science-documentary reel, built with
**Remotion + three.js**. Every model, texture, particle system and sound is
generated procedurally and deterministically; nothing is downloaded at render time.

The existing HypoExplained reel (`src/index.ts`) is untouched. This project has
its own entry point: `src/mosquito/index.ts`.

## Render it again

```bash
cd video
npm install
npm run mosquito:audio      # (re)build public/jki/audio/{sfx,vo}.wav from the timeline
npm run mosquito:preview    # out/jki-mosquito-preview.mp4  (540×960, fast check)
npm run mosquito:render     # out/jki-mosquito-final.mp4    (1080×1920, CRF 16)
npm run mosquito:studio     # interactive preview / scrubbing
```

Requirements: Node 18+, Chromium (Remotion's own, or a local headless shell; see
`remotion.config.ts`), ffmpeg, Python 3 with numpy, and espeak-ng (only for the
guide narration). No GPU is needed. WebGL runs on ANGLE/SwiftShader. A full 1080p
render takes roughly 15–30 minutes on 4 CPU cores.

## Replacing the narration (important)

`public/jki/audio/vo.wav` is currently a **guide narration made with espeak-ng**.
It exists to lock the timing and is not broadcast quality. To use a real Hindi/Hinglish voice:

1. Record or generate the VO following the phrase timings in
   `src/mosquito/config/timeline.json` (`vo[].start`). Each phrase must fit
   before the next one starts. The `display` field holds the script.
2. Export one 35-second WAV/MP3 that starts at 0:00.
3. Run `python3 scripts/generate_audio.py --vo path/to/voiceover.wav`.
   This copies your VO to `vo.wav` and re-ducks the sound design under it.
4. Re-render.

Optional: burned-in Hindi captions of the narration can be turned on with
`--props='{"captions":true}'`.

## How it is built

| Folder | What lives there |
|---|---|
| `config/timeline.json` | Scene ranges, VO phrase times and text cues. It is the single source of timing for both the video and `scripts/generate_audio.py` |
| `core/Stage.tsx` | One 3D shot: `ThreeCanvas`, virtual camera, and the `useTick` animation registry (everything animates as a pure function of time) |
| `core/postfx.ts` | Camera pipeline: MSAA HDR render; sub-frame accumulation **motion blur**; thin-lens **depth of field** (CoC ∝ \|1/focus − 1/distance\|, gathered at half resolution); bloom; ACES grade with lift/gain, vignette, chromatic aberration and deterministic grain |
| `core/environment.ts` | Image-based lighting built from emissive panels (night room, lab, skin, studio) |
| `core/textures.ts` | Procedural maps: compound-eye ommatidia normal map, wing venation and fringe scales, *Aedes* lyre-patterned scutum, scale micro-normals, skin micro-relief (furrows, pores, flakes) → normal, albedo and roughness |
| `models/Mosquito.tsx` | Female *Aedes aegypti*: compound eyes, proboscis and labella, short white-tipped maxillary palps, antennae (pedicel plus 13 whorls of setae), lyre-marked thorax, two veined thin-film wings with stroke kinematics (≈42° amplitude, pronation/supination) and motion-blur fan, two halteres, six legs (coxa, femur, tibia, five banded tarsomeres), eight-segment abdomen with cerci. Also includes a low-detail LOD for wide shots |
| `models/Skin.tsx` | Macro skin in millimetres: displaced micro-relief, PBR with a wrap-lighting subsurface term, transmissive sweat droplets (IOR 1.33) that swell over time, vellus hairs |
| `models/Molecule.tsx` | Ball-and-stick molecules with real bond orders and approximate geometry: CO₂, NH₃, lactic acid, and long-chain carboxylic acids with the –COOH group taggable for highlighting |
| `models/Human.tsx`, `Bedroom.tsx` | Seated figures and the night bedroom (moonlight shaft with motivated dust, warm practical lamp) |
| `fx/FlowParticles.tsx` | Closed-form GPU particles (plume, rise, drift, orbit), deterministic per frame |
| `scenes/` | S1/S2 one continuous world (0–11 s), S3 skin signals, S4 molecular reveal and comparison, S5 split screen, S6 3D wordmark |
| `ui/Typography.tsx` | Headlines, 3D-anchored scientific labels (projected through the same camera function as the renderer), study chip, brand bug |
| `scripts/generate_audio.py` | Synthesized sound design (buzz with Doppler and slow-motion pitch ramp, night ambience, drones, whooshes, risers, impacts, scientific pulses), guide narration, ducking |

Dev compositions in the same entry point: `Lookdev` (mosquito turntable),
`SkinLook`, `RoomLook`.

## Scientific notes and honest simplifications

- **CO₂ sensing** is shown on the **maxillary palps** (capitate-peg sensilla). The
  **antennae** are labelled for odour and heat. The antennae are not shown as the CO₂ organ.
- **Carboxylic acids:** De Obaldia et al., *Cell* (2022) found that people who were
  highly attractive to *Aedes aegypti* had higher levels of certain skin carboxylic acids.
  On-screen text says *"Linked to higher attraction — one factor among several"*.
  No specific acid is named, and the molecule shown is a generic saturated carboxylic acid.
- Molecules are magnified symbolically so they can be seen next to skin; their sizes relative
  to skin features are not to scale.
- In the split screen (Scene 5), mosquitoes are drawn at 2.6× true size and given faint
  flight trails so they read at half-frame width. The swarm in Scene 1 is 1.25×. The hero
  mosquito in Scenes 1, 2 and 4 is true scale (≈5.5 mm).
- Wing beats run at real frequency (~620 Hz, so they render as a motion-blurred stroke fan)
  and ramp into visible slow motion for the macro.
- The human figures are stylized and deliberately kept low-key, as silhouettes or out of
  focus. Procedural geometry cannot produce photoreal faces, so the camera never lingers on them.
