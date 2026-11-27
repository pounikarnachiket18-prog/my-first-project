"""C3 — "...lekin hum, buildings aur atmosphere apni purani speed se aage badhte rahenge!" (17–20 s)
Wide slow-motion view: buses, taxis, autos, people and signboards all streaming east."""
import math
from common import camera, key_cam_path, lerp, ease_in_out
import street_scene as S
import mumbai as MU

FRAMES = 94


def sim(f):
    return 0.04 + f / 30 * 0.075


def build():
    rng, st, loose = S.base(blur=True, seed=9, x_min=-90, x_max=170, crowd=14, clutter_n=180)
    S.clear_near(loose, x_max=-2, margin_y=(-8.2, -4.6))
    import bpy
    keep = []
    for v in loose["vehicles"]:
        if v.location.y < 0 and v.location.x < 14:
            bpy.data.objects.remove(v, do_unlink=True)
        else:
            keep.append(v)
    loose["vehicles"] = keep
    frames = list(range(0, FRAMES + 1))
    for v in loose["vehicles"]:
        MU.fling(v, frames, sim, rng, ramp=0.1, lift=(0.5, 7), spin=(0.5, 4))
    for p in loose["people"]:
        MU.fling_person(p, frames, sim, rng)
    for c in loose["clutter"]:
        MU.fling(c, frames, sim, rng, ramp=0.05, lift=(0.5, 9), spin=(3, 20))
    for sg in loose["signs"]:
        MU.fling(sg, frames, sim, rng, ramp=0.06, lift=(0, 2), spin=(1, 6), delay=rng.uniform(0.0, 0.1))
    for trunk, crowns in loose["trees"]:
        MU.bend_tree(trunk, crowns, frames, sim, rng, max_angle=rng.uniform(0.7, 1.1))
    cam = camera(lens=20, fstop=5.6, dof_obj=20)
    key_cam_path(cam, frames,
                 lambda f: (lerp(-6, -3, ease_in_out(f / FRAMES)), -5.3, lerp(1.8, 2.8, ease_in_out(f / FRAMES))),
                 lambda f: (lerp(26, 30, f / FRAMES), 3.5, lerp(4.5, 5.5, f / FRAMES)),
                 roll_fn=lambda f: math.radians(-2))
