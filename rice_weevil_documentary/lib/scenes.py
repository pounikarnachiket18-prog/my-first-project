"""The seven sequences of THE INVISIBLE INVADER. Each is its own Blender scene + collection,
numbered on the global 1..1500 timeline so all renders land in one frame sequence."""
import math

import bpy
from mathutils import Vector

from . import core, creatures, grains, rigs
from . import materials as M

TIMELINE = {  # name: (first frame, last frame)
    "S1_Mystery": (1, 180),
    "S2_Invader": (181, 390),
    "S3_SecretEgg": (391, 630),
    "S4_HiddenDestruction": (631, 930),
    "S5_Transformation": (931, 1200),
    "S6_FinalReveal": (1201, 1410),
    "S7_Takeaway": (1411, 1500),
}
HX = 0.4  # x position of the oviposition hole on the hero grain (grain local space)
HERO_SEED = 5


# --------------------------------------------------------------------------- helpers
def setup(name, samples=16):
    f0, f1 = TIMELINE[name]
    scn = core.new_scene(name, f0, f1, samples=samples)
    coll = core.new_collection(scn, name + "_coll")
    core.TARGET = coll
    rigs.world_gradient(scn)
    return scn, coll, f0, f1


def shot(cam, tgt, foc, keys):
    """keys: list of dict(f=frame, pos=..., tgt=..., foc=optional, fstop=optional, lens=optional).
    pos/tgt/foc may be callables of frame (for tracking). Eased between keys, keyed every frame."""
    keys = sorted(keys, key=lambda k: k["f"])

    def val(v, f):
        return Vector(v(f)) if callable(v) else Vector(v)

    for i in range(len(keys) - 1):
        a, b = keys[i], keys[i + 1]
        last = (i == len(keys) - 2)
        for f in range(a["f"], b["f"] + (1 if last else 0)):
            t = core.ease_io((f - a["f"]) / max(1, b["f"] - a["f"]))
            cam.location = val(a["pos"], f).lerp(val(b["pos"], f), t)
            tgt.location = val(a["tgt"], f).lerp(val(b["tgt"], f), t)
            fa = a.get("foc", a["tgt"])
            fb = b.get("foc", b["tgt"])
            foc.location = val(fa, f).lerp(val(fb, f), t)
            for o in (cam, tgt, foc):
                o.keyframe_insert("location", frame=f)
            if "fstop" in a:
                cam.data.dof.aperture_fstop = core.lerp(a["fstop"], b.get("fstop", a["fstop"]), t)
                cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
            if "lens" in a:
                cam.data.lens = core.lerp(a["lens"], b.get("lens", a["lens"]), t)
                cam.data.keyframe_insert("lens", frame=f)


def visible(obj, frames_on):
    """frames_on: list of (start, end) ranges where the object (tree) renders."""
    for o in core.collect_tree(obj):
        o.hide_render = True
        o.keyframe_insert("hide_render", frame=0)
        for s, e in frames_on:
            o.hide_render = False
            o.keyframe_insert("hide_render", frame=s)
            o.hide_render = True
            o.keyframe_insert("hide_render", frame=e + 1)


def materials_of(root):
    out = []
    for o in core.collect_tree(root):
        if o.type == 'MESH':
            for m in o.data.materials:
                if m and m not in out:
                    out.append(m)
    return out


def key_values(mats, name, pairs):
    for f, v in pairs:
        creatures.set_mats_value(mats, name, v, f)


_PMESH = {}


def particle_mesh(size):
    if size not in _PMESH:
        o = core.ellipsoid("pmesh", (size, size * 0.8, size * 0.7), segs=(8, 5), subsurf=0,
                           deform=lambda c: c * (1 + 0.25 * math.sin(c.x * 90) * math.cos(c.y * 70)))
        _PMESH[size] = o.data
        bpy.data.objects.remove(o)
    return _PMESH[size]


def particles(name, coll, mat, specs, size=0.05, parent=None):
    """specs: list of (f_appear, p0, p1, f_land). Particle pops in at p0, eases to p1."""
    me = particle_mesh(size)
    if mat.name not in [m.name for m in me.materials]:
        me.materials.append(mat)
    objs = []
    for i, (fa, p0, p1, fl) in enumerate(specs):
        o = bpy.data.objects.new(f"{name}_{i}", me)
        coll.objects.link(o)
        if parent:
            o.parent = parent
        o.rotation_euler = (i * 1.3, i * 0.7, i * 2.1)
        o.scale = (0, 0, 0)
        o.keyframe_insert("scale", frame=fa - 1)
        o.scale = (1, 1, 1)
        o.keyframe_insert("scale", frame=fa + 2)
        o.location = p0
        o.keyframe_insert("location", frame=fa)
        o.location = p1
        o.keyframe_insert("location", frame=fl)
        objs.append(o)
    return objs


