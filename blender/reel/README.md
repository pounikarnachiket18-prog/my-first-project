# Mindset Mode | Explainers: metal detector Instagram Reel

The upgraded, Reel-ready cut of the metal detector explainer: 1080×1920, 30 fps, H.264 and AAC, 47.2 s.
It is built from the same procedural Blender project as the first remake in `../build_scene.py`, which is left
untouched. The source video and the earlier render are not modified.

## What it shows

The voice is the original Hindi narration; captions are in English. The film explains the science in five steps, and an on-screen tracker follows along:

1. **Field.** The left panel holds a flat transmitter coil. Current pulses round it, slowed down so the eye can
   follow, and it sends a magnetic field (cyan) across the walkway. The right panel holds the receiver coil.
2. **Metal.** A person walks in. The field lines bend around the coins in his pocket and turn amber there.
3. **Current.** A match cut moves into the coin. Eddy currents (amber) circulate in its face and surge with every
   pulse. The incoming field bulges around the coin.
4. **Sensor.** The coin's own opposing field (rose) arches out of it. The receiver coil lights up, and a signal
   runs up the cable to the control unit.
5. **Alarm.** The red light, the alarm, the signal trace and the strength bar all react. The zone LEDs light at
   hip height, where the metal is. A meter then compares a coin, a belt and a bigger metal object.

The colours carry meaning: cyan is the transmitter field, amber is induced current, rose is the metal's own field
and red is the alarm. All on-screen text is English: the captions, labels, step tracker, meter and end card.

## Pipeline

| Step | Script | Output |
|---|---|---|
| Narration: shorter pauses, 1.2× speed with pitch preserved, 3 s cold open, English caption timing | `prep_audio.py` | `build/narration.wav`, `build/timeline.json` |
| 3D scene: set, character, gate, physics visuals, 29 cameras on timeline markers | `build_reel.py` | `build/reel.blend` |
| Screen positions of the label anchors | `anchors.py` | `build/anchors.json` |
| Cycles frames, 720×1280 (resumable) | `../render.py` | `build/frames/` |
| Sound design synthesised in numpy, ducked under the voice, about −14 LUFS | `sound.py` | `build/mix.wav` |
| Upscale to 1080×1920, typography and graphics, final encode | `post.py` | `../out/metal-detector-reel-mindsetmode.mp4` |

`cuts.py` holds the shared cut list, alarm windows, labels, steps and hook text. The 3D scene, the sound and the
graphics all read their timing from it.

```bash
pip install bpy==5.3.0 pillow            # Blender as a Python module (Python 3.13); numpy comes with bpy
PYTHON=python ./make_reel.sh <original_video.mp4>
```

On a 4-core CPU, rendering takes about 15 s per frame per process. With two processes running in parallel, the
full render takes about 4 hours. `post.py --png DIR --only 30,600,1000` writes a few finished frames for review.

## Sound

All audio except the narration is synthesised in code, so there is nothing to license:

- airport room tone, crowd murmur and a PA chime
- footsteps synced to the walk cycles
- an A-minor music bed that builds through the physics and resolves to A major
- the transmitter hum, with a soft tick on every pulse
- energy swells and an eddy-current crackle
- whooshes on camera moves and low impacts on key cuts
- a two-tone detector alarm synced to the red light

`build/stems/` keeps each layer as a separate track.
