"""S4D — 29.5-32.5 s. Low-angle tracking from the street: the helicopter roars overhead between damaged skyscrapers."""
import math, random
from mathutils import Vector
from common import camera, key_cam_path, lerp
import lf_common as L
import lf_flight as F
from heli import Heli, key_rotors, key_beacons
FRAMES = 74
S0 = 7.0


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(64)
    L.city(rng, towers=160)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    s_of = lambda f: S0 + f / 24
    F.key_heli(h, frames, s_of); key_rotors(h, frames); key_beacons(h, frames)
    base = F.pos(8.6)
    cam_pos = Vector((base.x + 10, base.y - 26, 4.0))
    cam = camera(lens=20, fstop=8, dof_obj=50)
    key_cam_path(cam, frames, lambda f: cam_pos + Vector((0.08 * f, 0, 0.02 * f)) + L.handheld(f, amp=0.08, seed=41)[0],
                 lambda f: F.pos(s_of(f) + 0.2) + Vector((0, 0, 2)), roll_fn=lambda f: math.radians(8) + L.handheld(f, rot=1.0, seed=42)[1])
    L.finish(cam, frames, rng, dust_region=((base.x - 150, base.x + 150), (base.y - 100, base.y + 120), (0, 80)), n=45, wind=(2.0, 0, 0.15))
