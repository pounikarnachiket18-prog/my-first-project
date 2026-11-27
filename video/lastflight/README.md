# THE LAST FLIGHT (60 s vertical disaster short)

Final export: `../../THE_LAST_FLIGHT_FINAL.mp4`
- 1080 × 1920, 24 fps, 1,440 frames (60.0 s)
- H.264 High (yuv420p) with AAC 48 kHz stereo at −14 LUFS

The original Earth reel (`earth/`, `src/earth/`, `earth_stopped_rotating_final.mp4`) is untouched. This film lives in its own folders and has its own Remotion entry.

## Story & shot list

| Time | Shot | What you see | Sound / dialogue |
|---|---|---|---|
| 0–4 s | S1A | Extreme close-up of Captain Arjun Rao's helmet visor, with red warning lights reflected | Muffled cockpit rotor, caution chime. **Arjun:** "Control… something is wrong." Then the master warning starts. |
| 4–6 s | S1B | Instruments flicker and the master warnings strobe. Power dips to black. | Electrical zaps, then the turbine winds down |
| 6–10 s | S2A | Push in on India from orbit; the planet's spin stops. HUD: rotation at Mumbai, 1,583 → 0 km/h | Reverse suck, then a planet-sized grind and a sub impact |
| 10–13 s | S2B | Dawn aerial of the city as a continent-wide dust front arrives. Super: "The ground stopped. The air didn't. Wind ≈ 1,580 km/h →" | Rising roar, string tremolo |
| 13–16 s | S3A | Ground-level tracking shot: a man sprints down a Mumbai street as the gale tears it apart | Gale, footsteps, debris, sign ripping |
| 16–18.5 s | S3B | Low Dutch angle: debris and glass overhead, a street light topples | Glass rain, metal groan and crash |
| 18.5–22 s | S3C | Wide aerial of the city coming apart | Distant explosions, tower groan |
| 22–26 s | S4A | Whip pan into the aerial chase through a canyon of damaged towers | Whoosh, close rotor pass, chase score |
| 26–28 s | S4B | Over-the-shoulder cockpit POV, violent turbulence | Low-altitude alarm. **Control (radio):** "Captain! You're losing altitude!" |
| 28–29.5 s | S4C | Gloved hand fighting the shuddering cyclic | Airframe stress creaks |
| 29.5–32.5 s | S4D | Low-angle street view: the helicopter roars overhead | Doppler fly-by |
| 32.5–35 s | S4E | One small helicopter in a dying city, with a second one far off | Distant rotors |
| 35–37 s | S4F | Side profile: blades scything through dust | Blade slap |
| 37–40 s | S5A | Rooftop: the girl looks up as the helicopter flares into a hover | Downwash and gale; heartbeat pulse |
| 40–42 s | S5B | Looking up into the downwash as the rescue cable unreels | Winch motor |
| 42–44 s | S5C | Through the cockpit glass, Arjun holds the hover | **Arjun:** "I'm not leaving her behind!" |
| 44–46 s | S5D | The girl fights the wind and reaches for the harness | Harness flutter |
| 46–47 s | S5E | Slow-motion macro: her hand closes on the harness | Sound sucks out; a single high note; the clasp |
| 47–49 s | S5F | She is lifted off and the helicopter claws away | Rotor surge, score lifts to B♭ major |
| 49–53 s | S6A | They fly out toward a sun smothered in dust | Near silence, solo piano |
| 53–56 s | S6B | Earth from space: atmospheric bands sweep east over a planet that no longer turns | No air sound in space, only score and radio. **Control:** "Captain… this was only the beginning." |
| 56–60 s | Title | **THE LAST FLIGHT** / *THE DAY THE EARTH STOPPED.* | Title hit, subtitle hit, final impact, then black |

## How it is made

Everything is generated from code in this repository. There is no stock footage, AI video, music library or third-party sound.

- **3D (Blender 5.3 Cycles, CPU)**, in `lastflight/blender/`:
  - `heli.py`: an original procedural rescue helicopter. It has a lofted fuselage, cockpit glass, a working cockpit (MFDs, warning lamps, cyclic), a rescue hoist and cable, beacons, a searchlight, a spinning main and tail rotor, and original decals (tail number IA-1142, Indian tricolour roundel).
  - `character.py` (shared with the Earth reel) dresses and poses the two characters:
    - **Arjun:** olive flight suit, helmet with visor and boom mic, black gloves.
    - **The girl:** dusty-rose kurta and a ponytail.
  - `lf_world.py` / `lf_common.py`:
    - one consistent city (≈150 towers, some leaning)
    - the girl's rooftop, a dusk dust light, fires and smoke stacks
    - animated dust "cards" and fog
  - `lf_flight.py`: one shared flight path (Catmull-Rom curve with turbulence), so every shot agrees on where the helicopter is.
  - `shots/S*.py`: one file per shot.
- **Edit (Remotion)**, in `src/lastflight/`:
  - Plays the frame sequences.
  - Per-scene colour grades (cockpit red/teal, dust amber, chase teal-orange, dusk gold, space blue), film grain and vignette.
  - Camera shake, a whip pan, flash cuts and the cockpit warning-light overlay.
  - Dust, debris and mote particles.
  - Film-style subtitles (radio lines in italics).
  - Two small science supers and the title card.
