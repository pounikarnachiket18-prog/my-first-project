"""Anatomically consistent Sitophilus oryzae assets: adult rig, egg, larva, pupa.

Reference anatomy (adult S. oryzae, ~2.5-3.5 mm incl. rostrum):
  * long, slightly decurved rostrum carrying tiny mandibles at its tip
  * geniculate (elbowed) clubbed antennae inserted on the rostrum
  * pronotum densely covered in round punctures
  * elytra with longitudinal rows of pits (striae) and four pale reddish-yellow spots
  * six legs: coxa, club-shaped femur, tibia with apical hook, tarsus with claws
Larva: legless, C-shaped, creamy white, brown head capsule (develops inside the grain).
Pupa: exarate (appendages free, folded against body), white, darkens before eclosion.
"""
import math

import bpy
from mathutils import Euler, Vector

from . import core
from . import materials as M

LEGS = {
    # name: (attach xyz, base yaw deg (left side), femur len, tibia len, tarsus len)
    "1": ((0.50, 0.20, -0.18), 50.0, 0.46, 0.40, 0.26),
    "2": ((0.06, 0.26, -0.16), 100.0, 0.42, 0.36, 0.24),
    "3": ((-0.26, 0.28, -0.15), 140.0, 0.48, 0.42, 0.26),
}
STAND = dict(p=12.0, k=78.0, t=58.0)  # femur raise, knee bend, tarsus flex (degrees)
BODY_H = 0.42  # body centre height above ground (mm)


class WeevilMaterials:
    def __init__(self, tag="", sclerotize=False):
        sv = ("Sclero" + tag) if sclerotize else None
        self.elytra = M.cuticle_material("Elytra" + tag, spots=True, striae=True,
                                         punct_scale=44.0, sclerotize_value=sv,
                                         base=(0.05, 0.02, 0.01, 1))
        self.pronotum = M.cuticle_material("Pronotum" + tag, punct_scale=30.0, punct_strength=0.8,
                                           base=(0.04, 0.016, 0.008, 1), sclerotize_value=sv)
        self.limb = M.cuticle_material("Limb" + tag, punct_scale=70.0, punct_strength=0.25,
                                       base=(0.07, 0.028, 0.013, 1), sclerotize_value=sv)
        self.eye = M.eye_material("Eye" + tag)
        self.dark = M.cuticle_material("Mandible" + tag, base=(0.02, 0.01, 0.006, 1),
                                       punct_strength=0.0)
        self.sclero_name = sv
        self.all = [self.elytra, self.pronotum, self.limb, self.dark]


def _blunt(co, half_len, side):
    """Turn one end of an ellipsoid into a blunt super-ellipse profile (no ant-like waist)."""
    u = co.x / half_len
    if u * side > 0:
        a = min(abs(u), 0.999)
        ell = math.sqrt(1 - a * a)
        sup = (1 - a ** 4) ** 0.25
        k = min(2.2, sup / max(ell, 1e-3))
        co.y *= k
        co.z *= k
    return co


def _elytra_deform(co):
    co = _blunt(co, 0.80, +1)  # broad shoulders meeting the pronotum
    x = co.x
    if x < 0:
        k = 1 - 0.30 * (min(1.0, -x / 0.80) ** 2)
        co.y *= k
        co.z *= 1 - 0.10 * (min(1.0, -x / 0.80) ** 2)
    if co.z > 0:
        co.z *= 0.92
    return co


def _pronotum_deform(co):
    co = _blunt(co, 0.47, -1)  # base as wide as the elytra
    if co.x > 0:
        k = 1 - 0.30 * (co.x / 0.47)
        co.y *= k
        co.z *= 1 - 0.12 * (co.x / 0.47)
    return co