def floating_dust(coll, n, center, radius, f0, f1, seed=1, size=0.04):
    r = core.rng(seed)
    mat = M.emission_material("DustGlow", color=(1.0, 0.92, 0.8, 1), strength=0.6)
    specs = []
    for _ in range(n):
        p = Vector(center) + Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1))) * radius
        d = Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(0.2, 1))) * radius * 0.08
        specs.append((f0, p, p + d, f1))
    objs = particles("Dust", coll, mat, specs, size=size)
    for o in objs:
        core.set_linear(o)
    return objs


def ellipse_r(theta, half_w=1.0, half_t=0.8):
    return 1.0 / math.sqrt((math.sin(theta) / half_w) ** 2 + (math.cos(theta) / half_t) ** 2)


# --------------------------------------------------------------------------- S1
def build_s1():
    scn, coll, f0, f1 = setup("S1_Mystery")
    rice = M.rice_material("S1_Rice")
    rice_bg = M.rice_material("S1_RiceBG")
    hero = grains.grain("S1_Hero", rice, seed=3, coll=coll)
    # hero floats & slowly rotates
    for f, rz, rx, z in ((f0, -0.55, 0.12, -0.15), (f1, -0.12, 0.0, 0.1)):
        hero.rotation_euler = (rx, 0, rz)
        hero.location = (0, 0, z)
        hero.keyframe_insert("rotation_euler", frame=f)
        hero.keyframe_insert("location", frame=f)
    # hundreds of grains materialise in the darkness behind
    r = core.rng(11)
    bg = []
    for i in range(230):
        while True:
            p = Vector((r.uniform(-40, 40), r.uniform(6, 70), r.uniform(-45, 45)))
            if p.length > 12:
                break
        g = grains.grain(f"S1_bg{i}", rice_bg, seed=r.randrange(12), loc=p,
                         rot=(r.uniform(0, 6.3), r.uniform(0, 6.3), r.uniform(0, 6.3)),
                         coll=coll, subsurf=0, scale=r.uniform(0.9, 1.1))
        fa = int(8 + (p.length / 70) * 70 + r.uniform(0, 25))
        s = g.scale.copy()
        g.scale = (0, 0, 0)
        g.keyframe_insert("scale", frame=fa)
        g.scale = s
        g.keyframe_insert("scale", frame=fa + 18)
        # slow drift
        g.keyframe_insert("location", frame=f0)
        g.location = p + Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1)))
        g.keyframe_insert("location", frame=f1)
        bg.append(g)
    floating_dust(coll, 70, (0, 4, 0), 14, f0, f1, seed=3, size=0.05)
    # the invader: climbs over the crest from the far side
    mount = core.empty("S1_mount", parent=hero)
    rig = creatures.build_weevil("S1W", coll=coll)
    rig["root"].parent = mount
    mount.keyframe_insert("rotation_euler", frame=f0)
    xw = 0.5

    def theta(f):
        a = core.ease_io((f - 86) / 82.0)
        return math.radians(core.lerp(-112, 8, a))

    for f in range(f0, f1 + 1):
        mount.rotation_euler = (theta(f), 0, 0)
        mount.keyframe_insert("rotation_euler", frame=f)
    u = xw / 3.2
    k = math.sqrt(1 - u * u) * (1 - 0.18 * abs(u) ** 3)

    def path(f):
        return (Vector((xw, 0, ellipse_r(theta(f)) * k - 0.04)), math.radians(-90), 0.9)

    def head(f):
        # head rises as it crests
        return (core.lerp(-25, 6, core.smoothstep(120, 165, f)), 0.0)

    def circles(rg, f):
        if f < 150:  # antennae sweep small circles: the first sign of life
            w = (f / 30.0) * 2 * math.pi * 1.1
            for ant, elbow, s in rg["antennae"]:
                ant.rotation_euler = (0, math.radians(-30 + 14 * math.cos(w)),
                                      math.radians(14 * math.sin(w) * s))
                ant.keyframe_insert("rotation_euler", frame=f)

    creatures.animate_weevil(rig, f0, f1, path, head=head, antenna_seed=1, extra=circles,
                             phase_fn=lambda f: (f - f0) / 26.0)
    visible(rig["root"], [(86, f1)])  # emerges from behind the grain
    cam, tgt, foc = rigs.camera("S1_Cam", coll, lens=50, fstop=5.6)
    scn.camera = cam
    shot(cam, tgt, foc, [
        dict(f=f0, pos=(0.6, -42, 9), tgt=(0, 0, 0), fstop=1.4, lens=50),
        dict(f=75, pos=(0.4, -24, 6.5), tgt=(0.2, 0, 0.2), fstop=1.6, lens=50),
        dict(f=122, pos=(0.5, -11, 3.6), tgt=(0.4, 0, 0.55), fstop=2.2, lens=50),
        dict(f=148, pos=(0.9, -4.6, 1.7), tgt=(0.5, -0.4, 1.0), fstop=2.8, lens=42),
        dict(f=f1, pos=(1.1, -4.0, 1.45), tgt=(0.45, -0.6, 1.05), fstop=2.8, lens=42),
    ])
    rigs.area_light("S1_Key", coll, (7, -10, 8), (0, 0, 0), 500, size=5, color=rigs.WARM)
    rigs.area_light("S1_Rim", coll, (-3, 9, 6), (0, 0, 0.5), 1800, size=2.5, color=rigs.COOL)
    rigs.area_light("S1_Rim2", coll, (5, 8, -2), (0, 0, 0), 600, size=3, color=rigs.WARM)
    rigs.area_light("S1_BG", coll, (0, -30, 30), (0, 40, 0), 14000, size=40,
                    color=(0.75, 0.85, 1.0))
    return scn