- **Dialogue** (`lastflight/tools/build_dialogue.py`): Piper neural TTS.
  - Arjun is the Indian male voice `hi_IN-rohan-medium`; Control is `hi_IN-pratham-medium`.
  - The English lines are written in Devanagari so they come out with a natural Indian accent.
  - Arjun's voice goes through helmet-mic processing; Control's goes through radio processing (300–3,400 Hz band, overdrive, hiss, squelch clicks).
  - Piper's synthesis is random, so each line is generated up to 12 times. The take a Whisper speech recogniser transcribes most accurately is kept.
  - All four lines transcribe word-perfect in the final mix.
- **Score and SFX** (`lastflight/tools/build_audio.py`): fully procedural in numpy/scipy, mixed to −14 LUFS with dialogue ducking.
  - Score: D-minor drones, string ostinati, taiko-style drums, "braam" brass hits, choir pads, piano.
  - Sound design: rotor blade-slap model, turbine whine, alarms, wind, debris, glass, metal creaks, impacts.

## Science notes

- Rotation at Mumbai (19° N) is 1,674 km/h × cos 19° ≈ 1,583 km/h. If the solid Earth stopped, the air would keep that eastward speed relative to the ground, which gives the ≈1,580 km/h winds in the super.
- In the edit, the stop is instantaneous and the planet's orbit is unaffected. It's the film's "what if" premise, not a prediction: no known mechanism could stop Earth's rotation suddenly.
- The fly-bys use real propagation delay (distance ÷ 343 m/s), 1/r loudness and air absorption, so the Doppler shift is physical.
- The main rotor is 4 blades at ≈290 rpm (≈19 Hz blade-pass); the tail rotor is ≈50 Hz.
- The shot from space has no wind or rumble, because sound does not travel in a vacuum.

## Honest limitations

- **Faces and people are stylised, not photoreal.** The characters are a rigged avatar restyled per role, not scanned actors.
- **The girl is the same avatar scaled to child proportions.** Her face is kept out of close-ups for that reason.
- **The hands and grip close-ups (S4C, S5E) are stylised.**
- **The helicopter, city and dust are procedural.** It's a consistent CG look, not live action.
- **Dust is approximated with animated sprites plus distance fog.** True volumetrics were tested and cost about 10× the render time on this CPU-only machine.
- **The frames render at 540 × 960 (Cycles, 4 samples plus denoising).** They're scaled to 1080 × 1920 in the edit with light sharpening at encode. A GPU machine could render at full 1080 × 1920 with higher samples by setting `PCT=100 SAMPLES=32`.
- **The voices are neural TTS, not actors.** They're clear, but with less acting range than a human performance.

## Regenerating

Run everything from `video/`.

```bash
npm ci
bash lastflight/tools/fetch_assets.sh                 # avatar .glb + Piper voices (not committed)
node lastflight/tools/make_textures.js                # decals / MFD screens (committed)
LF_ASR=/path/to/sherpa-onnx-whisper-base.en python3 lastflight/tools/build_dialogue.py   # optional best-take picking
python3 lastflight/tools/build_audio.py               # score + SFX + final mix (-14 LUFS)

# Blender plates (Python 3.13 + bpy 5.3). Resumable; ~10 s/frame on 4 CPU cores at these settings.
python3 -m venv /opt/bpyenv && /opt/bpyenv/bin/pip install bpy==5.3.0
SAMPLES=4 PCT=75 bash lastflight/blender/render_queue.sh S1A S1B S2A S2B S3A S3B S3C S4A S4B S4C S4D S4E S4F \
  S5A S5B S5C S5D S5E S5F S6A S6B
#   one test frame:  /opt/bpyenv/bin/python lastflight/blender/render.py S4A --only 40 --pct 50 --out _test

# Edit: render in chunks (long single renders can stall in a CPU-only container), join, add the mix
for r in 0-359 360-719 720-1079 1080-1439; do
  npx remotion render src/lastflight/index.ts LastFlightSilent out/lfc/c_$r.mp4 --frames=$r --crf=14 --muted --timeout=120000
done
printf "file 'c_%s.mp4'\n" 0-359 360-719 720-1079 1080-1439 > out/lfc/list.txt
ffmpeg -f concat -safe 0 -i out/lfc/list.txt -i public/lastflight/audio/final_mix.wav -map 0:v -map 1:a \
  -vf "unsharp=5:5:0.5" -c:v libx264 -profile:v high -preset slow -crf 17 -pix_fmt yuv420p -r 24 \
  -c:a aac -b:a 320k -ar 48000 -t 60 -movflags +faststart ../THE_LAST_FLIGHT_FINAL.mp4
```

## Credits / licences

- **Character model:** the Ready Player Me sample avatar from the three.js examples repository. It's downloaded at build time and not redistributed.
- **Voices:** Piper `hi_IN-rohan-medium` and `hi_IN-pratham-medium`, via the sherpa-onnx model releases. They're downloaded at build time.
- **Fonts:** Montserrat and JetBrains Mono (SIL OFL), via @fontsource.
- **Earth textures** (S2A, S6B): NASA Blue Marble / Black Marble, public domain.
- **Everything else is original to this project:**
  - the helicopter, the city, the score and all sound effects
  - the title design and the decals
- There are no third-party logos, watermarks, film scenes or music.