def build_weevil(name="Weevil", mats=None, coll=None):
    """Returns dict rig with root and animatable joints."""
    mats = mats or WeevilMaterials()
    root = core.empty(name + "_root", size=1.0)
    body = core.empty(name + "_body", parent=root)  # bob / pitch
    body.location = (0, 0, BODY_H)

    el = core.ellipsoid(name + "_elytra", (1.60, 0.90, 0.62), (-0.58, 0, 0.03),
                        segs=(40, 20), deform=_elytra_deform)
    el.parent = body
    M.assign(el, mats.elytra)
    # elytral suture
    pts = [Vector((-0.56 + x, 0, 0.03 + 0.30 * math.sqrt(max(0.0, 1 - (x / 0.79) ** 2)) * 0.95))
           for x in [0.74 - 1.5 * i / 14 for i in range(15)]]
    sut = core.tube(name + "_suture", pts, 0.012, ring=6, subsurf=0)
    sut.parent = body
    M.assign(sut, mats.dark)
    # abdomen underside (visible from below)
    ab = core.ellipsoid(name + "_abdomen", (1.35, 0.8, 0.4), (-0.5, 0, -0.12), segs=(24, 12))
    ab.parent = body
    M.assign(ab, mats.limb)
    pr = core.ellipsoid(name + "_pronotum", (0.94, 0.80, 0.60), (0.46, 0, 0.04),
                        segs=(32, 18), deform=_pronotum_deform)
    pr.parent = body
    M.assign(pr, mats.pronotum)

    head = core.empty(name + "_head", parent=body)
    head.location = (0.90, 0, 0.0)
    hd = core.ellipsoid(name + "_headcap", (0.36, 0.36, 0.33), (0.06, 0, 0), segs=(24, 12))
    hd.parent = head
    M.assign(hd, mats.pronotum)
    for s in (1, -1):
        eye = core.ellipsoid(name + f"_eye{s}", (0.13, 0.06, 0.16), (0.09, 0.155 * s, 0.03),
                             segs=(16, 8))
        eye.parent = head
        M.assign(eye, mats.eye)
    rpts = [Vector(p) for p in ((0.16, 0, -0.02), (0.40, 0, -0.10), (0.62, 0, -0.22),
                                (0.78, 0, -0.36), (0.88, 0, -0.50))]
    ros = core.tube(name + "_rostrum", rpts, [0.08, 0.072, 0.066, 0.062, 0.06], ring=12)
    ros.parent = head
    M.assign(ros, mats.limb)
    for s in (1, -1):
        mpts = [Vector((0.87, 0.022 * s, -0.51)), Vector((0.91, 0.03 * s, -0.57)),
                Vector((0.89, 0.012 * s, -0.62))]
        md = core.tube(name + f"_mandible{s}", mpts, [0.022, 0.016, 0.006], ring=6, subsurf=0)
        md.parent = head
        M.assign(md, mats.dark)
    antennae = []
    for s in (1, -1):
        ant = core.empty(name + f"_antenna{s}", parent=head)
        ant.location = (0.50, 0.06 * s, -0.13)
        scape = core.tube(name + f"_scape{s}",
                          [Vector((0, 0, 0)), Vector((0.05, 0.08 * s, 0.10)),
                           Vector((0.09, 0.16 * s, 0.24))], [0.022, 0.024, 0.028], ring=8)
        scape.parent = ant
        elbow = core.empty(name + f"_elbow{s}", parent=ant)
        elbow.location = (0.09, 0.16 * s, 0.24)
        fpts = [Vector((0, 0, 0)), Vector((0.08, 0.05 * s, 0.03)), Vector((0.17, 0.10 * s, 0.04)),
                Vector((0.26, 0.15 * s, 0.03))]
        fun = core.tube(name + f"_funicle{s}", fpts, [0.02, 0.019, 0.02, 0.022], ring=8,
                        radius_fn=lambda i, t, a: 1.0 + 0.15 * math.cos(t * 6 * math.pi * 2))
        fun.parent = elbow
        club = core.ellipsoid(name + f"_club{s}", (0.15, 0.075, 0.075), (0.31, 0.18 * s, 0.025),
                              segs=(16, 8))
        club.parent = elbow
        for o in (scape, fun, club):
            M.assign(o, mats.limb)
        antennae.append((ant, elbow, s))

    legs = []
    for side in (1, -1):
        for key, (att, yaw, lf, lt, lta) in LEGS.items():
            base = core.empty(name + f"_hipbase{key}{side}", parent=body)
            base.location = (att[0], att[1] * side, att[2])
            base.rotation_euler = (0, 0, math.radians(yaw * side))
            cox = core.ellipsoid(name + f"_coxa{key}{side}", (0.16, 0.13, 0.13), (0.02, 0, 0),
                                 segs=(12, 8))
            cox.parent = base
            M.assign(cox, mats.limb)
            hip = core.empty(name + f"_hip{key}{side}", parent=base)
            fem = core.tube(name + f"_femur{key}{side}",
                            [Vector((0.04, 0, 0)), Vector((lf * 0.35, 0, 0)),
                             Vector((lf * 0.7, 0, 0)), Vector((lf, 0, 0))],
                            [0.04, 0.072, 0.07, 0.04], ring=10)
            fem.parent = hip
            knee = core.empty(name + f"_knee{key}{side}", parent=hip)
            knee.location = (lf, 0, 0)
            tib = core.tube(name + f"_tibia{key}{side}",
                            [Vector((0, 0, 0)), Vector((lt * 0.5, 0, 0)), Vector((lt, 0, 0)),
                             Vector((lt + 0.03, 0, -0.04))],
                            [0.036, 0.034, 0.04, 0.014], ring=8)
            tib.parent = knee
            ank = core.empty(name + f"_ankle{key}{side}", parent=knee)
            ank.location = (lt, 0, 0)
            tpts = [Vector((i * lta / 6, 0, 0)) for i in range(7)]
            tar = core.tube(name + f"_tarsus{key}{side}", tpts,
                            [0.024, 0.03, 0.022, 0.03, 0.024, 0.026, 0.014], ring=8)
            tar.parent = ank
            for cs in (1, -1):
                cl = core.tube(name + f"_claw{key}{side}{cs}",
                               [Vector((lta, 0, 0)), Vector((lta + 0.05, 0.02 * cs, -0.01)),
                                Vector((lta + 0.07, 0.025 * cs, -0.05))],
                               [0.01, 0.007, 0.002], ring=6, subsurf=0)
                cl.parent = ank
                M.assign(cl, mats.dark)
            for o in (fem, tib, tar):
                M.assign(o, mats.limb)
            legs.append(dict(key=key, side=side, hip=hip, knee=knee, ankle=ank))
    rig = dict(name=name, root=root, body=body, head=head, antennae=antennae, legs=legs,
               mats=mats)
    pose_stand(rig)
    if coll:
        core.move_tree_to(root, coll)
    return rig