# --------------------------------------------------------------------------- S2
def build_s2():
    scn, coll, f0, f1 = setup("S2_Invader")
    rice = M.rice_material("S2_Rice")
    rigs.ground(coll, z=0, color=(0.018, 0.016, 0.015), rough=0.55)
    grains.grain("S2_Grain", rice, seed=4, loc=(1.2, 2.05, 0.78), rot=(0, 0, -0.08), coll=coll)
    grains.heap("S2_Heap", rice, 150, (0, 26, 0.0), 20, seed=2, coll=coll, layers=2)
    rig = creatures.build_weevil("S2W", coll=coll)

    def path(f):
        t = core.smoothstep(f0, 300, f)
        x = core.lerp(-1.3, 0.2, t)
        yaw = 0.12 * math.sin((f - f0) / 40.0)
        walk = 1.0 - core.smoothstep(285, 305, f)
        return (Vector((x, -0.25, 0)), yaw, walk)

    def head(f):
        return (6 * math.sin(f / 23.0) * core.smoothstep(300, 320, f), 10 * math.sin(f / 37.0))

    creatures.animate_weevil(rig, f0, f1, path, head=head, antenna_seed=2)
    cam, tgt, foc = rigs.camera("S2_Cam", coll, lens=35, fstop=6.3)
    scn.camera = cam
    c = lambda f: Vector(path(f)[0]) + Vector((0.35, 0, 0.42))  # noqa: E731
    for f in range(f0, f1 + 1):
        t = core.ease_io((f - f0) / (330 - f0))
        ang = math.radians(-100 + 360 * t)
        settle = core.smoothstep(330, 375, f)
        rad = core.lerp(6.8, 5.2, settle)
        h = core.lerp(2.2 + 3.2 * math.sin(t * math.pi) ** 2, 0.55, settle)
        if f > 330:
            ang = math.radians(-100 + 360 + 10 * settle)
        cen = c(f)
        cam.location = cen + Vector((rad * math.cos(ang), rad * math.sin(ang), h))
        tgt.location = cen
        foc.location = cen + Vector((0.35, 0, 0))
        for o in (cam, tgt, foc):
            o.keyframe_insert("location", frame=f)
    rigs.three_point(coll, (0, 0, 0.5), dist=10, key=650, fill=90, rim=1500)
    rigs.area_light("S2_Top", coll, (0, 0, 12), (0, 0, 0), 300, size=10)
    return scn


# --------------------------------------------------------------------------- S3
def hero_cutaway(prefix, coll, rice, endo, extra_cavities=()):
    cav = [((HX, 0, 0.42), (0.42, 0.42, 1.0))] + list(extra_cavities)
    g, slicer, cavs = grains.cutaway_grain(prefix + "_Grain", rice, endo, seed=HERO_SEED,
                                           coll=coll, cut_axis='Z', cavities=cav)
    g.location = (0, 0, 0.8)
    return g, slicer, cavs


