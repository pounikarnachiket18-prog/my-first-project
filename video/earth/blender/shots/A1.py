"""A1 — HOOK (0–5 s): dolly in on Earth with India in view; the spin freezes on "band" (f80).
The clouds (atmosphere) don't stop with the surface: they keep drifting east and slowly decay."""
import math
from mathutils import Vector
from common import reset, sun_light, camera, key_cam_path, ease_out, ease_in_out, lerp, smoothstep
from planet import Planet, space_world, spin_facing, INDIA

FRAMES = 154
FREEZE = 80
RATE = math.radians(0.42)


def spin(f):
    if f <= FREEZE:
        return spin_facing(INDIA[1], -34) + RATE * f
    d = f - FREEZE
    return spin_facing(INDIA[1], -34) + RATE * FREEZE + RATE * 1.1 * (1 - math.exp(-d / 1.1))


def build():
    reset(res=(720, 1280), samples=8, motion_blur=False)
    space_world(0.65)
    to_sun = Vector((-0.55, -0.75, 0.3)).normalized()
    sun_light("Sun", -to_sun, strength=4.2)
    p = Planet(tilt=False)
    p.set_sun(to_sun)
    for f in range(0, FRAMES + 1):
        drift = 0.0 if f <= FREEZE else -(RATE * 30 * (1 - math.exp(-(f - FREEZE) / 30))) / (2 * math.pi)
        p.key(f, spin(f), drift)
    cam = camera(lens=50, fstop=11, dof_obj=6)

    def pos(f):
        t = ease_out(f / 92, 3.2)
        d = lerp(11.5, 3.55, t) - 0.12 * smoothstep(92, 154, f)
        az = math.radians(lerp(-18, -4, ease_in_out(f / 154)))
        el = math.radians(lerp(12, 6, ease_in_out(f / 154)))
        return (math.sin(az) * math.cos(el) * d, -math.cos(az) * math.cos(el) * d, math.sin(el) * d)

    key_cam_path(cam, range(0, FRAMES + 1), pos, lambda f: (0, 0, 0.1 * smoothstep(30, 150, f)),
                 roll_fn=lambda f: math.radians(lerp(-5, 0, ease_out(f / 100))))
