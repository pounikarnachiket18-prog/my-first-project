"""B2 — "Equator par lagbhag 1,670 km/h" (8.5–12 s): the equator lights up as Earth turns eastward."""
import math
from mathutils import Vector
from common import reset, sun_light, camera, key_cam_path, ease_in_out, lerp, smoothstep, emission_mat
from planet import Planet, space_world, spin_facing, INDIA, marker, ring

FRAMES = 109


def build():
    reset(res=(720, 1280), samples=8, motion_blur=False)
    space_world(0.6)
    to_sun = Vector((-0.6, -0.7, 0.25)).normalized()
    sun_light("Sun", -to_sun, strength=4.2)
    p = Planet(tilt=False)
    p.set_sun(to_sun)
    rate = math.radians(0.3)
    for f in range(0, FRAMES + 1):
        p.key(f, spin_facing(INDIA[1], -12) + rate * f)
    marker(p, *INDIA)
    eq = ring("Equator", 1.006, 0.0045, (1.0, 0.78, 0.25), 0.0)
    em = eq.active_material.node_tree.nodes["Emission"]
    for f, v in ((0, 0.0), (8, 0.0), (22, 14.0), (FRAMES, 14.0)):
        em.inputs[1].default_value = v
        em.inputs[1].keyframe_insert("default_value", frame=f)
    cam = camera(lens=45)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(-0.9, -0.2, ease_in_out(f / FRAMES)), lerp(-2.55, -2.45, f / FRAMES), lerp(0.55, 0.35, ease_in_out(f / FRAMES))),
                 lambda f: (0.0, 0.0, lerp(0.08, -0.02, f / FRAMES)),
                 roll_fn=lambda f: math.radians(lerp(6, 2, f / FRAMES)))