def build_s3():
    scn, coll, f0, f1 = setup("S3_SecretEgg")
    rice = M.rice_material("S3_Rice")
    endo = M.endosperm_material("S3_Endo")
    rigs.ground(coll, z=0, color=(0.02, 0.018, 0.016))
    g, slicer, cavs = hero_cutaway("S3", coll, rice, endo)
    hole = cavs[0]
    crest = grains.crest_fn(grains.grain_mesh(HERO_SEED))
    top = crest(HX)
    # drilling: the cavity cutter descends into the grain
    hole.location = (HX, 0, top + 0.52)
    hole.keyframe_insert("location", frame=f0)
    hole.keyframe_insert("location", frame=458)
    hole.location = (HX, 0, top - 0.35)
    hole.keyframe_insert("location", frame=520)
    grains.heap("S3_Heap", rice, 160, (0, 0, -0.75), 16, seed=7, coll=coll, layers=2,
                avoid=[((0, 0, 0), 5.2)])
    # egg + gelatinous plug
    egg, eggmat = creatures.build_egg("S3_Egg", coll=coll)
    egg.parent = g
    egg.rotation_euler = (0, math.radians(90), 0)
    egg.scale = (0.72, 0.72, 0.72)
    egg.location = (HX, 0, top + 0.7)
    egg.keyframe_insert("location", frame=566)
    egg.location = (HX, 0, top - 0.55)
    egg.keyframe_insert("location", frame=588)
    visible(egg, [(566, f1)])
    plug = core.ellipsoid("S3_Plug", (0.5, 0.5, 0.2), (HX, 0, top + 0.02), segs=(20, 10))
    plug.parent = g
    M.assign(plug, M.gel_material("S3_Gel"))
    plug.scale = (0.01, 0.01, 0.01)
    plug.keyframe_insert("scale", frame=588)
    plug.scale = (1, 1, 1)
    plug.keyframe_insert("scale", frame=606)
    visible(plug, [(588, 611)])
    # flour dust from drilling
    r = core.rng(5)
    endo_bits = M.frass_material("S3_Flour")
    specs = []
    for i in range(36):
        fa = int(462 + i * 1.6)
        a = r.uniform(0, 6.28)
        p0 = Vector((HX + 0.08 * math.cos(a), 0.08 * math.sin(a), top + 0.82))
        d = r.uniform(0.25, 0.55)
        p1 = Vector((HX + d * math.cos(a), d * math.sin(a) * 0.8, top + 0.8 - 0.06 - d * 0.08))
        specs.append((fa, p0, p1, fa + 10))
    particles("S3_Flour", coll, endo_bits, specs, size=0.05, parent=g)
    # the female weevil
    rig = creatures.build_weevil("S3W", coll=coll)
    zc = lambda x: 0.8 + crest(x)  # noqa: E731
    xa, xb = -1.28, HX - 1.36  # drilling position / egg-laying position (after turning)

    def path(f):
        if f < 445:
            x = core.lerp(-2.7, xa, core.ease_io((f - f0) / (445 - f0)))
            return (Vector((x, 0, zc(x))), 0.0, 1.0, -math.atan((zc(x + 0.3) - zc(x - 0.3)) / 0.6))
        if f < 522:
            return (Vector((xa, 0, zc(xa))), 0.0, 0.0)
        if f < 556:
            t = core.ease_io((f - 522) / 34.0)
            x = core.lerp(xa, xb, t)
            return (Vector((x, 0.12 * math.sin(t * math.pi), zc(x))), math.pi * t, 1.0)
        if f < 606:
            return (Vector((xb, 0, zc(xb) + 0.03)), math.pi, 0.0, math.radians(-5))
        x = core.lerp(xb, xb - 2.2, core.ease((f - 606) / 24.0))
        return (Vector((x, 0, zc(x))), math.pi, 1.0)

    def head(f):
        if 440 <= f < 455:
            return (core.lerp(0, 24, (f - 440) / 15), 0)
        if 455 <= f < 522:
            return (24 + 3 * math.sin(f * 1.7), 7 * math.sin(f * 0.85))  # chewing
        if f < 440:  # antennal tapping while examining
            return (10 * max(0, math.sin(f / 6.0)), 0)
        return (0, 0)

    def drill_bob(rg, f):
        if 455 <= f < 522:
            rg["body"].location.z = creatures.BODY_H + 0.02 * math.sin(f * 1.7)
            rg["body"].keyframe_insert("location", frame=f)

    creatures.animate_weevil(rig, f0, f1, path, head=head, antenna_seed=3, extra=drill_bob)
    visible(rig["root"], [(f0, 614)])
    # slice the grain open to reveal the egg inside
    slicer.location = (0, 0, 3.0)
    slicer.keyframe_insert("location", frame=604)
    slicer.location = (0, 0, 0.15)
    slicer.keyframe_insert("location", frame=626)
    cam, tgt, foc = rigs.camera("S3_Cam", coll, lens=40, fstop=5.6)
    scn.camera = cam
    rp = lambda f: Vector(path(f)[0])  # noqa: E731
    hole_w = Vector((HX, 0, 0.8 + top))
    shot(cam, tgt, foc, [
        dict(f=f0, pos=lambda f: rp(f) + Vector((1.6, -5.4, 1.9)),
             tgt=lambda f: rp(f) + Vector((0.6, 0, 0.35)), fstop=6.3),
        dict(f=445, pos=lambda f: rp(f) + Vector((1.9, -4.6, 1.5)),
             tgt=lambda f: rp(f) + Vector((0.9, 0, 0.3)), fstop=6.3),
        dict(f=462, pos=hole_w + Vector((1.0, -2.3, 0.9)), tgt=hole_w + Vector((-0.1, 0, 0.25)),
             fstop=5.0),
        dict(f=515, pos=hole_w + Vector((0.8, -2.0, 0.7)), tgt=hole_w + Vector((-0.1, 0, 0.2)),
             fstop=5.0),
        dict(f=540, pos=hole_w + Vector((0.2, -5.2, 2.6)), tgt=hole_w + Vector((-0.6, 0, 0.3)),
             fstop=6.3),
        dict(f=596, pos=hole_w + Vector((0.4, -3.4, 1.8)), tgt=hole_w + Vector((0, 0, 0.1)),
             fstop=6.3),
        dict(f=f1, pos=hole_w + Vector((0.3, -1.6, 5.2)), tgt=hole_w + Vector((0.1, 0, -0.6)),
             fstop=8.0),
    ])
    rigs.three_point(coll, (0, 0, 1.0), dist=10, key=700, fill=110, rim=1600)
    rigs.spot("S3_Spot", coll, (HX + 3, -2, 8), hole_w, 900, angle=25, color=rigs.WARM)
    return scn


