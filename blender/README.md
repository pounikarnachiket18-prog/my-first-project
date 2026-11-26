# Metal detector explainer: Blender 3D remake

A full 3D rebuild of the 54-second vertical explainer "How a metal detector works", made in Blender
(Cycles) and timed shot-for-shot to the original narration.

Everything is procedural: there are no downloaded models. `build_scene.py` creates the room, the walk-through
gate (keypad, red alarm, antenna box with LEDs, internal coils), the character (shirt, belt, buckle, holstered gun,
pocket coins and ID card), the macro "X-ray" set, the magnetic field lines, the eddy currents, the measuring gauge and
the radio waves. It also adds one camera per shot, with each cut bound to a timeline marker.

## Shot list (30 fps, 1614 frames)

| Frames | Shot |
|---|---|
| 0–93 | Wide: man walks into the gate |
| 94–155 | Control panel, red light blinking |
| 156–209 | Hand to the trouser pocket |
| 210–220 | Flash: coins and ID card |
| 221–314 | Holstered gun, pan to the buckle |
| 315–355 | Belt buckle close-up |
| 356–417 | Wide: man standing in the gate |
| 418–565 | Push into the pocket, X-ray reveal, then macro of coins and ID |
| 566–982 | Science: pillars turn pink, coils show, field lines; the man walks in |
| 983–1183 | Macro: eddy currents swirling in the coin |
| 1184–1236 | Alarm: red light blinking |
| 1237–1327 | Antenna box: LEDs and radio waves |
| 1328–1435 | Macro: gauge measuring across the coin |
| 1436–1552 | Pocket X-ray, then macro |
| 1553–1613 | Antenna box: LEDs fully lit, waves |

## Build and render

```bash
pip install bpy==5.3.0 pillow          # Blender as a Python module (Python 3.13)
python build_scene.py --out scene.blend --assets assets
python render.py --blend scene.blend --out frames            # resumable; --range 0:807 --threads 2 to split
./encode.sh frames <original_video.mp4> metal-detector-3d.mp4
```

Frames render at 720×1280 (10 samples, OpenImageDenoise) and are upscaled to 1080×1920 during encoding.
Rendering takes about 8 s per frame on a 4-core CPU. The brand name is the `BRAND` constant at the top of
`build_scene.py`.
