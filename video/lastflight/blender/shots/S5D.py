"""S5D — 44-46 s. The girl fights the wind, then stretches up toward the swinging harness."""
import math, random
from mathutils import Vector
from common import camera, key_cam_path, lerp
import lf_common as L
import lf_flight as F
from heli import Heli, key_rotors, key_beacons
import character as C
from S5A import G, girl_wind
FRAMES = 50


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(74)
    L.city(rng, towers=150)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    s_of = lambda f: 21.0 + f / 24
    F.key_heli(h, frames, s_of, amt=1.1); key_rotors(h, frames); key_beacons(h, frames)
    for f in frames:
        h.set_cable(f, 12.6 + 0.3 * math.sin(f * 0.2), swing=(0.18 * math.sin(f * 0.37), 0.14 * math.sin(f * 0.23 + 1)))
    g = C.make_girl(loc=tuple(G), heading=math.radians(160))
    girl_wind(g, frames, lambda f: C.brace(f / 24, 1.0) if f < 20 else C.reach_up(f / 24, min(1, (f - 20) / 14)))
    cam = camera(lens=45, fstop=2.8, dof_obj=4.2)
    key_cam_path(cam, frames, lambda f: G + Vector((3.4, -2.2, 1.0 + 0.01 * f)) + L.handheld(f, amp=0.05, seed=91)[0],
                 lambda f: G + Vector((0, 0, 1.15 + 0.01 * f)), roll_fn=lambda f: math.radians(5) + L.handheld(f, rot=1.5, seed=92)[1],
                 focus_fn=lambda f: 4.2)
    L.finish(cam, frames, rng, dust_region=((G.x - 20, G.x + 20), (G.y - 20, G.y + 20), (G.z, G.z + 14)), n=30, wind=(1.6, 0.5, 0.2))
