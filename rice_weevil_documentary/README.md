# THE INVISIBLE INVADER — How a tiny weevil destroys your rice

An original 50‑second vertical (9:16) 3D science documentary about the rice weevil,
*Sitophilus oryzae*, built entirely with Blender + Python automation.
Every model, material, animation, camera move, light, note of music and sound effect
is generated procedurally by the scripts in this folder. No footage, narration or audio
from any reference video is used.

| Spec | Value |
|---|---|
| Duration | 50.000 s — 1500 frames @ 30 fps |
| Delivery | 1080 × 1920, H.264 High, AAC 48 kHz, −14 LUFS / −1.5 dBTP |
| Engine | Blender 4.5.3 LTS, Cycles (CPU, OpenImageDenoise) |
| Narration | Hindi/Hinglish, offline neural TTS (Kokoro‑82M, voice `hm_omega`) |
| Subtitles | Burned‑in Hindi (Noto Sans Devanagari) + English translation |

## Story (7 sequences, one Blender scene + collection each)

| # | Frames | Sequence | What happens |
|---|---|---|---|
| 0 | 1–60 (renders 2001–2060) | Cold Open | Extreme macro of one clean-looking grain: it cracks and an adult weevil pushes its head out of an exit hole; focus racks from the grain to its eye, then the camera snaps back. Real 3D motion blur. |
| 1 | 61–180 (renders 22–180, speed-ramped) | The Sealed Jar | A closed glass jar of rice on a dark kitchen counter (a few dark specks visible through the glass). The lid twists off; the camera rises to the rim as weevils crawl up the inside of the glass and out over the rim. |
| 2 | 181–390 | Meet the Invader | 360° macro orbit of an articulated adult beside a grain for scale, settling into a side profile. Species card. |
| 3 | 391–630 | The Secret Egg | Female walks the grain, taps it with her antennae, chews a hole with the mandibles at the tip of her rostrum (flour spills), turns, deposits one egg, seals it with a gelatinous plug; the grain is sliced open to reveal the egg. |
| 4 | 631–930 | Hidden Destruction | Match‑cut into the cutaway: the egg hatches; a legless C‑shaped larva feeds and moults in spurts while its chamber widens and frass accumulates. |
| 5 | 931–1200 | The Transformation | The grain turns X‑ray translucent; slow orbit as larva → pupa (eyes pigment first, then cuticle) → pale teneral adult that darkens as it sclerotises. |
| 6 | 1201–1410 | The Final Reveal | The adult chews a round exit hole and climbs out; pull‑back over stored rice with more damaged grains and roaming adults. |
| 7 | 1411–1500 | The Takeaway | Healthy vs. infested grain. Title + “Store grains dry. Inspect regularly.” |

## Project layout

```
rice_weevil_documentary/
  main.py                 build / preview / render driver (Blender Python)
  lib/
    core.py               scene setup (mm units for real macro DOF), mesh sweeps, keyframe utils
    materials.py          procedural PBR: rice (SSS + ridges + chalkiness, aged & X‑ray variants),
                          endosperm, punctured chitin with elytral spots/striae, eyes, SSS larva/pupa/egg,
                          gelatinous plug, noise‑dissolve for metamorphosis
    creatures.py          adult weevil rig (rostrum + mandibles, geniculate clubbed antennae,
                          6 three‑segment legs) with procedural tripod gait; egg; larva with
                          peristalsis shape keys; exarate pupa
    grains.py             rice grain generator, cutaway grains with animated boolean cavities,
                          grain fields / stored‑rice heaps, crest sampling for walking
    rigs.py               cameras (track + focus objects, DOF), area/spot lights, world, ground
    props.py              glass storage jar (lathe), screw lid, stone counter, rice fill, rim‑crossing walk paths
    scenes.py             the seven sequences (TIMELINE, build_s1 … build_s7)
  tools/
    build_audio.py        TTS narration fitted to each scene window, procedural score, SFX, atmosphere, mix
    track.py              screen positions of rostrum / egg / larva / pupa / exit hole from the cameras
    finish.py             cinematic finishing pass: edit list (cold open, speed ramp), snap zooms, macro-zoom,
                          rack-focus, X-ray scan and particle transitions, impact flash/shake, dust, light shafts
    assemble.py           upscale + grade, animated ASS typography (highlighted Hindi subs, tracked callouts,
                          life-cycle tracker, day counter, titles), loudness, H.264 export (--classic = old edit)
  assets/
    fonts/                Noto Sans Devanagari, Inter, Cinzel (SIL OFL)
    audio/                narration / music / sfx / mix stems + subtitles.json
    textures/, models/    (empty — everything is procedural, so nothing can go missing)
  scenes/rice_weevil_documentary.blend
  renders/frames/         rendered PNG sequence (git‑ignored)
  final/                  the_invisible_invader_50s.mp4, subtitles.ass
```

