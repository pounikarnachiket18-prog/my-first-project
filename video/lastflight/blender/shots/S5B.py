"""S5B — 40-42 s. From the roof, looking up into the downwash: the rescue cable unreels, the harness whipping in the wind."""
import math, random
from mathutils import Vector
from common import camera, key_cam_path, lerp
import lf_common as L
import lf_flight as F
from heli import Heli, key_rotors, key_beacons
from S5A import G
FRAMES = 50


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(72)
    L.city(rng, towers=150)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    s_of = lambda f: 17.0 + f / 24
    F.key_heli(h, frames, s_of, amt=1.3); key_rotors(h, frames); key_beacons(h, frames)
    for f in frames:
        h.set_cable(f, lerp(1.0, 12.0, min(1, f / 44)), swing=(0.35 * math.sin(f * 0.33), 0.25 * math.sin(f * 0.21 + 1)))
    cam = camera(lens=24, fstop=5.6, dof_obj=12)
    key_cam_path(cam, frames, lambda f: G + Vector((2.8, -2.6, 1.2)) + L.handheld(f, amp=0.08, seed=71)[0],
                 lambda f: F.pos(s_of(f)) + Vector((0, -1.5, -2.0 - 0.12 * f)), roll_fn=lambda f: math.radians(12) + L.handheld(f, rot=2, seed=72)[1])
    L.finish(cam, frames, rng, dust_region=((G.x - 25, G.x + 25), (G.y - 25, G.y + 25), (G.z, G.z + 20)), n=30, wind=(1.5, 0.5, 0.2))
