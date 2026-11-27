"""D3 — coastal city, a wave wall races in (24.3–25.8 s) "...duniya bhar mein unimaginable destruction".
Sea is to the WEST (−X): the ocean keeps its eastward momentum and slams into the coast.
"""
import math, random
import bpy
from mathutils import Vector
from common import reset, gradient_world, sun_light, camera, key_cam_path, lerp, ease_in, cube, set_mat, principled
from ocean import ocean, key_ocean_time, wave_wall, spray
from city import building, person, lamp, WALLS, mats, fling

FRAMES = 50
HIT = 40


def build():
    reset(motion_blur=True, samples=16)
    gradient_world(top=(0.025, 0.03, 0.04), horizon=(0.33, 0.35, 0.37), strength=1.0)
    sun_light("Sun", (0.6, 0.3, -0.25), strength=1.6, color=(0.85, 0.9, 1.0), angle_deg=6)
    rng = random.Random(21)
    o, md = ocean(size=160, repeat=6, wave_scale=6, chop=1.6, wind=40, res=10, alignment=0.7, direction=0.0)
    o.location = (-160 * 3 + 2, 0, -0.5)
    key_ocean_time(md, range(0, FRAMES + 1), lambda f: 5 + f / 30 * 1.3)
    # promenade, railing, sea wall
    conc = principled("Promenade", (0.38, 0.37, 0.35), rough=0.35)  # wet
    wall = cube("SeaWall", (3, 900, 3.5), (1.5, 0, 0.75)); set_mat(wall, mats()["concrete"])
    prom = cube("Prom", (16, 900, 0.4), (10, 0, 2.3)); set_mat(prom, conc)
    for y in range(-300, 300, 3):
        p = cube(f"Rail{y}", (0.08, 0.08, 1.1), (3.2, y, 3.05)); set_mat(p, mats()["metal"])
    rail = cube("RailTop", (0.1, 900, 0.08), (3.2, 0, 3.6)); set_mat(rail, mats()["metal"])
    for k, y in enumerate(range(-280, 300, 26)):
        lamp(f"PL{k}", (16.5, y, 2.5), side=1)
    # skyline along the coast (facades face the sea)
    x = -300
    i = 0
    while x < 320:
        w = rng.uniform(16, 32)
        h = rng.choice([rng.uniform(20, 40), rng.uniform(40, 90), rng.uniform(80, 150)])
        b = building(f"CB{i}", 0, w, 0, rng.uniform(16, 26), h, rng.choice(WALLS), 1, seed=rng.random() * 100)
        b.rotation_euler = (0, 0, -math.pi / 2)
        b.location = (rng.uniform(22, 30), x + w / 2, 0)
        x += w + rng.uniform(2, 10)
        i += 1
    # people on the promenade, frozen looking at the wave
    for k in range(14):
        person(f"PP{k}", (rng.uniform(5, 14), rng.uniform(-30, 40), 2.5), rng, heading=math.pi)
    # the wave wall: grows and races in from the west at ~400+ m/s
    ww = wave_wall(length=1400, height=62, loc=(-900, 0, -2))
    for f in range(0, FRAMES + 1):
        t = min(1.0, f / HIT)
        ww.location.x = lerp(-1100, -26, t ** 1.15)
        s = lerp(0.65, 1.0, min(1.0, t * 1.2))
        ww.scale = (s, 1, s)
        ww.keyframe_insert("location", frame=f)
        ww.keyframe_insert("scale", frame=f)
    # spray blobs riding the crest
    sp = spray("Spray", 90, ((-60, 0), (-220, 220), (40, 75)), rng, size=(1.5, 5.0))
    for s_ob in sp:
        x0 = s_ob.location.x
        for f in range(0, FRAMES + 1):
            t = min(1.0, f / HIT)
            s_ob.location.x = x0 + lerp(-1100, -26, t ** 1.15) + 20
            s_ob.keyframe_insert("location", frame=f)
    cam = camera(lens=17, fstop=5.6, dof_obj=90)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (8 - 0.04 * f, -40 + 0.06 * f, 3.4 + 0.015 * f),
                 lambda f: (-70, 140, lerp(18, 46, ease_in(f / HIT, 2))),
                 roll_fn=lambda f: math.radians(-2 + 1.5 * math.sin(f * 0.3) * (f / FRAMES)))
