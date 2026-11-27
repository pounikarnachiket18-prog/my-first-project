"""S1B — 4-6 s. Instruments failing: displays flicker, master warnings strobe, then the power dips to black."""
import math
from mathutils import Vector
from common import camera, key_cam_path, lerp
import lf_common as L
import lf_world as W
from heli import Heli, pilot_pose
from S1A import warn_flash
FRAMES = 50


def build():
    L.setup(samples=10, blur=False)
    W.dusk_dust_light(sun_elev=8, sun_az=160, sun=1.2, sky=0.35)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    h.pilot.pose(pilot_pose(0.0, 0.3))
    warn_flash(h, frames, blackout=(36, 44))
    cam = camera(lens=40, fstop=2.2, dof_obj=0.55, clip=(0.01, 3000))
    key_cam_path(cam, frames,
                 lambda f: Vector((1.82, -0.05, 1.56)) + L.handheld(f, amp=0.008, seed=5)[0] + Vector((0.0015 * f, 0, 0)),
                 lambda f: (2.26, -0.2, 1.4), roll_fn=lambda f: math.radians(6) + L.handheld(f, rot=1.2, seed=6)[1])
