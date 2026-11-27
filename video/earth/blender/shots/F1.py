"""F1 — "6 mahine din ... 6 mahine raat" (37–40.5 s): one hemisphere baked in endless daylight,
the other frozen in darkness."""
import math
from mathutils import Vector
from common import reset, sun_light, camera, key_cam_path, ease_in_out, lerp
from planet import Planet, space_world, spin_facing, INDIA

FRAMES = 109


def build():
    reset(res=(720, 1280), samples=8, motion_blur=False)
    space_world(0.7)
    to_sun = Vector((1.0, -0.12, 0.05)).normalized()
    sun_light("Sun", -to_sun, strength=5.0)
    p = Planet(tilt=False, heat=0.35, frost=0.85, night=0.5, cloud_amt=0.6, atmo=1.1)
    p.set_sun(to_sun)
    p.key(0, spin_facing(INDIA[1], 25))
    cam = camera(lens=42)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(-0.6, 0.4, ease_in_out(f / FRAMES)), lerp(-5.4, -4.6, ease_in_out(f / FRAMES)), lerp(0.5, 0.8, f / FRAMES)),
                 lambda f: (0, 0, 0))