# --------------------------------------------------------------------------- S4
def build_s4():
    scn, coll, f0, f1 = setup("S4_HiddenDestruction")
    rice = M.rice_material("S4_Rice")
    endo = M.endosperm_material("S4_Endo")
    rigs.ground(coll, z=0, color=(0.02, 0.018, 0.016))
    chamber = ((HX - 0.2, 0, 0.15), (0.6, 0.55, 0.6))
    g, slicer, cavs = hero_cutaway("S4", coll, rice, endo, extra_cavities=[chamber])
    slicer.location = (0, 0, 0.15)
    crest = grains.crest_fn(grains.grain_mesh(HERO_SEED))
    top = crest(HX)
    cavs[0].location = (HX, 0, top - 0.35)
    ch = cavs[1]
    # the larva eats the grain from the inside: chamber widens in growth spurts
    stages = [(f0, (HX - 0.2, 0, 0.15), (0.6, 0.55, 0.6)),
              (700, (HX - 0.4, 0, 0.12), (1.3, 0.95, 0.85)),
              (780, (HX - 0.8, 0, 0.08), (2.4, 1.25, 1.0)),
              (860, (HX - 0.9, 0, 0.05), (3.6, 1.42, 1.12)),
              (f1, (HX - 1.0, 0, 0.04), (4.5, 1.5, 1.18))]
    for f, loc, size in stages:
        ch.location = loc
        ch.scale = (size[0] / 0.6, size[1] / 0.55, size[2] / 0.6)
        ch.keyframe_insert("location", frame=f)
        ch.keyframe_insert("scale", frame=f)
    grains.heap("S4_Heap", rice, 120, (0, 0, -0.75), 16, seed=7, coll=coll, layers=2,
                avoid=[((0, 0, 0), 5.2)])
    egg, eggmat = creatures.build_egg("S4_Egg", coll=coll)
    egg.parent = g
    egg.rotation_euler = (0, math.radians(90), 0)
    egg.scale = (0.72, 0.72, 0.72)
    egg.location = (HX, 0, top - 0.55)
    M.dissolve(eggmat, "EggVis")
    key_values([eggmat], "EggVis", [(f0, 1.0), (648, 1.0), (676, 0.0)])
    larva, lmat = creatures.build_larva("S4_Larva", coll=coll)
    larva.parent = g
    lmats = materials_of(larva)
    for m in lmats:
        M.dissolve(m, "LarvaVis", scale=30)
    key_values(lmats, "LarvaVis", [(650, 0.0), (676, 1.0)])
    # C-shape lies flat (in the XY plane) so the cutaway shows it from above
    r = core.rng(4)
    path_pts = [(f0, (HX, 0, -0.05), 0.2), (690, (HX - 0.1, 0.05, -0.1), 0.3),
                (720, (HX - 0.3, -0.05, -0.12), 0.38), (790, (HX - 0.7, 0.05, -0.12), 0.5),
                (850, (HX - 0.9, -0.03, -0.14), 0.6), (900, (HX - 1.0, 0.0, -0.15), 0.72),
                (f1, (HX - 1.05, 0.0, -0.15), 0.75)]
    for i in range(len(path_pts) - 1):
        (fa, la, sa), (fb, lb, sb) = path_pts[i], path_pts[i + 1]
        for f in range(fa, fb):
            t = (f - fa) / (fb - fa)
            st = core.smoothstep(0.6, 0.9, t)  # moult: growth comes in spurts
            larva.location = Vector(la).lerp(Vector(lb), core.ease_io(t))
            sc = core.lerp(sa, sb, st)
            larva.scale = (sc, sc, sc)
            larva.rotation_euler = (math.radians(90), 0,
                                    math.radians(170 + 12 * math.sin(f / 9.0)))
            larva.keyframe_insert("location", frame=f)
            larva.keyframe_insert("scale", frame=f)
            larva.keyframe_insert("rotation_euler", frame=f)
    larva.keyframe_insert("location", frame=f1)
    creatures.animate_larva(larva, f0, f1, speed=0.8,
                            stretch=lambda f: 0.35 + 0.35 * math.sin(f / 13.0))
    # frass accumulates behind the feeding larva
    fr = M.frass_material("S4_Frass")
    specs = []
    for i in range(70):
        fa = int(690 + i * 3.3)
        x = HX - 0.2 - r.uniform(0, 1.0) * (fa - 680) / 250 * 2.0
        p = Vector((x, r.uniform(-0.5, 0.5), r.uniform(-0.38, -0.2)))
        specs.append((fa, p + Vector((0, 0, 0.08)), p, fa + 6))
    particles("S4_Frass", coll, fr, specs, size=0.07, parent=g)
    cam, tgt, foc = rigs.camera("S4_Cam", coll, lens=40, fstop=6.3)
    scn.camera = cam
    hw = Vector((HX, 0, 0.8))
    shot(cam, tgt, foc, [
        dict(f=f0, pos=hw + Vector((0.3, -1.6, 4.4)), tgt=hw + Vector((0.1, 0, -0.6)),
             foc=hw + Vector((0, 0, -0.6)), fstop=8.0),
        dict(f=700, pos=hw + Vector((0.4, -1.9, 3.4)), tgt=hw + Vector((-0.1, 0, -0.65)),
             fstop=5.6),
        dict(f=820, pos=hw + Vector((-0.2, -3.2, 4.0)), tgt=hw + Vector((-0.6, 0, -0.7)),
             fstop=6.3),
        dict(f=f1, pos=hw + Vector((-1.6, -3.6, 5.2)), tgt=hw + Vector((-0.9, 0, -0.75)),
             fstop=7.1),
    ])
    rigs.area_light("S4_Top", coll, (2, -3, 9), (0, 0, 0.8), 650, size=6, color=(0.9, 0.95, 1.0))
    # warm light glowing through the translucent grain from behind/below
    rigs.area_light("S4_Back", coll, (-1, 5, 1.2), (0, 0, 0.6), 900, size=3, color=rigs.WARM)
    rigs.spot("S4_Beam", coll, (-6, 4, 9), (0, 0, 0.6), 1800, angle=18, blend=0.8,
              color=(1.0, 0.85, 0.6), radius=0.2)
    rigs.area_light("S4_Rim", coll, (5, 6, 3), (0, 0, 0.8), 900, size=2, color=rigs.COOL)
    return scn