def pose_leg(leg, p, k, t, swing):
    leg["hip"].rotation_euler = Euler((0, math.radians(-p), math.radians(swing)))
    leg["knee"].rotation_euler = Euler((0, math.radians(k), 0))
    leg["ankle"].rotation_euler = Euler((0, math.radians(t), 0))


def pose_stand(rig):
    for leg in rig["legs"]:
        pose_leg(leg, STAND["p"], STAND["k"], STAND["t"], 0)


def key_leg(leg, f):
    for o in (leg["hip"], leg["knee"], leg["ankle"]):
        o.keyframe_insert("rotation_euler", frame=f)


TRIPOD = {("1", 1): 0.0, ("2", -1): 0.0, ("3", 1): 0.0,
          ("1", -1): 0.5, ("2", 1): 0.5, ("3", -1): 0.5}


def animate_weevil(rig, f0, f1, path, gait_scale=1.0, head=None, antenna_seed=0,
                   stride=0.55, extra=None, phase_fn=None):
    """Procedural walk.

    path(f) -> (location Vector, yaw radians, walk_amount 0..1)
    head(f) -> (pitch_deg, yaw_deg) optional
    extra(rig, f) optional per-frame hook (e.g. drilling bob).
    Gait phase advances with distance travelled and turning, so feet don't skate.
    """
    root, body = rig["root"], rig["body"]
    phase = 0.0
    prev = None
    for f in range(f0, f1 + 1):
        res = path(f)
        loc, yaw, walk = res[0], res[1], res[2]
        pitch = res[3] if len(res) > 3 else 0.0
        roll = res[4] if len(res) > 4 else 0.0
        if phase_fn is not None:
            phase = phase_fn(f)
        elif prev is not None:
            dist = (Vector(loc) - Vector(prev[0])).length
            dturn = abs(yaw - prev[1]) * 0.45
            phase += (dist + dturn) / stride
        if phase_fn is None:
            phase += 0.004 * (1 - walk)  # tiny idle shuffle so legs never freeze
        prev = (loc, yaw)
        root.location = loc
        root.rotation_euler = (roll, pitch, yaw)
        root.keyframe_insert("location", frame=f)
        root.keyframe_insert("rotation_euler", frame=f)
        bob = 0.025 * walk * math.sin(phase * 4 * math.pi)
        body.location = (0, 0, BODY_H + bob)
        body.rotation_euler = (0.03 * walk * math.sin(phase * 2 * math.pi), 0, 0)
        body.keyframe_insert("location", frame=f)
        body.keyframe_insert("rotation_euler", frame=f)
        for leg in rig["legs"]:
            ph = (phase + TRIPOD[(leg["key"], leg["side"])]) % 1.0
            s = -math.cos(2 * math.pi * ph)
            lift = max(0.0, math.sin(2 * math.pi * ph)) * walk
            amp = 20.0 * gait_scale * walk
            swing = -leg["side"] * amp * s
            p = STAND["p"] + 18 * lift
            k = STAND["k"] + 14 * lift
            pose_leg(leg, p, k, STAND["t"] - 10 * lift, swing)
            key_leg(leg, f)
        hp, hy = head(f) if head else (0.0, 0.0)
        hp += 3.0 * core.nz(antenna_seed + 3, f / 30.0, 0.6)
        hy += 4.0 * core.nz(antenna_seed + 4, f / 30.0, 0.5)
        rig["head"].rotation_euler = (0, math.radians(hp), math.radians(hy))
        rig["head"].keyframe_insert("rotation_euler", frame=f)
        for ant, elbow, s in rig["antennae"]:
            a1 = 10 * core.nz(antenna_seed + s * 7, f / 30.0, 1.7)
            a2 = 14 * core.nz(antenna_seed + s * 11, f / 30.0, 2.3)
            ant.rotation_euler = (0, math.radians(a1), math.radians(a2 * 0.6 * s))
            elbow.rotation_euler = (0, math.radians(-a2 * 0.5), math.radians(a1 * 0.8 * s))
            ant.keyframe_insert("rotation_euler", frame=f)
            elbow.keyframe_insert("rotation_euler", frame=f)
        if extra:
            extra(rig, f)


