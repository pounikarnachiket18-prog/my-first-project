"""C2 — THE STOP (13.33–17.0 s). Camera is bolted to the ground, so it stops with the ground.
Everything unanchored keeps the old eastward speed (~465 m/s at this latitude ~ equator) and
flies EAST (screen right). Slow motion for the first beat, then ramp back to real time.
"""
import math, random
from mathutils import Vector
from common import reset, camera, key_cam_path
from city import build_street, fling, debris_piece, fog_all, empty, parent
import C1

FRAMES = 114
SLOW = 0.045


def sim(f):
    """Seconds since the ground stopped, for shot frame f (time-remapped)."""
    if f <= 2:
        return f / 30
    a = 2 / 30
    if f <= 62:
        return a + (f - 2) / 30 * SLOW
    a += 60 / 30 * SLOW
    if f <= 82:
        u = f - 62
        return a + (SLOW * u + (1 - SLOW) * u * u / 40) / 30
    a += (SLOW * 20 + (1 - SLOW) * 10) / 30
    return a + (f - 82) / 30


def tilt_east(ob, frames, max_angle, tau, delay=0.0):
    for f in frames:
        s = max(0.0, sim(f) - delay)
        ob.rotation_euler = (0, max_angle * (1 - math.exp(-s / tau)), 0)
        ob.keyframe_insert("rotation_euler", frame=f)


def build():
    reset(motion_blur=True)
    C1.setup_light()
    rng = random.Random(5)
    objs = build_street(x_min=-200, x_max=420)
    cars, people = C1.populate(rng)
    frames = range(0, FRAMES + 1)
    for _, c in cars:
        fling(c, frames, sim, rng, lift=(0.5, 7), spin=(0.5, 5), ramp=0.1)
    for p in people:
        fling(p, frames, sim, rng, lift=(0.5, 5), spin=(3, 12), ramp=0.08)
    deb = []
    for i in range(260):
        side = rng.choice([1, -1, 0, 0])
        y = rng.uniform(-5.2, 5.2) if side == 0 else side * rng.uniform(6.0, 9.2)
        d = debris_piece(f"D{i}", (rng.uniform(-90, 110), y, 0.25), rng)
        d.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        fling(d, frames, sim, rng, lift=(0.5, 10), spin=(4, 25), ramp=0.05)
        deb.append(d)
    # chunks torn off the facades and awnings ripped away
    for i in range(140):
        side = rng.choice([1, -1])
        x = rng.uniform(-30, 120)
        d = debris_piece(f"F{i}", (x, side * rng.uniform(9.4, 9.9), rng.uniform(3, 34)), rng, kind="chunk")
        fling(d, frames, sim, rng, lift=(0.0, 3), spin=(3, 18), ramp=0.06, start_delay=rng.uniform(0.02, 0.14))
    for aw in objs["debris"]:
        fling(aw, frames, sim, rng, lift=(1, 6), spin=(2, 10), ramp=0.06, start_delay=rng.uniform(0.01, 0.06))
    for t, crowns in objs["trees"]:
        tilt_east(t, frames, rng.uniform(0.9, 1.35), 0.05)
        for c in crowns:
            # leaves/branches are torn off after the trunk bends
            w = c.matrix_world.copy(); c.parent = None; c.matrix_world = w
            fling(c, frames, sim, rng, lift=(0, 4), spin=(2, 8), ramp=0.06, start_delay=rng.uniform(0.03, 0.09))
    for lp in objs["lamps"]:
        tilt_east(lp, frames, rng.uniform(0.5, 1.1), 0.07)
    fog_all((0.82, 0.66, 0.5), 0.0055, 1.3)
    cam = camera(lens=18, fstop=4, dof_obj=14)
    key_cam_path(cam, frames, lambda f: (2.0, -7.4, 1.35), lambda f: (30, 9.0, 6.5), roll_fn=lambda f: math.radians(2))