# --------------------------------------------------------------------------- S5
def build_s5():
    scn, coll, f0, f1 = setup("S5_Transformation")
    rice = M.rice_material("S5_RiceXray", xray="Xray")
    rigs.ground(coll, z=0, color=(0.015, 0.014, 0.013))
    g = grains.grain("S5_Grain", rice, seed=HERO_SEED, loc=(0, 0, 0.8), coll=coll)
    M.set_value_node(rice, "Xray", 0.0, f0)
    M.set_value_node(rice, "Xray", 0.97, f0 + 30)
    # frass + flour left by the larva
    fr = M.frass_material("S5_Frass")
    r = core.rng(9)
    specs = [(f0, p, p, f0 + 1) for p in
             (Vector((r.uniform(-2.2, 1.0), r.uniform(-0.5, 0.5), r.uniform(-0.45, -0.3)))
              for _ in range(40))]
    particles("S5_Frass", coll, fr, specs, size=0.08, parent=g)
    larva, lmat = creatures.build_larva("S5_Larva", coll=coll)
    larva.parent = g
    larva.location = (HX - 1.05, 0, -0.15)
    larva.scale = (0.75, 0.75, 0.75)
    larva.rotation_euler = (math.radians(90), 0, math.radians(170))
    lm = materials_of(larva)
    for m in lm:
        M.dissolve(m, "LarvaVis", scale=30)
    key_values(lm, "LarvaVis", [(f0, 1.0), (962, 1.0), (995, 0.0)])
    creatures.animate_larva(larva, f0, 995, speed=0.4,
                            stretch=lambda f: core.lerp(0.4, 0.0, core.smoothstep(f0, 990, f)))
    pupa, pmat, peye = creatures.build_pupa("S5_Pupa", coll=coll)
    pupa.parent = g
    pupa.location = (HX - 1.0, 0, -0.08)
    pupa.scale = (0.82, 0.82, 0.82)
    pupa.rotation_euler = (math.radians(180), 0, math.radians(180))  # lies on its back
    pm = materials_of(pupa)
    for m in pm:
        M.dissolve(m, "PupaVis", scale=30)
    key_values(pm, "PupaVis", [(965, 0.0), (998, 1.0), (1072, 1.0), (1102, 0.0)])
    key_values([peye], "PupaEye", [(f0, 0.0), (1005, 0.0), (1050, 1.0)])
    key_values([pmat], "PupaDark", [(f0, 0.0), (1030, 0.0), (1070, 0.45)])
    for f in range(965, 1103):  # gentle abdominal twitching typical of pupae
        pupa.rotation_euler = (math.radians(180 + 3 * math.sin(f / 7.0)), 0, math.radians(180))
        pupa.keyframe_insert("rotation_euler", frame=f)
    wm = creatures.WeevilMaterials("S5", sclerotize=True)
    rig = creatures.build_weevil("S5W", mats=wm, coll=coll)
    rig["root"].parent = g
    rig["root"].scale = (0.76, 0.76, 0.76)
    am = materials_of(rig["root"])
    for m in am:
        M.dissolve(m, "AdultVis", scale=30)
    key_values(am, "AdultVis", [(1070, 0.0), (1104, 1.0)])
    key_values(am, wm.sclero_name, [(f0, 0.0), (1104, 0.0), (1185, 1.0)])

    def path(f):
        return (Vector((HX - 1.6, 0, -0.55)), 0.0, 0.0)

    def head(f):
        return (core.lerp(18, 0, core.smoothstep(1110, 1170, f)), 0)

    creatures.animate_weevil(rig, f0, f1, path, head=head, antenna_seed=5)
    cam, tgt, foc = rigs.camera("S5_Cam", coll, lens=40, fstop=8)
    scn.camera = cam
    cen = Vector((HX - 1.0, 0, 0.75))
    for f in range(f0, f1 + 1):
        t = core.ease_io((f - f0) / (1140 - f0))
        ang = math.radians(-115 + 150 * t)
        close = core.smoothstep(1130, 1195, f)
        rad = core.lerp(8.5, 3.6, close)
        h = core.lerp(4.0, 1.6, close)
        tt = cen.lerp(Vector((HX - 0.6, 0, 0.7)), close)
        if f > 1140:
            ang = math.radians(35 + 25 * close)
        cam.location = tt + Vector((rad * math.cos(ang), rad * math.sin(ang), h))
        tgt.location = tt
        foc.location = tt
        for o in (cam, tgt, foc):
            o.keyframe_insert("location", frame=f)
    rigs.three_point(coll, (0, 0, 0.8), dist=10, key=900, fill=160, rim=2200)
    rigs.spot("S5_God", coll, (-4, 3, 10), (0, 0, 0.8), 1600, angle=16, blend=0.9,
              color=(0.75, 0.9, 1.0), radius=0.3)
    return scn