# --------------------------------------------------------------------------- egg
def build_egg(name="Egg", coll=None):
    mat = M.soft_body_material(name + "_mat", color=(0.95, 0.93, 0.86, 1), sss=(1, 0.95, 0.85),
                               gloss=0.15)
    egg = core.ellipsoid(name, (0.68, 0.32, 0.32), segs=(24, 12),
                         deform=lambda c: Vector((c.x, c.y * (1 - 0.15 * c.x / 0.34),
                                                  c.z * (1 - 0.15 * c.x / 0.34))))
    M.assign(egg, mat)
    if coll:
        core.link(egg, coll)
    return egg, mat


# --------------------------------------------------------------------------- larva
def _larva_points(length, curl_deg, phase, n=40):
    curl = math.radians(curl_deg)
    R = length / curl
    pts = []
    for i in range(n):
        t = i / (n - 1)
        # peristaltic wave modulates local curvature slightly
        a = -curl / 2 + curl * t + 0.06 * math.sin(2 * math.pi * (t * 2.5 - phase))
        pts.append(Vector((R * math.sin(a), 0, -R * math.cos(a))))
    return pts


def _larva_radius(length, phase):
    def fn(i, t, a):
        body = 0.36 + 0.64 * math.sin(math.pi * (0.06 + 0.88 * t)) ** 0.65
        seg = 1.0 + 0.085 * math.cos(2 * math.pi * 11 * t)
        wave = 1.0 + 0.07 * math.sin(2 * math.pi * (t * 2.5 - phase))
        ventral = 1.0 - 0.12 * max(0.0, math.cos(a))  # flatter ventral side
        return body * seg * wave * ventral
    return fn


