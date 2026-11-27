"""D1 — "Imagine karo... superfast winds" (20–22.3 s): the air keeps moving at hundreds of km/h:
stripped trees bend flat, signboards and laundry tear away, wires whip."""
import math
from common import camera, key_cam_path, lerp, ease_in_out
import street_scene as S
import mumbai as MU

FRAMES = 72


def sim(f):
    return 0.25 + f / 30 * 0.35


def build():
    rng, st, loose = S.base(blur=True, seed=11, x_min=-60, x_max=120, crowd=0, clutter_n=90)
    S.clear_near(loose, x_max=4, margin_y=(-8.2, -4.6))
    frames = list(range(0, FRAMES + 1))
    for v in loose["vehicles"]:
        MU.fling(v, frames, lambda f: 0.0 if f < 0 else 2.0, rng)  # long gone
    for c in loose["clutter"]:
        MU.fling(c, frames, lambda f: f / 30 * 0.05, rng, ramp=0.05, lift=(0.5, 12), spin=(3, 20), delay=rng.uniform(0, 0.04))
    for sg in loose["signs"]:
        MU.fling(sg, frames, lambda f: f / 30 * 0.05, rng, ramp=0.06, lift=(0, 3), spin=(1, 8), delay=rng.uniform(0.0, 0.05))
    for trunk, crowns in loose["trees"]:
        ph = trunk.location.x
        for f in frames:
            trunk.rotation_euler = (0.05 * math.sin(f * 1.3 + ph), 0.62 + 0.16 * math.sin(f * 0.85 + ph) + 0.06 * math.sin(f * 2.3), 0)
            trunk.keyframe_insert("rotation_euler", frame=f)
        for i, c in enumerate(crowns):
            for f in frames:
                c.scale = (1.0 + 0.12 * math.sin(f * 1.7 + i), 1.0, 0.85 + 0.08 * math.sin(f * 2.1 + i))
                c.keyframe_insert("scale", frame=f)
    cam = camera(lens=18, fstop=4, dof_obj=12)
    key_cam_path(cam, frames,
                 lambda f: (lerp(6, 8, f / FRAMES), -3.5, 0.6),
                 lambda f: (lerp(16, 18, f / FRAMES), 6.0, lerp(5.5, 6.5, f / FRAMES)),
                 roll_fn=lambda f: math.radians(-6 + 3 * math.sin(f * 0.6)))