# --------------------------------------------------------------------------- S6
def build_s6():
    scn, coll, f0, f1 = setup("S6_FinalReveal")
    rice = M.rice_material("S6_Rice")
    aged = M.rice_material("S6_RiceAged", aged=0.8)
    endo = M.endosperm_material("S6_Endo")
    crest = grains.crest_fn(grains.grain_mesh(HERO_SEED))
    ex = 0.6
    top = crest(ex)
    g, slicer, cavs = grains.cutaway_grain(
        "S6_Grain", aged, endo, seed=HERO_SEED, coll=coll,
        cavities=[((ex, 0, top - 0.75), (1.0, 1.0, 1.4)), ((-0.6, 0, -0.05), (4.4, 1.45, 1.1))])
    gz = 1.55
    g.location = (0, 0, gz)
    eh = cavs[0]
    eh.keyframe_insert("location", frame=f0)
    eh.keyframe_insert("location", frame=1212)
    eh.location = (ex, 0, top - 0.28)
    eh.keyframe_insert("location", frame=1282)
    # stored rice bed with other damaged grains and more adults
    heap_mats = [rice] * 5 + [aged]
    hp = grains.heap("S6_Heap", rice, 420, (0, 0, 0.0), 17, seed=12, coll=coll, layers=3,
                     avoid=[((0, 0, 0), 3.6)], mats=heap_mats)
    r = core.rng(21)
    cut = 0
    for hg in hp:
        if hg.material_slots[0].material == aged and cut < 14 and hg.location.z > 0.55:
            c = core.ellipsoid(hg.name + "_exit", (0.9, 0.9, 1.2), (r.uniform(-1.5, 1.5), 0, 0.65),
                               segs=(16, 8), subsurf=0)
            c.parent = hg
            c.hide_render = True
            c.display_type = 'WIRE'
            b = hg.modifiers.new("Exit", 'BOOLEAN')
            b.object = c
            b.solver = 'FAST'
            hg.data = hg.data.copy()
            hg.data.materials.append(endo)
            hg.material_slots[0].link = 'OBJECT'
            hg.material_slots[0].material = aged
            cut += 1
    fr = M.frass_material("S6_Frass")
    specs = []
    for i in range(30):
        fa = int(1232 + i * 2.0)
        a = r.uniform(0, 6.28)
        p0 = Vector((ex, 0, top + 0.05))
        d = r.uniform(0.4, 1.0)
        p1 = Vector((ex + d * math.cos(a), d * math.sin(a), top - 0.2 * d))
        specs.append((fa, p0, p1, fa + 9))
    particles("S6_Frass", coll, fr, specs, size=0.07, parent=g)
    # the new adult chews its way out
    rig = creatures.build_weevil("S6W", coll=coll)
    rig["root"].parent = g
    rig["root"].scale = (0.92, 0.92, 0.92)
    hole_c = Vector((ex, 0, top))

    def path(f):
        if f < 1290:
            a = math.radians(58)
            back = 1.9
            return (hole_c + Vector((-back * math.cos(a), 0, -back * math.sin(a) - 0.15)), 0.0,
                    0.0, -a)
        t = core.ease_io((f - 1290) / 85.0)
        a = math.radians(core.lerp(58, 4, core.smoothstep(0.0, 0.85, t)))
        back = core.lerp(1.9, -1.6, t)
        lift = core.lerp(0.15, -0.02, core.smoothstep(0.4, 1.0, t))
        p = hole_c + Vector((-back * math.cos(a), 0, -back * math.sin(a) - lift))
        if f > 1375:
            x = p.x + (f - 1375) * 0.03
            p = Vector((x, 0, crest(x) - 0.02))
        return (p, 0.0, 1.0 if f > 1290 else 0.0, -a)

    def head(f):
        return (8 * math.sin(f / 5.0) if f < 1290 else 0, 6 * math.sin(f / 3.0) if f < 1288 else 0)

    creatures.animate_weevil(rig, f0, f1, path, head=head, antenna_seed=6)
    # other adults roaming the stored rice
    for i, (start, yaw, spd) in enumerate((((-9, 3), -0.3, 0.035), ((-11, -2), 0.25, 0.04),
                                           ((8, 8), 2.6, 0.03), ((-4, 10), -1.2, 0.03),
                                           ((11, 3), 2.9, 0.035))):
        w = creatures.build_weevil(f"S6Walker{i}", coll=coll)

        def wpath(f, start=start, yaw=yaw, spd=spd, i=i):
            d = (f - f0) * spd
            yy = yaw + 0.3 * math.sin(f / 30.0 + i)
            return (Vector((start[0] + d * math.cos(yaw), start[1] + d * math.sin(yaw), 1.45)),
                    yy, 1.0)

        creatures.animate_weevil(w, f0, f1, wpath, antenna_seed=10 + i)
    cam, tgt, foc = rigs.camera("S6_Cam", coll, lens=40, fstop=6.3)
    scn.camera = cam
    hw = Vector((ex, 0, gz + top))
    shot(cam, tgt, foc, [
        dict(f=f0, pos=hw + Vector((1.8, -3.0, 2.2)), tgt=hw + Vector((0, 0, 0.1)), fstop=5.0),
        dict(f=1300, pos=hw + Vector((2.2, -3.4, 1.8)), tgt=hw + Vector((0.2, 0, 0.3)),
             fstop=5.0),
        dict(f=1345, pos=hw + Vector((3.0, -6.0, 3.2)), tgt=hw + Vector((0.6, 0, 0.1)),
             fstop=6.3),
        dict(f=f1, pos=(5.0, -24.0, 17.0), tgt=(0.5, 0, 0.6), foc=(0.5, 0, 1.6), fstop=10.0),
    ])
    rigs.three_point(coll, (0, 0, 1.5), dist=14, key=1200, fill=160, rim=2600)
    rigs.area_light("S6_Sky", coll, (0, -6, 30), (0, 0, 0), 2500, size=30, color=(0.9, 0.93, 1.0))
    return scn


