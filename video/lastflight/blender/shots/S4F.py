"""S4F — 35-37 s. Side profile tracking: rotor blades scything through dust; Arjun in the side window.
"I'm not leaving her behind!" """
import math, random
from mathutils import Vector
from common import camera, key_cam_path
import lf_common as L
import lf_flight as F
from heli import Heli, key_rotors, key_beacons, pilot_pose
FRAMES = 50
S0 = 12.5


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(66)
    L.city(rng, towers=150)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    s_of = lambda f: S0 + f / 24
    F.key_heli(h, frames, s_of, amt=1.4); key_rotors(h, frames); key_beacons(h, frames)
    for f in frames[::2]:
        sp = pilot_pose(f / 24, struggle=0.8)
        sp["Head"] = (0.35, -0.6, 0.6)   # glancing toward the camera side (his right)
        h.pilot.key(f, sp)
    cam = camera(lens=50, fstop=4, dof_obj=13)
    key_cam_path(cam, frames, lambda f: F.world(s_of(f), (1.0, -13.0, 2.2), amt=0.3) + L.handheld(f, amp=0.12, seed=51)[0],
                 lambda f: F.world(s_of(f), (0.6, 0, 2.2), amt=0.3), roll_fn=lambda f: math.radians(3) + L.handheld(f, rot=1.0, seed=52)[1],
                 focus_fn=lambda f: 13)
    p = F.pos(S0 + 1)
    L.finish(cam, frames, rng, dust_region=((p.x - 60, p.x + 60), (p.y - 40, p.y + 30), (p.z - 25, p.z + 25)), n=40, wind=(2.4, 0, 0.1))
