"""S4A — 22-26 s. Whip pan into an aerial chase: the rescue helicopter knifes through a canyon of damaged towers."""
import math, random
from mathutils import Vector
from common import camera, key_cam_path, lerp, smoothstep
import lf_common as L
import lf_flight as F
from heli import Heli, key_rotors, key_beacons
FRAMES = 98
S0 = 0.0


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(61)
    L.city(rng, towers=150)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    s_of = lambda f: S0 + f / 24
    F.key_heli(h, frames, s_of)
    key_rotors(h, frames); key_beacons(h, frames)
    cam = camera(lens=35, fstop=5.6, dof_obj=20)

    def cpos(f):
        s = s_of(f)
        return F.world(s, (-19, 7, 5.5)) + L.handheld(f, amp=0.35, seed=11)[0]

    def ctgt(f):
        s = s_of(f)
        whip = (1 - smoothstep(0, 8, f)) * 40.0  # first frames: camera swings in from the left
        return F.world(s, (2, 0, 1.5)) + Vector((0, whip, 0))

    key_cam_path(cam, frames, cpos, ctgt, roll_fn=lambda f: math.radians(-5) + L.handheld(f, rot=1.5, seed=12)[1], focus_fn=lambda f: 20)
    L.finish(cam, frames, rng, dust_region=((-300, 60), (-80, 80), (20, 140)), n=50, wind=(2.0, 0, 0.1))
