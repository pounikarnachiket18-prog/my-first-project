"""G2 — ending (46.7–50 s): Earth spinning again, sunrise glow along the limb, slow pull-back into space."""
import math
from mathutils import Vector
from common import reset, sun_light, camera, key_cam_path, ease_in_out, lerp
from planet import Planet, space_world, spin_facing, INDIA

FRAMES = 104


def build():
    reset(res=(720, 1280), samples=8, motion_blur=False)
    space_world(0.7)
    to_sun = Vector((0.75, -0.45, 0.3)).normalized()  # from the right: day side + dawn terminator on the left
    sun_light("Sun", -to_sun, strength=5.0)
    p = Planet(tilt=False, night=2.6, atmo=1.4)
    p.set_sun(to_sun)
    rate = math.radians(0.35)
    for f in range(0, FRAMES + 1):
        p.key(f, spin_facing(INDIA[1], -20) + rate * f)
    cam = camera(lens=45)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(0.4, 0.9, f / FRAMES), -lerp(2.6, 7.5, ease_in_out(f / FRAMES)), lerp(0.3, 1.0, f / FRAMES)),
                 lambda f: (lerp(0.35, 0.0, ease_in_out(f / FRAMES)), 0, lerp(0.1, 0.0, f / FRAMES)))