def build_larva(name="Larva", length=2.4, curl_deg=230, coll=None, darken_value=None):
    mat = M.soft_body_material(name + "_mat", darken_value=darken_value)
    headmat = M.cuticle_material(name + "_headmat", base=(0.32, 0.15, 0.05, 1),
                                 punct_strength=0.05)
    rad = length * 0.16
    phases = [0.0, 0.25, 0.5, 0.75]
    obj = core.tube(name, _larva_points(length, curl_deg, 0.0), rad, ring=20, subsurf=1,
                    radius_fn=_larva_radius(length, 0.0))
    M.assign(obj, mat)
    obj.shape_key_add(name="Basis")
    for ph in phases[1:] + [1.0]:
        tmp = core.tube("tmp", _larva_points(length, curl_deg, ph), rad, ring=20, subsurf=0,
                        radius_fn=_larva_radius(length, ph))
        sk = obj.shape_key_add(name=f"ph{ph}")
        for i, v in enumerate(tmp.data.vertices):
            sk.data[i].co = v.co
        bpy.data.objects.remove(tmp)
    # relaxed (less curled) key for crawling / feeding stretches
    tmp = core.tube("tmp", _larva_points(length * 1.08, curl_deg * 0.7, 0.0), rad, ring=20,
                    subsurf=0, radius_fn=_larva_radius(length, 0.0))
    sk = obj.shape_key_add(name="stretch")
    for i, v in enumerate(tmp.data.vertices):
        sk.data[i].co = v.co
    bpy.data.objects.remove(tmp)
    # head capsule at the start of the arc (t = 0)
    pts = _larva_points(length, curl_deg, 0.0)
    hpos = pts[0] + (pts[0] - pts[2]).normalized() * rad * 0.15
    head = core.ellipsoid(name + "_headcap", (rad * 0.95, rad * 1.0, rad * 0.95), hpos,
                          segs=(16, 10))
    head.parent = obj
    M.assign(head, headmat)
    for s in (1, -1):
        md = core.ellipsoid(name + f"_mand{s}", (rad * 0.35, rad * 0.22, rad * 0.3),
                            hpos + (pts[0] - pts[2]).normalized() * rad * 0.55
                            + Vector((0, s * rad * 0.18, 0)), segs=(8, 6))
        md.parent = obj
        M.assign(md, M.cuticle_material(name + "_mandmat", base=(0.05, 0.02, 0.01, 1),
                                        punct_strength=0))
    if coll:
        core.move_tree_to(obj, coll)
    return obj, mat


def animate_larva(obj, f0, f1, speed=0.9, seed=0, stretch=None):
    keys = obj.data.shape_keys.key_blocks
    names = ["ph0.25", "ph0.5", "ph0.75", "ph1.0"]
    for f in range(f0, f1 + 1):
        ph = (f - f0) / 30.0 * speed + 0.1 * core.nz(seed, f / 30.0, 0.3)
        x = (ph % 1.0) * 4  # 0..4 across the 4 keys
        for i, nm in enumerate(names):
            w = max(0.0, 1 - abs(x - (i + 1)))
            if i == 3:
                w = max(w, 0.0)
            keys[nm].value = w
            keys[nm].keyframe_insert("value", frame=f)
        if stretch:
            keys["stretch"].value = stretch(f)
            keys["stretch"].keyframe_insert("value", frame=f)