## Reproduce

```bash
# 1. Blender as a Python module (or use `blender -b -P main.py -- <args>`)
python3.11 -m venv venv && venv/bin/pip install bpy==4.5.3
venv/bin/python main.py build                                 # -> scenes/rice_weevil_documentary.blend
venv/bin/python main.py preview S3_SecretEgg 420,490,600 25 8 # quick low‑res stills
venv/bin/python main.py render ALL 50 16                      # resumable; pct, samples

# 2. Audio (separate venv to keep numpy versions apart)
python3.11 -m venv audiovenv && audiovenv/bin/pip install kokoro-onnx soundfile scipy
#   model files: kokoro-v1.0.onnx + voices-v1.0.bin from
#   github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
audiovenv/bin/python tools/build_audio.py /path/to/kokoro_models

# 3. Track, finish, edit + export (numpy + scipy: use the audio venv)
venv/bin/python tools/track.py                                # -> assets/tracking.json
audiovenv/bin/python tools/build_audio.py --reuse-narration    # remix without re-running TTS
audiovenv/bin/python tools/assemble.py                         # --range=1,240 for a quick preview
```

Note for headless/background use: Blender only evaluates animation for the window's active
scene, so `main.py` switches `window.scene` and calls `view_layer.update()` before rendering
each sequence (otherwise every frame renders identically).

## Rendering notes (honest limitations)

* **Internal resolution.** This was produced on a 4‑core CPU container with no GPU. Cycles
  needs ~5–23 s per frame at 540 × 960 / 16 samples + OIDN; full 1080 × 1920 would take
  ~25 h. The frames were therefore rendered at **50 % (540 × 960)** and upscaled to 1080 × 1920
  (Lanczos + unsharp) in `assemble.py`. For a native‑resolution master on a GPU machine:
  `main.py render ALL 100 64` then `tools/assemble.py`.
* **Eevee** works headless only with Mesa EGL and was slower than Cycles here.
* **Narration** is neural TTS, not a human voice actor. Lines are synthesised phrase by phrase
  so subtitles are frame‑accurate; speaking rate is auto‑fitted (0.94–1.3×) to each window.
  Swap in a recorded voice by replacing `assets/audio/narration.wav` and re‑running the mix.
* Models are procedural (no sculpted/scanned assets); fine setae and tarsal pads are omitted.

## Scientific basis

* Holometabolous life cycle: **egg → larva → pupa → adult**, with egg, larva and pupa all
  developing hidden inside a single kernel; the female chews a cavity with mandibles at the tip
  of the rostrum, lays **one egg**, and seals it with a gelatinous secretion (“egg plug”).
* Larva: legless, creamy white, C‑shaped, with a darker head capsule; feeds on the endosperm and
  moults several times inside the grain. Pupa: exarate (appendages free, folded), white,
  darkening before eclosion. New adults are paler and darken as the cuticle hardens, then
  chew a **round exit hole**.
* Adult: ~2–3.5 mm (often quoted up to ~4 mm), reddish‑brown to dark brown, long rostrum,
  geniculate clubbed antennae, densely punctured pronotum, and **four pale reddish‑yellow spots**
  on the elytra. Attacks rice, wheat, maize and other stored cereals.
* Prevention messaging follows standard stored‑grain guidance: keep grain dry, store in sealed
  containers, inspect regularly.

General references: university extension fact sheets on *Sitophilus oryzae* (e.g. University of
Florida/IFAS “Featured Creatures” rice weevil profile) and CABI’s compendium datasheet for
*S. oryzae*. Visual simplifications are deliberate where exact motion could not be animated
reliably (e.g. oviposition is shown as the egg sliding into the cavity rather than an
anatomically modelled ovipositor).

## Channel branding and motion graphics

- `tools/brand.py` keys the supplied logo (`assets/textures/justknowit_logo.png`) into clean
  mattes and builds an animated Just KnowIt badge (spring intro, brain pulse on story beats,
  light-sweep glint every ~5 s and on chapter cuts) -> `renders/brand/bug.mov`. `assemble.py`
  overlays it after the grade on every frame (built automatically if missing).
- Every frame also carries a chapter tag (number tile + typed title) and an 8-segment progress
  bar, top right. Labels are animated: brand-red callout panels wipe in from the leader line,
  the species name wipes on over a red underline, a red pill glides between life-cycle stages
  and a day-progress bar runs under the day counter.
