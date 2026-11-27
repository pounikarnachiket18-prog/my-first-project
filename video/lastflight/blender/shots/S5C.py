"""S5C — 42-44 s. Through the cockpit glass: Arjun, holding the hover by force of will, looks down at the girl."""
import math, random
from mathutils import Vector
from common import camera, key_cam_path
import lf_common as L
import lf_flight as F
from heli import Heli, key_rotors, key_beacons, pilot_pose
FRAMES = 50


def build():
    L.setup(samples=8, blur=True)
    rng = random.Random(73)
    L.city(rng, towers=120)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    s_of = lambda f: 19.0 + f / 24
    F.key_heli(h, frames, s_of, amt=1.0); key_rotors(h, frames); key_beacons(h, frames)
    for f in frames[::2]:
        sp = pilot_pose(f / 24, struggle=0.6)
        sp["Head"] = (-0.55, -0.45, -0.7)   # looking down to his right, out of the door side
        sp["Spine2"] = (-0.15, -0.1, 1)
        h.pilot.key(f, sp)
    cam = camera(lens=50, fstop=2.8, dof_obj=4.0)
    key_cam_path(cam, frames, lambda f: F.world(s_of(f), (3.6, -3.4, 1.55)) + L.handheld(f, amp=0.04, seed=81)[0],
                 lambda f: F.world(s_of(f), (1.4, -0.45, 1.78)), roll_fn=lambda f: math.radians(-6) + L.handheld(f, rot=1.0, seed=82)[1],
                 focus_fn=lambda f: 4.0)
    L.finish(cam, frames, rng, smoke=False)