# --------------------------------------------------------------------------- pupa
def build_pupa(name="Pupa", coll=None, darken_value="PupaDark", eye_value="PupaEye"):
    """Exarate pupa lying on its back: appendages folded against the ventral surface."""
    mat = M.soft_body_material(name + "_mat", color=(0.95, 0.92, 0.84, 1), gloss=0.22,
                               darken_value=darken_value, dark=(0.55, 0.32, 0.16, 1))
    eyemat = M.soft_body_material(name + "_eyemat", color=(0.9, 0.86, 0.78, 1),
                                  darken_value=eye_value, dark=(0.06, 0.02, 0.01, 1))
    root = core.empty(name + "_root")
    parts = []
    abd_pts = [Vector((-0.2 - 0.12 * i, 0, 0.02 * i * i * 0.15 - 0.03 * i)) for i in range(12)]
    abd = core.tube(name + "_abdomen", abd_pts, [0.36, 0.42, 0.44, 0.44, 0.43, 0.41, 0.37, 0.32,
                                                 0.26, 0.2, 0.13, 0.06], ring=18,
                    radius_fn=lambda i, t, a: 1 + 0.07 * math.cos(2 * math.pi * 7 * t))
    parts.append(abd)
    thx = core.ellipsoid(name + "_thorax", (0.9, 0.78, 0.62), (0.3, 0, 0.02), segs=(28, 14),
                         deform=_pronotum_deform)
    parts.append(thx)
    hd = core.ellipsoid(name + "_head", (0.36, 0.36, 0.34), (0.82, 0, -0.02), segs=(18, 10))
    parts.append(hd)
    # rostrum folded back along the ventral side (pupa lies on its back: ventral = +z here)
    ros = core.tube(name + "_rostrum", [Vector((0.9, 0, 0.12)), Vector((0.82, 0, 0.3)),
                                        Vector((0.55, 0, 0.36)), Vector((0.2, 0, 0.38))],
                    [0.08, 0.07, 0.065, 0.06], ring=10)
    parts.append(ros)
    for s in (1, -1):
        # wing pads wrapping the sides
        wp = core.ellipsoid(name + f"_wingpad{s}", (1.0, 0.16, 0.5), (-0.35, 0.36 * s, 0.12),
                            segs=(20, 10))
        wp.rotation_euler = (math.radians(-25 * s), 0, math.radians(4 * s))
        parts.append(wp)
        # folded legs: femur forward, tibia back, pressed onto ventral surface
        for j, x in enumerate((0.45, 0.15, -0.15)):
            pts = [Vector((x, 0.22 * s, 0.25)), Vector((x + 0.18, 0.34 * s, 0.33)),
                   Vector((x - 0.05, 0.30 * s, 0.4)), Vector((x - 0.35 - 0.05 * j, 0.18 * s, 0.38))]
            lg = core.tube(name + f"_leg{j}{s}", pts, [0.05, 0.055, 0.045, 0.035], ring=8)
            parts.append(lg)
        # antenna folded beside rostrum
        an = core.tube(name + f"_ant{s}", [Vector((0.75, 0.08 * s, 0.25)),
                                           Vector((0.62, 0.22 * s, 0.33)),
                                           Vector((0.35, 0.3 * s, 0.32))], 0.025, ring=6)
        parts.append(an)
        eye = core.ellipsoid(name + f"_eye{s}", (0.13, 0.06, 0.16), (0.85, 0.16 * s, -0.04),
                             segs=(12, 8))
        eye.parent = root
        M.assign(eye, eyemat)
    for p in parts:
        p.parent = root
        M.assign(p, mat)
    if coll:
        core.move_tree_to(root, coll)
    return root, mat, eyemat


def set_mats_value(mats, name, value, frame):
    for m in mats:
        if name in m.node_tree.nodes:
            M.set_value_node(m, name, value, frame)
