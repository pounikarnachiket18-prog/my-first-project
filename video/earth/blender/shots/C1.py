"""C1 — normal morning traffic (12.0–13.3 s). Low tracking shot moving east with the traffic."""
import math, random
from mathutils import Vector
from common import reset, sky_world, sun_light, camera, key_cam_path, lerp
from city import build_street, car, person, fog_all

FRAMES = 48
SPEED = 12.5 / 30  # m per frame


def setup_light():
    # low morning sun in the EAST (+X), a little to the south
    sky_world(sun_elev_deg=9, sun_rot_deg=-80, strength=0.55, dust=2.0)
    el = math.radians(9)
    sun_light("Sun", (-math.cos(el), 0.25, -math.sin(el)), strength=3.2, color=(1.0, 0.78, 0.55), angle_deg=1.5)
    # visible sun disc low over the far end of the street (excluded from distance fog)
    from common import uv_sphere, emission_mat, set_mat
    d = Vector((math.cos(el), 0.0, math.sin(el))).normalized() * 2500
    s = uv_sphere("SunDisc", 28, 32, 16, loc=tuple(d))
    set_mat(s, emission_mat("_nofog", (1.0, 0.85, 0.6), 60))
    s.visible_shadow = False


def populate(rng, moving=True):
    cars, people = [], []
    cols = [(0.6, 0.02, 0.02), (0.02, 0.03, 0.05), (0.8, 0.8, 0.82), (0.05, 0.12, 0.3), (0.35, 0.36, 0.38), (0.9, 0.55, 0.05), (0.02, 0.2, 0.12)]
    for i, x in enumerate([-40, -22, 6, 24, 47, 66, 90, 118, 150]):
        cars.append(("E", car(f"CarE{i}", (x + rng.uniform(-3, 3), 2.8, 0), rng.choice(cols))))
    for i, x in enumerate([-30, -8, 15, 38, 60, 84, 112, 140]):
        cars.append(("W", car(f"CarW{i}", (x + rng.uniform(-3, 3), -2.8, 0), rng.choice(cols), heading=math.pi)))
    for i in range(46):
        side = rng.choice([1, -1])
        x = rng.uniform(-50, 160)
        p = person(f"P{i}", (x, side * rng.uniform(6.6, 9.0), 0.18), rng, pose=rng.uniform(0, 6.28), heading=rng.choice([0, math.pi]))
        people.append(p)
    return cars, people


def build():
    reset(motion_blur=True)
    setup_light()
    rng = random.Random(3)
    objs = build_street()
    cars, people = populate(rng)
    # traffic moves
    for d, c in cars:
        v = SPEED * (1.0 if d == "E" else -0.9)
        x0 = c.location.x
        for f in (0, FRAMES):
            c.location.x = x0 + v * f
            c.keyframe_insert("location", frame=f)
    for p in people:
        x0 = p.location.x
        v = (1.4 / 30) * (1 if abs(p.rotation_euler.z) < 0.1 else -1)
        for f in (0, FRAMES):
            p.location.x = x0 + v * f
            p.keyframe_insert("location", frame=f)
    from common import iter_fcurves
    for ob in [c for _, c in cars] + people:
        for fc in iter_fcurves(ob.animation_data.action):
            for k in fc.keyframe_points:
                k.interpolation = "LINEAR"
    fog_all((0.85, 0.68, 0.5), 0.0045, 1.4)
    cam = camera(lens=24, fstop=2.8, dof_obj=9)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (-14 + SPEED * 1.0 * f, 0.9, 0.75 + 0.03 * math.sin(f * 0.7)),
                 lambda f: (60 + SPEED * f, 5.0, 8.0),
                 roll_fn=lambda f: math.radians(-1.5),
                 focus_fn=lambda f: 9.5)
