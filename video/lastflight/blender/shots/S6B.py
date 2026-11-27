"""S6B — 53-56 s. Earth from space: violent atmospheric bands sweep east over a planet that no longer turns.
Slow pull-back into darkness."""
import math
from mathutils import Vector
from common import reset, sun_light, camera, key_cam_path, ease_in_out, lerp
from planet import Planet, space_world, spin_facing, INDIA
FRAMES = 74


def build():
    reset(res=(720, 1280), samples=8, motion_blur=False)
    space_world(0.75)
    to_sun = Vector((0.85, -0.35, 0.25)).normalized()   # dramatic side light: half the planet in night
    sun_light("Sun", -to_sun, strength=5.0)
    p = Planet(tilt=False, night=1.0, atmo=1.3)
    p.set_sun(to_sun)
    for f in range(0, FRAMES + 1):
        p.key(f, spin_facing(INDIA[1], 10), -0.0045 * f - 0.3)
    cam = camera(lens=50)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(0.3, 0.6, f / FRAMES), -lerp(3.6, 6.4, ease_in_out(f / FRAMES)), lerp(0.9, 1.4, f / FRAMES)),
                 lambda f: (0, 0, 0), roll_fn=lambda f: math.radians(lerp(10, 6, f / FRAMES)))
