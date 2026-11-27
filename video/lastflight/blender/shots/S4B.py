"""S4B — 26-28 s. Over-the-shoulder cockpit POV: towers loom through the windscreen, alarms, violent turbulence.
Radio: "Captain! You're losing altitude!" """
import math, random
from mathutils import Vector
from common import camera, key_cam_path
import lf_common as L
import lf_flight as F
from heli import Heli, key_rotors, key_beacons, pilot_pose
from S1A import warn_flash
FRAMES = 50
S0 = 4.0


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(62)
    L.city(rng, towers=150)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    s_of = lambda f: S0 + f / 24
    F.key_heli(h, frames, s_of, amt=2.2)
    key_rotors(h, frames); warn_flash(h, frames)
    for f in frames[::2]:
        h.pilot.key(f, pilot_pose(f / 24, struggle=1.0))
    cam = camera(lens=22, fstop=4, dof_obj=6)
    key_cam_path(cam, frames, lambda f: F.world(s_of(f), (0.7, -0.05, 2.05), amt=2.2) + L.handheld(f, amp=0.02, seed=21)[0],
                 lambda f: F.world(s_of(f), (9, -0.9, 0.9), amt=2.2),
                 roll_fn=lambda f: F.attitude(s_of(f), 2.2)[0] * 0.8, focus_fn=lambda f: 6)
    L.finish(cam, frames, rng, dust_region=((-220, 80), (-80, 80), (20, 120)), n=40, wind=(2.0, 0, 0.1))
