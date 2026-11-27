"""S4E — 32.5-35 s. Wide aerial: one small helicopter in a dying city; a second helicopter far off."""
import math, random
from mathutils import Vector
from common import camera, key_cam_path, lerp
import lf_common as L
import lf_flight as F
from heli import Heli, key_rotors, key_beacons
FRAMES = 62
S0 = 10.0


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(65)
    L.city(rng, towers=170)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    s_of = lambda f: S0 + f / 24
    F.key_heli(h, frames, s_of); key_rotors(h, frames); key_beacons(h, frames)
    h2 = Heli("Heli2", paint=(0.2, 0.2, 0.22), with_pilot=False, cable=False)
    for f in frames:  # the other aircraft fighting the wind far away
        h2.root.location = (420 - 1.6 * f, 380 + 0.4 * f, 95 + 2.0 * math.sin(f * 0.2))
        h2.root.rotation_euler = (0.2 * math.sin(f * 0.15), 0.12, math.radians(165))
        h2.root.keyframe_insert("location", frame=f); h2.root.keyframe_insert("rotation_euler", frame=f)
    key_rotors(h2, frames); key_beacons(h2, frames)
    a = F.pos(S0 + 1.2)
    cam = camera(lens=35)
    key_cam_path(cam, frames, lambda f: Vector((a.x - 80 + 0.6 * f, a.y - 110, 110 - 0.3 * f)),
                 lambda f: F.pos(s_of(f)) + Vector((10, 10, -4)), roll_fn=lambda f: math.radians(-4))
    L.finish(cam, frames, rng, fog=0.0018, dust_region=((a.x - 300, a.x + 400), (a.y - 200, a.y + 500), (0, 120)), n=60, wind=(2.2, 0, 0.1))
