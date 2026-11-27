"""S3B — 16-18.5 s. Low angle, Dutch tilt: debris, shop signs and glass rain overhead; a street light topples."""
import math, random
from mathutils import Vector
import bpy
from common import camera, key_cam_path, lerp, principled
import lf_common as L
import lf_world as W
import mumbai as MU
FRAMES = 62


def build():
    L.setup(samples=5, blur=True)
    rng = random.Random(41)
    W.dusk_dust_light(sun_elev=12, sun_az=200, sun=2.4)
    st, loose = MU.build(rng, x_min=-60, x_max=140, crowd=0, clutter_n=160)
    W.skyline(rng, n=40, rings=(80, 400), cx=40, cy=0, keep_clear=[(40, 0, 70)])
    frames = list(range(0, FRAMES + 1))
    gust = lambda f: f / 24 * 0.04
    for c in loose["clutter"]:
        c.location.z += rng.uniform(2, 14)
        MU.fling(c, frames, gust, rng, ramp=0.15, lift=(0, 6), spin=(3, 20))
    for sg in loose["signs"]:
        MU.fling(sg, frames, gust, rng, ramp=0.2, lift=(0, 4), spin=(2, 8), delay=rng.uniform(0, 0.03))
    # glass shards dropping from the facades
    glass = principled("Shard", (0.6, 0.7, 0.72), rough=0.02, spec=1.0)
    for i in range(90):
        bpy.ops.mesh.primitive_plane_add(size=rng.uniform(0.15, 0.5), location=(rng.uniform(-10, 30), rng.choice([-1, 1]) * rng.uniform(5, 8), rng.uniform(8, 30)))
        g = bpy.context.active_object; g.data.materials.append(glass)
        MU.fling(g, frames, lambda f: f / 24 * 0.02, rng, ramp=0.3, lift=(-8, -2), spin=(4, 20))
    # a street light topples across the frame
    pole = loose["poles"][2] if len(loose["poles"]) > 2 else loose["poles"][0]
    base = min((v.co for v in pole.data.vertices), key=lambda c: c.z).copy()
    base.z = 0.0
    for v in pole.data.vertices:  # pivot at the foot of the pole
        v.co -= base
    pole.location = base
    for f in frames:
        a = min(1.35, max(0.0, (f - 14) / 30) ** 1.6 * 1.35)
        pole.rotation_euler = (0, a, 0)
        pole.keyframe_insert("rotation_euler", frame=f)
    px = base.x
    cam = camera(lens=18, fstop=4, dof_obj=10)
    key_cam_path(cam, frames,
                 lambda f: Vector((px - 6 + 0.04 * f, -3.0, 0.4)) + L.handheld(f, amp=0.05, seed=7)[0],
                 lambda f: (px + 8, 3.0, 14 + 0.05 * f), roll_fn=lambda f: math.radians(14) + L.handheld(f, rot=2.5, seed=8)[1])
    L.finish(cam, frames, rng, fog=0.004, dust_region=((-30, 60), (-20, 20), (2, 40)), n=30, wind=(1.0, 0, 0.1), smoke=False)