# --------------------------------------------------------------------------- S7
def build_s7():
    scn, coll, f0, f1 = setup("S7_Takeaway")
    rice = M.rice_material("S7_Rice")
    aged = M.rice_material("S7_RiceAged", aged=1.0)
    endo = M.endosperm_material("S7_Endo")
    rigs.ground(coll, z=0, color=(0.012, 0.011, 0.01), rough=0.4)
    grains.grain("S7_Healthy", rice, seed=3, loc=(0, 1.75, 0.8), rot=(0, 0, 0.03), coll=coll)
    crest = grains.crest_fn(grains.grain_mesh(HERO_SEED))
    g, slicer, cavs = grains.cutaway_grain(
        "S7_Infested", aged, endo, seed=HERO_SEED, coll=coll,
        cavities=[((0.6, 0, crest(0.6) - 0.28), (1.0, 1.0, 1.4)),
                  ((-0.6, 0, -0.05), (4.4, 1.45, 1.1))])
    g.location = (0, -1.75, 0.8)
    g.rotation_euler = (0, 0, -0.03)
    cam, tgt, foc = rigs.camera("S7_Cam", coll, lens=45, fstop=11)
    scn.camera = cam
    shot(cam, tgt, foc, [
        dict(f=f0, pos=(0.0, -6.5, 15.5), tgt=(0, 0.1, 0.5), fstop=11),
        dict(f=f1, pos=(0.0, -5.6, 13.2), tgt=(0, 0.1, 0.5), fstop=11),
    ])
    rigs.three_point(coll, (0, 0, 0.8), dist=12, key=900, fill=120, rim=1800)
    return scn


BUILDERS = [build_s1, build_s2, build_s3, build_s4, build_s5, build_s6, build_s7]
