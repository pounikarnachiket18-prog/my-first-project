"""S2A — 6-10 s. The planet stops. Fast push toward India; the surface freezes (f44) while the cloud
systems keep streaming east and begin to tear into storm bands."""
import math
from mathutils import Vector
import common
from common import reset, sun_light, camera, key_cam_path, ease_out, ease_in_out, lerp, smoothstep
from planet import Planet, space_world, spin_facing, INDIA
FRAMES = 98
STOP = 44
RATE = math.radians(0.55)


def build():
    reset(res=(720, 1280), samples=8, motion_blur=False)
    space_world(0.7)
    to_sun = Vector((-0.5, -0.8, 0.25)).normalized()
    sun_light("Sun", -to_sun, strength=4.4)
    p = Planet(tilt=False)
    p.set_sun(to_sun)
    for f in range(0, FRAMES + 1):
        base = spin_facing(INDIA[1], -30)
        if f <= STOP:
            s, drift = base + RATE * f, 0.0
        else:
            d = f - STOP
            s = base + RATE * STOP + RATE * 0.8 * (1 - math.exp(-d / 0.8))
            drift = -(RATE * 2.2 * d) / (2 * math.pi)  # the air keeps moving east at full speed
        p.key(f, s, drift)
    cam = camera(lens=45)

    def pos(f):
        t = ease_out(f / 70, 2.6)
        dist = lerp(9.5, 2.35, t) - 0.25 * smoothstep(70, 98, f)
        az = math.radians(lerp(-24, -8, ease_in_out(f / FRAMES)))
        el = math.radians(lerp(16, 20, f / FRAMES))
        return (math.sin(az) * math.cos(el) * dist, -math.cos(az) * math.cos(el) * dist, math.sin(el) * dist)

    key_cam_path(cam, range(0, FRAMES + 1), pos, lambda f: (0.05, 0, lerp(0.0, 0.35, ease_in_out(f / FRAMES))),
                 roll_fn=lambda f: math.radians(lerp(-8, -2, ease_out(f / FRAMES))))
