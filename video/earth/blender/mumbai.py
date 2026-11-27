"""Assembles the Mumbai street used by B1, C1, C2, C3, D1, D4, E1 and animates the inertia fling."""
import math, random
import bpy
from mathutils import Vector, Euler
import india
import character as C
from look import overcast

VEH_COLORS = ["white", "silver", "black", "white", "silver"]


def build(rng, x_min=-70, x_max=150, traffic=True, crowd=14, clutter_n=120, wrecked=False):
    st = india.street(x_min, x_max, rng)
    loose = dict(vehicles=[], people=[], clutter=[], signs=st["signs"], trees=st["trees"], props=st["props"], poles=st["poles"])
    if traffic:
        lanes = [(-2.5, 0.0), (2.5, math.pi)]
        x = x_min + 10
        k = 0
        while x < x_max - 10:
            for lane_y, hd in lanes:
                kind = rng.choice(["taxi", "taxi", "auto", "auto", "car", "bus", "scooter"])
                xx = x + rng.uniform(-4, 4)
                name = f"V{k}"
                if kind == "taxi":
                    v = india.taxi(name, (xx, lane_y, 0), hd)
                elif kind == "auto":
                    v = india.auto_rickshaw(name, (xx, lane_y + rng.uniform(-0.5, 0.5), 0), hd)
                elif kind == "bus":
                    v = india.best_bus(name, (xx, lane_y, 0), hd)
                elif kind == "scooter":
                    v = india.scooter(name, (xx, lane_y + rng.uniform(-1, 1), 0), rng.randint(0, 3), hd)
                else:
                    v = india.hatchback(name, (xx, lane_y, 0), rng.choice(VEH_COLORS), hd)
                loose["vehicles"].append(v)
                k += 1
            x += rng.uniform(11, 17)
    outfits = ["white_kurta", "saffron", "maroon", "green", "sky", "khaki"]
    skins = ["wheat", "brown", "dusky"]
    for i in range(crowd):
        side = rng.choice([1, -1])
        p = C.Person(rng.choice(outfits), rng.choice(skins), rng.random() < 0.5,
                     loc=(rng.uniform(x_min + 15, x_max - 30), side * rng.uniform(5.6, 7.0), 0.2), heading=rng.choice([math.pi / 2, -math.pi / 2]))
        p.pose(C.walk(rng.uniform(0, 6.28)))
        loose["people"].append(p)
    for i in range(clutter_n):
        side = rng.choice([1, -1, 0])
        y = rng.uniform(-4.2, 4.2) if side == 0 else side * rng.uniform(5.2, 7.2)
        loose["clutter"].append(india.clutter(f"Cl{i}", (rng.uniform(x_min + 10, x_max - 20), y, 0.2 if side else 0.0), rng))
    return st, loose


# ---------------------------------------------------------------- inertia
V_EAST = 465.0  # m/s at the equator-ish latitude scale used in the reel


def x_of(s, ramp):
    if s <= 0:
        return 0.0
    if s < ramp:
        return 0.5 * V_EAST / ramp * s * s
    return 0.5 * V_EAST * ramp + V_EAST * (s - ramp)


def fling(ob, frames, sim, rng, ramp=0.08, lift=(0.5, 8), spin=(1, 12), delay=0.0, drag=1.0):
    p0 = ob.location.copy()
    r0 = Euler(ob.rotation_euler)
    vz = rng.uniform(*lift)
    w = [rng.uniform(-1, 1) * rng.uniform(*spin) for _ in range(3)]
    vy = rng.uniform(-1.5, 1.5)
    for f in frames:
        s = max(0.0, sim(f) - delay)
        x = x_of(s, ramp) * drag
        z = max(0.0, vz * s - 4.9 * s * s)
        ob.location = (p0.x + x, p0.y + vy * s, p0.z + z)
        ob.rotation_euler = (r0.x + w[0] * s, r0.y + w[1] * s, r0.z + w[2] * s)
        ob.keyframe_insert("location", frame=f)
        ob.keyframe_insert("rotation_euler", frame=f)


def fling_person(p, frames, sim, rng, ramp=0.07, lift=(1.0, 4.0), spin=(1.5, 5.0), delay=0.0, flail_rate=3.0, track=None):
    """Keys a person thrown east. If `track` is a list, the root positions are appended to it."""
    p0 = p.root.location.copy()
    r0 = Euler(p.root.rotation_euler)
    vz = rng.uniform(*lift)
    w = [rng.uniform(-1, 1) * rng.uniform(*spin) for _ in range(3)]
    ph = rng.uniform(0, 6)
    for f in frames:
        s = max(0.0, sim(f) - delay)
        x = x_of(s, ramp)
        z = max(0.0, vz * s - 4.9 * s * s)
        # body pitches toward the direction of travel as the feet are dragged first
        rot = (r0.x + w[0] * s, r0.y + w[1] * s + min(1.2, s * 9), r0.z + w[2] * s)
        spec = C.flail(s * flail_rate + ph) if s > 0 else C.stand()
        pos = (p0.x + x, p0.y, p0.z + z)
        p.key(f, spec, loc=pos, rot=rot)
        if track is not None:
            track.append(Vector(pos))


def bend_tree(trunk, crowns, frames, sim, rng, max_angle=1.0, tau=0.06, strip=True):
    """Trees are anchored: they bend east, then lose their leaves to the eastward wind."""
    base = trunk.location.copy()
    for f in frames:
        s = sim(f)
        a = max_angle * (1 - math.exp(-max(0.0, s) / tau))
        trunk.rotation_euler = (0, a, 0)
        trunk.keyframe_insert("rotation_euler", frame=f)
    if strip:
        for c in crowns:
            mw = c.matrix_world.copy(); c.parent = None; c.matrix_world = mw
            fling(c, frames, sim, rng, ramp=0.06, lift=(0, 3), spin=(1, 6), delay=rng.uniform(0.02, 0.08))


def setup_world():
    overcast()


def slowmo_sim(slow=0.045, slow_until=62, ramp_frames=20):
    """Slow motion from the first frame, then a ramp back to real time."""
    def sim(f):
        if f <= slow_until:
            return f / 30 * slow
        a = slow_until / 30 * slow
        if f <= slow_until + ramp_frames:
            u = f - slow_until
            return a + (slow * u + (1 - slow) * u * u / (2 * ramp_frames)) / 30
        a += (slow * ramp_frames + (1 - slow) * ramp_frames / 2) / 30
        return a + (f - slow_until - ramp_frames) / 30
    return sim
