"""S5A — 37-40 s. The rooftop. The girl, small against the gale, looks up as the helicopter flares into a hover above her."""
import math, random
from mathutils import Vector
from common import camera, key_cam_path, lerp, ease_in_out
import lf_common as L
import lf_flight as F
from heli import Heli, key_rotors, key_beacons
import character as C
FRAMES = 74
G = L.ROOF + Vector((1.8, -3.7, 0.0))   # where the girl stands, under the hoist


def girl_wind(g, frames, pose_fn):
    for f in frames[::2]:
        g.key(f, pose_fn(f))
        g.ponytail.rotation_euler = (0.35 * math.sin(f * 1.3), 0.5 + 0.25 * math.sin(f * 0.9), 0)
        g.ponytail.keyframe_insert("rotation_euler", frame=f)


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(71)
    L.city(rng, towers=150)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    s_of = lambda f: 14.4 + f / 24 * 1.0
    F.key_heli(h, frames, s_of, amt=1.2); key_rotors(h, frames); key_beacons(h, frames)
    g = C.make_girl(loc=tuple(G), heading=math.radians(200))
    girl_wind(g, frames, lambda f: C.look_up() if f < 30 else C.brace(f / 24, 0.8))
    cam = camera(lens=18, fstop=4, dof_obj=11)
    key_cam_path(cam, frames, lambda f: G + Vector((lerp(-5.6, -5.0, f / FRAMES), 3.0, 0.8)) + L.handheld(f, amp=0.05, seed=61)[0],
                 lambda f: G + Vector((0.6, -0.8, lerp(4.0, 5.0, ease_in_out(f / FRAMES)))),
                 roll_fn=lambda f: math.radians(-4) + L.handheld(f, rot=1.2, seed=62)[1], focus_fn=lambda f: 11)
    L.finish(cam, frames, rng, dust_region=((G.x - 30, G.x + 30), (G.y - 30, G.y + 30), (G.z, G.z + 18)), n=34, wind=(1.6, 0.4, 0.15))
