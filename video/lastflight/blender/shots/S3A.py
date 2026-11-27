"""S3A — 13-16 s. Ground-level tracking shot: a man sprints for shelter down a Mumbai street as the gale tears it apart."""
import math, random
from mathutils import Vector
import bpy
from common import camera, key_cam_path, lerp
import lf_common as L
import lf_world as W
import india, mumbai as MU, character as C
FRAMES = 74


def build():
    L.setup(samples=5, blur=True)
    rng = random.Random(31)
    W.dusk_dust_light(sun_elev=10, sun_az=190, sun=2.2)
    st, loose = MU.build(rng, x_min=-60, x_max=180, crowd=6, clutter_n=120)
    W.skyline(rng, n=50, rings=(90, 500), cx=60, cy=0, keep_clear=[(60, 0, 80)])
    frames = list(range(0, FRAMES + 1))
    # the wind blows east (+X); he runs west, toward the camera's left, against it — then ducks into an arcade
    runner = C.Person("white_kurta", "brown", True, loc=(20, -6.4, 0.2), heading=-math.pi / 2)
    track = []
    for f in frames[::2]:
        x = 20 - 0.21 * f
        runner.key(f, C.run(f * 0.55), loc=(x, -6.4, 0.2))
        track.append((f, x))
    for p in loose["people"]:
        MU.fling_person(p, frames, lambda f: f / 24 * 0.03, rng, ramp=0.4, lift=(0.5, 2.0), spin=(0.5, 2.0))
    gust = lambda f: f / 24 * 0.035
    for v in loose["vehicles"]:
        MU.fling(v, frames, gust, rng, ramp=0.8, lift=(0, 0.4), spin=(0, 0.4))   # cars sliding, losing grip
    for c in loose["clutter"]:
        MU.fling(c, frames, gust, rng, ramp=0.2, lift=(1, 9), spin=(2, 14))
    for sg in loose["signs"]:
        MU.fling(sg, frames, gust, rng, ramp=0.3, lift=(0, 3), spin=(1, 5), delay=rng.uniform(0.0, 0.04))
    for trunk, crowns in loose["trees"]:
        for f in frames:
            trunk.rotation_euler = (0, 0.55 + 0.18 * math.sin(f * 0.7 + trunk.location.x), 0)
            trunk.keyframe_insert("rotation_euler", frame=f)
    cam = camera(lens=35, fstop=2.8, dof_obj=4.5)
    key_cam_path(cam, frames,
                 lambda f: Vector((20 - 0.21 * f + 4.2, -5.4, 1.25)) + L.handheld(f, amp=0.06, seed=3)[0],
                 lambda f: (20 - 0.21 * f - 2.0, -6.6, 1.3), roll_fn=lambda f: math.radians(-6) + L.handheld(f, rot=2.0, seed=4)[1],
                 focus_fn=lambda f: 4.5)
    L.finish(cam, frames, rng, fog=0.004, dust_region=((-40, 60), (-20, 20), (0, 25)), n=40, wind=(0.9, 0, 0.05), smoke=False)
