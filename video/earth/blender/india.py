"""Indian (Mumbai-style) street kit for the reel.

Coordinates: +X = EAST (direction of Earth's rotation), +Y = north, +Z = up, metres.
The street runs east-west along X; building facades face the street.
Buildings are built as ONE mesh each (multi-material) with real geometry for windows, frames,
grilles, chhajjas, balconies, AC units, shop shutters, so they read crisply in close-ups.
"""
import math, os, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler
from common import new_mat, link_obj, set_mat, principled, emission_mat, TEX

SIGNS = ["sharma", "chai", "medical", "sweets", "hardware", "mobile", "vadapav", "tailor", "kirana", "jewellers", "bank", "xerox"]
PAINTS = [(0.8, 0.55, 0.15), (0.85, 0.7, 0.38), (0.28, 0.55, 0.68), (0.78, 0.38, 0.28), (0.45, 0.62, 0.35), (0.86, 0.82, 0.72),
          (0.62, 0.38, 0.55), (0.45, 0.5, 0.56), (0.88, 0.62, 0.3), (0.62, 0.22, 0.16), (0.3, 0.6, 0.55)]


# ---------------------------------------------------------------- mesh builder
class MB:
    """Accumulates boxes/cylinders into a single mesh with material indices."""

    def __init__(self):
        self.bm = bmesh.new()
        self.mat_layer = None

    def box(self, c, s, mat=0, rz=0.0):
        r = bmesh.ops.create_cube(self.bm, size=1.0)
        vs = r["verts"]
        M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Diagonal((*s, 1))
        bmesh.ops.transform(self.bm, matrix=M, verts=vs)
        faces = {f for v in vs for f in v.link_faces}
        for f in faces:
            f.material_index = mat
        return vs

    def cyl(self, c, r, h, mat=0, seg=16, axis="Z", rz=0.0):
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=h)
        vs = res["verts"]
        rot = Matrix.Identity(4)
        if axis == "X":
            rot = Matrix.Rotation(math.pi / 2, 4, "Y")
        elif axis == "Y":
            rot = Matrix.Rotation(math.pi / 2, 4, "X")
        M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rz, 4, "Z") @ rot
        bmesh.ops.transform(self.bm, matrix=M, verts=vs)
        for f in {f for v in vs for f in v.link_faces}:
            f.material_index = mat
            f.smooth = True
        return vs

    def build(self, name, mats, loc=(0, 0, 0)):
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        ob = bpy.data.objects.new(name, me)
        link_obj(ob)
        for m in mats:
            ob.data.materials.append(m)
        ob.location = loc
        return ob


# ---------------------------------------------------------------- materials
_M = {}


def _m(n, l, op, a, b=None):
    x = n.new("ShaderNodeMath"); x.operation = op
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            x.inputs[i].default_value = v
        else:
            l.new(v, x.inputs[i])
    return x.outputs[0]


def paint_material(rgb, name):
    """Exterior paint with monsoon stains: darker streaks running down, grime near the ground."""
    m, n, l, out = new_mat(name)
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(tc.outputs["Object"], sep.inputs[0])
    streak = n.new("ShaderNodeTexNoise"); streak.inputs["Scale"].default_value = 1.0; streak.inputs["Detail"].default_value = 6
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (3.0, 3.0, 0.12)
    l.new(tc.outputs["Object"], mp.inputs[0]); l.new(mp.outputs[0], streak.inputs[0])
    blot = n.new("ShaderNodeTexNoise"); blot.inputs["Scale"].default_value = 0.35; blot.inputs["Detail"].default_value = 8
    l.new(tc.outputs["Object"], blot.inputs[0])
    st = n.new("ShaderNodeMapRange"); st.inputs[1].default_value = 0.5; st.inputs[2].default_value = 0.75
    l.new(streak.outputs["Fac"], st.inputs[0])
    bl = n.new("ShaderNodeMapRange"); bl.inputs[1].default_value = 0.45; bl.inputs[2].default_value = 0.7
    l.new(blot.outputs["Fac"], bl.inputs[0])
    low = n.new("ShaderNodeMapRange"); low.inputs[1].default_value = 2.5; low.inputs[2].default_value = 0.0
    l.new(sep.outputs[2], low.inputs[0])
    dirt = _m(n, l, "MINIMUM", _m(n, l, "ADD", _m(n, l, "MULTIPLY", st.outputs[0], 0.55), _m(n, l, "ADD", _m(n, l, "MULTIPLY", bl.outputs[0], 0.35), _m(n, l, "MULTIPLY", low.outputs[0], 0.5))), 1.0)
    mix = n.new("ShaderNodeMix"); mix.data_type = "RGBA"
    l.new(dirt, mix.inputs[0])
    mix.inputs[6].default_value = (*rgb, 1)
    mix.inputs[7].default_value = (rgb[0] * 0.42, rgb[1] * 0.4, rgb[2] * 0.38, 1)
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(mix.outputs[2], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.88
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.2
    fine = n.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 25
    l.new(tc.outputs["Object"], fine.inputs[0]); l.new(fine.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def mats():
    if _M:
        return _M
    _M["glass"] = principled("WinGlass", (0.03, 0.045, 0.05), rough=0.03, spec=1.0)
    _M["frame"] = principled("WinFrame", (0.82, 0.82, 0.8), rough=0.5)
    _M["grille"] = principled("Grille", (0.05, 0.05, 0.055), rough=0.45, metal=0.8)
    _M["slab"] = paint_material((0.72, 0.7, 0.66), "SlabConcrete")
    _M["shutter"] = shutter_material()
    _M["ac"] = principled("ACUnit", (0.86, 0.86, 0.84), rough=0.4)
    _M["tank"] = principled("WaterTank", (0.03, 0.03, 0.03), rough=0.45)
    _M["shop"] = shop_interior()
    _M["metal"] = principled("PoleMetal", (0.15, 0.15, 0.16), rough=0.4, metal=0.9)
    _M["concrete"] = principled("ConcretePole", (0.55, 0.54, 0.5), rough=0.85)
    _M["wire"] = principled("Wire", (0.01, 0.01, 0.01), rough=0.5)
    _M["rubber"] = principled("Tyre", (0.025, 0.025, 0.025), rough=0.75)
    _M["chrome"] = principled("Chrome", (0.8, 0.8, 0.82), rough=0.12, metal=1.0)
    _M["carglass"] = principled("CarGlass", (0.02, 0.025, 0.03), rough=0.02, spec=1.0)
    _M["head"] = emission_mat("HeadLamp", (1.0, 0.95, 0.85), 6)
    _M["tail"] = emission_mat("TailLamp", (1.0, 0.06, 0.03), 4)
    _M["black"] = car_paint((0.012, 0.012, 0.014), "PaintBlack")
    _M["yellow"] = car_paint((0.95, 0.68, 0.02), "PaintYellow")
    _M["autogreen"] = car_paint((0.02, 0.22, 0.08), "PaintAutoGreen")
    _M["busred"] = car_paint((0.55, 0.02, 0.02), "PaintBusRed")
    _M["cream"] = car_paint((0.85, 0.8, 0.65), "PaintCream")
    _M["white"] = car_paint((0.85, 0.86, 0.87), "PaintWhite")
    _M["silver"] = car_paint((0.45, 0.47, 0.5), "PaintSilver")
    _M["canvas"] = principled("Canopy", (0.95, 0.72, 0.05), rough=0.7)
    _M["seat"] = principled("Seat", (0.05, 0.05, 0.05), rough=0.6)
    _M["leaf"] = leaf_material()
    _M["bark"] = principled("Bark", (0.09, 0.07, 0.05), rough=0.9)
    _M["kerb"] = kerb_material()
    _M["pavers"] = pavers_material()
    _M["road"] = road_material()
    _M["cloth"] = [principled(f"Laundry{i}", c, rough=0.9) for i, c in enumerate([(0.8, 0.1, 0.1), (0.1, 0.3, 0.7), (0.9, 0.7, 0.1), (0.9, 0.9, 0.9), (0.1, 0.5, 0.3)])]
    _M["tin"] = principled("TinShade", (0.35, 0.37, 0.4), rough=0.45, metal=0.7)
    _M["plastic"] = [principled(f"Plastic{i}", c, rough=0.4) for i, c in enumerate([(0.05, 0.25, 0.6), (0.7, 0.05, 0.05), (0.05, 0.5, 0.15), (0.95, 0.85, 0.75)])]
    return _M


def shop_interior():
    """Dim shop interior seen under a half-raised shutter: dark goods on shelves, warm tube light near the top."""
    m, n, l, out = new_mat("ShopInside")
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(tc.outputs["Object"], sep.inputs[0])
    shelf = _m(n, l, "LESS_THAN", _m(n, l, "FRACT", _m(n, l, "DIVIDE", sep.outputs[2], 0.55)), 0.1)
    glow = n.new("ShaderNodeMapRange"); glow.inputs[1].default_value = 1.2; glow.inputs[2].default_value = 2.9
    l.new(sep.outputs[2], glow.inputs[0])
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"
    l.new(shelf, col.inputs[0]); col.inputs[6].default_value = (0.05, 0.035, 0.025, 1); col.inputs[7].default_value = (0.18, 0.13, 0.09, 1)
    b = n.new("ShaderNodeBsdfPrincipled"); l.new(col.outputs[2], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.7
    b.inputs["Emission Color"].default_value = (1.0, 0.72, 0.42, 1)
    l.new(_m(n, l, "MULTIPLY", glow.outputs[0], 0.35), b.inputs["Emission Strength"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def car_paint(rgb, name):
    m = principled(name, rgb, rough=0.22, metal=0.15)
    b = next(x for x in m.node_tree.nodes if x.type == "BSDF_PRINCIPLED")
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.05
    return m


def shutter_material():
    m, n, l, out = new_mat("RollingShutter")
    tc = n.new("ShaderNodeTexCoord")
    w = n.new("ShaderNodeTexWave"); w.wave_type = "BANDS"; w.inputs["Scale"].default_value = 6.0
    try:
        w.bands_direction = "Z"
    except Exception:
        pass
    l.new(tc.outputs["Object"], w.inputs[0])
    b = n.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (0.32, 0.34, 0.36, 1); b.inputs["Metallic"].default_value = 0.8; b.inputs["Roughness"].default_value = 0.45
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.6
    l.new(w.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def leaf_material():
    m, n, l, out = new_mat("NeemLeaves")
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 7; nz.inputs["Detail"].default_value = 6
    l.new(tc.outputs["Object"], nz.inputs[0])
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"
    l.new(nz.outputs["Fac"], col.inputs[0])
    col.inputs[6].default_value = (0.03, 0.09, 0.02, 1); col.inputs[7].default_value = (0.12, 0.22, 0.04, 1)
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(col.outputs[2], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.6
    b.inputs["Subsurface Weight"].default_value = 0.15
    vor = n.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 30
    l.new(tc.outputs["Object"], vor.inputs[0])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.9
    l.new(vor.outputs["Distance"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def kerb_material():
    """Black-and-yellow painted kerb stones, as on Indian city roads."""
    m, n, l, out = new_mat("KerbStripes")
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(tc.outputs["Object"], sep.inputs[0])
    st = _m(n, l, "LESS_THAN", _m(n, l, "FRACT", _m(n, l, "DIVIDE", sep.outputs[0], 1.2)), 0.5)
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"
    l.new(st, col.inputs[0]); col.inputs[6].default_value = (0.03, 0.03, 0.03, 1); col.inputs[7].default_value = (0.85, 0.66, 0.05, 1)
    b = n.new("ShaderNodeBsdfPrincipled"); l.new(col.outputs[2], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.6
    l.new(b.outputs[0], out.inputs[0])
    return m


def pavers_material():
    m, n, l, out = new_mat("Pavers")
    tc = n.new("ShaderNodeTexCoord")
    br = n.new("ShaderNodeTexBrick")
    br.inputs["Color1"].default_value = (0.5, 0.42, 0.36, 1); br.inputs["Color2"].default_value = (0.42, 0.38, 0.35, 1)
    br.inputs["Mortar"].default_value = (0.2, 0.19, 0.18, 1)
    br.inputs["Scale"].default_value = 2.0; br.inputs["Mortar Size"].default_value = 0.015
    br.inputs["Brick Width"].default_value = 0.5; br.inputs["Row Height"].default_value = 0.25
    l.new(tc.outputs["Object"], br.inputs[0])
    wet = n.new("ShaderNodeTexNoise"); wet.inputs["Scale"].default_value = 0.4
    l.new(tc.outputs["Object"], wet.inputs[0])
    wr = n.new("ShaderNodeMapRange"); wr.inputs[1].default_value = 0.45; wr.inputs[2].default_value = 0.6
    wr.inputs[3].default_value = 0.6; wr.inputs[4].default_value = 0.12
    l.new(wet.outputs["Fac"], wr.inputs[0])
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(br.outputs["Color"], b.inputs["Base Color"]); l.new(wr.outputs[0], b.inputs["Roughness"])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.5; bump.invert = True
    l.new(br.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def road_material():
    """Wet monsoon asphalt: puddles mirror the sky; white lane paint and a zebra crossing at x in [-3, 3]."""
    m, n, l, out = new_mat("WetAsphalt")
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(tc.outputs["Object"], sep.inputs[0])
    x, y = sep.outputs[0], sep.outputs[1]
    agg = n.new("ShaderNodeTexNoise"); agg.inputs["Scale"].default_value = 60; agg.inputs["Detail"].default_value = 10
    l.new(tc.outputs["Object"], agg.inputs[0])
    pud = n.new("ShaderNodeTexNoise"); pud.inputs["Scale"].default_value = 0.18; pud.inputs["Detail"].default_value = 5
    l.new(tc.outputs["Object"], pud.inputs[0])
    pr = n.new("ShaderNodeMapRange"); pr.inputs[1].default_value = 0.5; pr.inputs[2].default_value = 0.58
    l.new(pud.outputs["Fac"], pr.inputs[0])
    centre = _m(n, l, "MULTIPLY", _m(n, l, "LESS_THAN", _m(n, l, "ABSOLUTE", y), 0.07), _m(n, l, "LESS_THAN", _m(n, l, "FRACT", _m(n, l, "DIVIDE", x, 6.0)), 0.5))
    edge = _m(n, l, "MULTIPLY", _m(n, l, "GREATER_THAN", _m(n, l, "ABSOLUTE", y), 4.55), _m(n, l, "LESS_THAN", _m(n, l, "ABSOLUTE", y), 4.7))
    zebra = _m(n, l, "MULTIPLY", _m(n, l, "LESS_THAN", _m(n, l, "ABSOLUTE", x), 2.4),
               _m(n, l, "MULTIPLY", _m(n, l, "LESS_THAN", _m(n, l, "FRACT", _m(n, l, "DIVIDE", y, 1.0)), 0.55), _m(n, l, "LESS_THAN", _m(n, l, "ABSOLUTE", y), 4.3)))
    paint = _m(n, l, "MINIMUM", _m(n, l, "ADD", _m(n, l, "ADD", centre, edge), zebra), 1.0)
    base = n.new("ShaderNodeMix"); base.data_type = "RGBA"
    l.new(agg.outputs["Fac"], base.inputs[0]); base.inputs[6].default_value = (0.03, 0.032, 0.035, 1); base.inputs[7].default_value = (0.075, 0.075, 0.08, 1)
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"
    l.new(paint, col.inputs[0]); l.new(base.outputs[2], col.inputs[6]); col.inputs[7].default_value = (0.82, 0.82, 0.8, 1)
    rough = n.new("ShaderNodeMapRange"); rough.inputs[3].default_value = 0.42; rough.inputs[4].default_value = 0.025
    l.new(pr.outputs[0], rough.inputs[0])
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(col.outputs[2], b.inputs["Base Color"]); l.new(rough.outputs[0], b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.7
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.12
    l.new(agg.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def sign_material(sid):
    key = "sign_" + sid
    if key in _M:
        return _M[key]
    m, n, l, out = new_mat(key)
    t = n.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(os.path.join(TEX, "signs", f"{sid}.png"), check_existing=True)
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(t.outputs[0], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.45
    l.new(t.outputs[0], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = 0.25
    l.new(b.outputs[0], out.inputs[0])
    _M[key] = m
    return m


# ---------------------------------------------------------------- buildings
def building(name, x0, w, side, rng, y_face=7.5, floors=None, paint=None, sign=None):
    """side=+1: north row (facade faces -Y). side=-1: south row (facade faces +Y)."""
    M = mats()
    floors = floors or rng.randint(3, 7)
    gh, fh = 4.2, 3.1
    H = gh + floors * fh
    depth = rng.uniform(12, 16)
    paint = paint or rng.choice(PAINTS)
    wall = paint_material(paint, name + "_paint")
    s = -side  # outward normal direction of the facade along Y
    fy = side * y_face  # facade plane
    mb = MB()
    # main mass
    mb.box((x0 + w / 2, fy + side * depth / 2, H / 2), (w, depth, H), 0)
    # floor bands
    for k in range(floors + 1):
        z = gh + k * fh
        mb.box((x0 + w / 2, fy + s * 0.08, z - 0.05), (w, 0.16, 0.18), 4)
    bays = max(2, int(w / rng.uniform(2.6, 3.3)))
    bw = w / bays
    for k in range(floors):
        z0 = gh + k * fh
        for b in range(bays):
            cx = x0 + bw * (b + 0.5)
            ww = bw * rng.uniform(0.5, 0.62)
            wh = 1.45
            wz = z0 + 0.95 + wh / 2
            balcony = rng.random() < 0.28 and k < floors - 0
            # recess + glass
            mb.box((cx, fy + s * 0.005, wz), (ww, 0.02, wh), 1)
            # frame
            t = 0.07
            for dx in (-ww / 2, ww / 2):
                mb.box((cx + dx, fy + s * 0.05, wz), (t, 0.1, wh + t), 2)
            for dz in (-wh / 2, wh / 2):
                mb.box((cx, fy + s * 0.05, wz + dz), (ww + t, 0.1, t), 2)
            mb.box((cx, fy + s * 0.05, wz), (0.04, 0.08, wh), 2)  # mullion
            # grille (very common on Indian windows)
            if rng.random() < 0.6:
                for g in range(5):
                    gx = cx - ww / 2 + ww * (g + 0.5) / 5
                    mb.box((gx, fy + s * 0.16, wz), (0.018, 0.018, wh), 3)
                for gz in (-0.35, 0.35):
                    mb.box((cx, fy + s * 0.16, wz + gz * wh), (ww, 0.018, 0.018), 3)
            # chhajja (sunshade slab)
            mb.box((cx, fy + s * 0.32, wz + wh / 2 + 0.18), (ww + 0.5, 0.64, 0.08), 4)
            if balcony:
                mb.box((cx, fy + s * 0.6, z0 + 0.08), (bw * 0.95, 1.2, 0.16), 4)
                for p in range(7):
                    px = cx - bw * 0.45 + bw * 0.9 * p / 6
                    mb.box((px, fy + s * 1.15, z0 + 0.6), (0.03, 0.03, 0.95), 3)
                mb.box((cx, fy + s * 1.15, z0 + 1.08), (bw * 0.92, 0.05, 0.05), 3)
                for p in range(2):
                    mb.box((cx - bw * 0.45 + bw * 0.9 * p, fy + s * 0.62, z0 + 0.6), (0.03, 1.1, 0.03), 3)
                if rng.random() < 0.5:  # laundry
                    for q in range(rng.randint(2, 4)):
                        mb.box((cx - bw * 0.3 + q * 0.4, fy + s * 1.18, z0 + 0.75), (0.32, 0.01, 0.55), 9 + rng.randint(0, 4))
            elif rng.random() < 0.35:  # AC unit under the window
                mb.box((cx + ww * 0.25, fy + s * 0.25, wz - wh / 2 - 0.35), (0.85, 0.5, 0.55), 6)
    # ground floor: shop with half-open shutter, interior glow, tin shade
    shop_w = w * 0.82
    cx = x0 + w / 2
    mb.box((cx, fy + s * 0.01, 1.6), (shop_w, 0.02, 3.0), 7)
    mb.box((cx, fy + s * 0.08, 2.75), (shop_w, 0.16, 0.75), 5)  # rolled-up shutter
    mb.box((cx, fy + s * 0.5, 3.35), (shop_w + 0.4, 1.0, 0.05), 8, rz=0)  # tin shade
    # rooftop parapet + Sintex water tanks
    mb.box((x0 + w / 2, fy + s * 0.08, H + 0.45), (w, 0.16, 0.9), 0)
    for t_i in range(rng.randint(1, 3)):
        mb.cyl((x0 + rng.uniform(1, w - 1), fy + side * rng.uniform(2, depth - 2), H + 0.8), 0.75, 1.6, 14, seg=20)
    obj_mats = [wall, M["glass"], M["frame"], M["grille"], M["slab"], M["shutter"], M["ac"], M["shop"], M["tin"]] + M["cloth"] + [M["tank"]]
    ob = mb.build(name, obj_mats)
    # signboard (textured plane) above the shop
    sid = sign or rng.choice(SIGNS)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(cx, fy + s * 0.2, 3.85))
    sg = bpy.context.active_object
    sg.name = name + "_sign"
    sg.scale = (shop_w * 0.95, 1, 0.95)
    sg.rotation_euler = (math.pi / 2, 0, 0 if side == 1 else math.pi)
    set_mat(sg, sign_material(sid))
    return ob, sg, H


def street(x_min=-80, x_max=160, rng=None, y_face=7.5):
    rng = rng or random.Random(4)
    M = mats()
    out = dict(buildings=[], signs=[], poles=[], trees=[], props=[])
    L = x_max - x_min
    cx = (x_min + x_max) / 2
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
    road = bpy.context.active_object; road.name = "Road"
    for v in road.data.vertices:
        v.co.x = v.co.x * L + cx; v.co.y *= 9.6
    set_mat(road, M["road"])
    bpy.ops.mesh.primitive_plane_add(size=3000, location=(0, 0, -0.03))
    g = bpy.context.active_object; g.name = "Ground"; set_mat(g, M["concrete"])
    for side in (1, -1):
        mb = MB()
        mb.box((cx, side * 4.9, 0.11), (L, 0.22, 0.22), 0)
        k = mb.build(f"Kerb{side}", [M["kerb"]])
        fp = MB(); fp.box((cx, side * (4.8 + (y_face - 4.8) / 2 + 0.1), 0.1), (L, y_face - 4.8 - 0.2, 0.2), 0)
        fpo = fp.build(f"Footpath{side}", [M["pavers"]])
        x = x_min
        i = 0
        while x < x_max:
            w = rng.uniform(9, 16)
            ob, sg, H = building(f"B{side}_{i}", x, w - 0.15, side, rng, y_face=y_face)
            out["buildings"].append(ob); out["signs"].append(sg)
            x += w
            i += 1
        # electric poles + sagging wires along the footpath
        poles = []
        for j, px in enumerate(range(int(x_min) + 6, int(x_max), 22)):
            pm = MB()
            pm.box((px, side * 5.6, 4.5), (0.22, 0.22, 9.0), 0)
            pm.box((px, side * 5.6, 8.6), (0.12, 1.6, 0.12), 0)
            pole = pm.build(f"Pole{side}_{j}", [M["concrete"]])
            out["poles"].append(pole)
            poles.append(px)
        for a, b in zip(poles[:-1], poles[1:]):
            for dy in (-0.6, 0.0, 0.6):
                out["props"].append(wire((a, side * 5.6 + dy, 8.55), (b, side * 5.6 + dy, 8.55), sag=0.55 + rng.uniform(0, 0.25)))
        # neem trees
        for j, tx in enumerate(range(int(x_min) + 15, int(x_max), 31)):
            out["trees"].append(tree(f"T{side}_{j}", (tx + rng.uniform(-3, 3), side * 6.2, 0.2), rng))
    # a few wires crossing the street
    for j, px in enumerate(range(int(x_min) + 6, int(x_max), 44)):
        out["props"].append(wire((px, 5.6, 8.5), (px + 3, -5.6, 8.5), sag=0.9))
    return out


def wire(a, b, sag=0.6, r=0.012):
    cu = bpy.data.curves.new("wire", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 1
    sp = cu.splines.new("POLY")
    N = 12
    sp.points.add(N)
    a, b = Vector(a), Vector(b)
    for i in range(N + 1):
        t = i / N
        p = a.lerp(b, t)
        p.z -= sag * 4 * t * (1 - t)
        sp.points[i].co = (*p, 1)
    ob = bpy.data.objects.new("Wire", cu)
    link_obj(ob)
    ob.data.materials.append(mats()["wire"])
    return ob


def tree(name, loc, rng, h=None):
    M = mats()
    h = h or rng.uniform(6.5, 8.5)
    mb = MB()
    mb.cyl((0, 0, h * 0.3), 0.2, h * 0.6, 0, seg=10)
    for k in range(3):
        a = rng.uniform(0, 6.28)
        mb.cyl((math.cos(a) * 0.6, math.sin(a) * 0.6, h * 0.6), 0.08, 1.6, 0, seg=8)
    trunk = mb.build(name + "_trunk", [M["bark"]], loc=loc)
    crowns = []
    for i in range(9):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=h * rng.uniform(0.11, 0.16),
                                              location=(loc[0] + rng.uniform(-1.8, 1.8), loc[1] + rng.uniform(-1.6, 1.6), loc[2] + h * rng.uniform(0.62, 0.95)))
        c = bpy.context.active_object
        c.name = f"{name}_crown{i}"
        tex = bpy.data.textures.get("leafnoise") or bpy.data.textures.new("leafnoise", "CLOUDS")
        tex.noise_scale = 0.18
        d = c.modifiers.new("d", "DISPLACE"); d.texture = tex; d.strength = 0.55
        for p in c.data.polygons:
            p.use_smooth = True
        set_mat(c, M["leaf"])
        c.parent = trunk
        c.matrix_parent_inverse = trunk.matrix_world.inverted()
        crowns.append(c)
    return trunk, crowns


# ---------------------------------------------------------------- vehicles (faces +X when heading=0)
def _wheel(mb, x, y, z, r=0.3, w=0.2, tyre=0, rim=1):
    mb.cyl((x, y, z), r, w, tyre, seg=20, axis="Y")
    mb.cyl((x, y + (w / 2 + 0.005) * (1 if y > 0 else -1), z), r * 0.6, 0.02, rim, seg=16, axis="Y")


def _finish(ob, bevel=0.06):
    md = ob.modifiers.new("bev", "BEVEL"); md.width = bevel; md.segments = 3; md.limit_method = "ANGLE"
    md.angle_limit = math.radians(40)
    md.harden_normals = False
    for p in ob.data.polygons:
        p.use_smooth = True
    ob.data.shade_auto_smooth(angle=math.radians(35)) if hasattr(ob.data, "shade_auto_smooth") else None
    return ob


def taxi(name, loc, heading=0.0):
    """Mumbai 'kaali-peeli' taxi (Premier Padmini-like): black body, yellow roof."""
    M = mats()
    mb = MB()
    mb.box((0, 0, 0.62), (3.9, 1.55, 0.62), 0)          # body
    mb.box((-0.2, 0, 1.14), (2.0, 1.4, 0.5), 2)           # glasshouse
    mb.box((-0.2, 0, 1.42), (1.95, 1.38, 0.08), 1)        # yellow roof
    mb.box((1.97, 0, 0.5), (0.08, 1.6, 0.16), 3)          # bumpers
    mb.box((-1.97, 0, 0.5), (0.08, 1.6, 0.16), 3)
    for sy in (0.52, -0.52):
        mb.cyl((1.96, sy, 0.72), 0.11, 0.05, 4, seg=16, axis="X")   # round headlamps
        mb.box((-1.96, sy, 0.75), (0.04, 0.3, 0.12), 5)
    mb.box((-0.2, 0, 1.6), (0.5, 0.2, 0.2), 1)            # TAXI roof sign
    for sx in (1.25, -1.25):
        for sy in (0.72, -0.72):
            _wheel(mb, sx, sy, 0.32, tyre=6, rim=3)
    ob = mb.build(name, [M["black"], M["yellow"], M["carglass"], M["chrome"], M["head"], M["tail"], M["rubber"]])
    _finish(ob, 0.07)
    ob.location = loc; ob.rotation_euler = (0, 0, heading)
    return ob


def auto_rickshaw(name, loc, heading=0.0):
    """Three-wheeler auto: green lower body, yellow canopy, single front wheel."""
    M = mats()
    mb = MB()
    mb.box((-0.35, 0, 0.55), (1.7, 1.3, 0.5), 0)        # rear body / seat box
    mb.box((0.7, 0, 0.62), (0.65, 0.95, 0.7), 0)         # front cowl
    mb.box((1.0, 0, 1.15), (0.08, 0.9, 0.6), 2)          # windscreen
    mb.box((-0.1, 0, 1.75), (2.35, 1.38, 0.12), 1)       # canopy roof
    mb.box((-1.15, 0, 1.25), (0.1, 1.36, 1.0), 1)        # canopy back
    for sy in (0.66, -0.66):
        mb.box((0.95, sy * 0.95, 1.2), (0.05, 0.05, 1.1), 3)
        mb.box((-1.1, sy, 1.2), (0.05, 0.05, 1.1), 3)
    mb.box((-0.45, 0, 0.92), (0.8, 1.15, 0.22), 4)       # passenger seat
    mb.cyl((1.06, 0, 0.82), 0.09, 0.04, 5, seg=14, axis="X")   # headlamp
    _wheel(mb, 0.9, 0.0, 0.25, r=0.25, w=0.14, tyre=6, rim=3)
    for sy in (0.6, -0.6):
        _wheel(mb, -0.65, sy, 0.25, r=0.25, w=0.14, tyre=6, rim=3)
    ob = mb.build(name, [M["autogreen"], M["canvas"], M["carglass"], M["chrome"], M["seat"], M["head"], M["rubber"]])
    _finish(ob, 0.05)
    ob.location = loc; ob.rotation_euler = (0, 0, heading)
    return ob


def best_bus(name, loc, heading=0.0):
    """Mumbai BEST bus: red body, cream window band."""
    M = mats()
    mb = MB()
    mb.box((0, 0, 1.55), (10.5, 2.5, 2.6), 0)
    mb.box((0, 0, 2.1), (10.3, 2.52, 0.95), 2)           # window band (glass)
    for k in range(9):
        mb.box((-4.6 + k * 1.15, 0, 2.1), (0.08, 2.54, 0.95), 1)   # pillars (cream)
    mb.box((0, 0, 1.55), (10.52, 2.53, 0.12), 1)          # cream stripe
    mb.box((5.26, 0, 2.0), (0.04, 2.2, 1.2), 2)           # windscreen
    mb.box((5.27, 0, 3.0), (0.04, 1.6, 0.3), 1)            # route board
    for sy in (0.95, -0.95):
        mb.cyl((5.27, sy, 0.75), 0.12, 0.04, 4, seg=14, axis="X")
    for sx in (3.4, -3.3):
        for sy in (1.15, -1.15):
            _wheel(mb, sx, sy, 0.5, r=0.5, w=0.32, tyre=5, rim=3)
    ob = mb.build(name, [M["busred"], M["cream"], M["carglass"], M["chrome"], M["head"], M["rubber"]])
    _finish(ob, 0.12)
    ob.location = loc; ob.rotation_euler = (0, 0, heading)
    return ob


def hatchback(name, loc, color="white", heading=0.0):
    M = mats()
    mb = MB()
    mb.box((0, 0, 0.6), (3.6, 1.62, 0.6), 0)
    mb.box((-0.25, 0, 1.12), (2.1, 1.48, 0.55), 1)
    mb.box((-0.25, 0, 1.43), (2.0, 1.45, 0.08), 0)
    for sy in (0.6, -0.6):
        mb.box((1.81, sy, 0.75), (0.04, 0.35, 0.14), 3)
        mb.box((-1.81, sy, 0.8), (0.04, 0.3, 0.14), 4)
    mb.box((1.82, 0, 0.45), (0.06, 1.6, 0.2), 2)
    for sx in (1.15, -1.15):
        for sy in (0.74, -0.74):
            _wheel(mb, sx, sy, 0.31, tyre=5, rim=2)
    ob = mb.build(name, [M[color], M["carglass"], M["chrome"], M["head"], M["tail"], M["rubber"]])
    _finish(ob, 0.09)
    ob.location = loc; ob.rotation_euler = (0, 0, heading)
    return ob


def scooter(name, loc, color=0, heading=0.0):
    M = mats()
    mb = MB()
    mb.box((0, 0, 0.55), (1.3, 0.32, 0.35), 0)
    mb.box((0.55, 0, 0.85), (0.2, 0.3, 0.75), 0)
    mb.box((-0.15, 0, 0.82), (0.7, 0.3, 0.12), 1)
    mb.box((0.62, 0, 1.25), (0.08, 0.7, 0.05), 2)
    _wheel(mb, 0.6, 0, 0.22, r=0.22, w=0.1, tyre=3, rim=2)
    _wheel(mb, -0.5, 0, 0.22, r=0.22, w=0.1, tyre=3, rim=2)
    ob = mb.build(name, [M["plastic"][color % 4], M["seat"], M["chrome"], M["rubber"]])
    _finish(ob, 0.04)
    ob.location = loc; ob.rotation_euler = (0, 0, heading)
    return ob


def clutter(name, loc, rng):
    """Loose street things that will fly: crates, plastic chairs, cartons, buckets, papers."""
    M = mats()
    k = rng.choice(["crate", "carton", "carton", "chair", "bucket", "paper", "paper"])
    mb = MB()
    if k == "crate":
        mb.box((0, 0, 0.18), (0.55, 0.38, 0.36), 0); mat = [rng.choice(M["plastic"])]
    elif k == "carton":
        mb.box((0, 0, 0.2), (rng.uniform(0.35, 0.6), rng.uniform(0.3, 0.5), rng.uniform(0.25, 0.45)), 0)
        mat = [principled("Carton", (0.45, 0.32, 0.18), rough=0.9)] if "carton" not in M else [M["carton"]]
        M["carton"] = mat[0]
    elif k == "chair":
        mb.box((0, 0, 0.42), (0.45, 0.45, 0.05), 0); mb.box((-0.2, 0, 0.68), (0.05, 0.45, 0.5), 0)
        for sx in (0.2, -0.2):
            for sy in (0.2, -0.2):
                mb.box((sx, sy, 0.21), (0.04, 0.04, 0.42), 0)
        mat = [M["plastic"][3]]
    elif k == "bucket":
        mb.cyl((0, 0, 0.18), 0.16, 0.36, 0, seg=14); mat = [rng.choice(M["plastic"])]
    else:
        mb.box((0, 0, 0.01), (0.3, 0.21, 0.004), 0); mat = [M["frame"]]
    ob = mb.build(name, mat)
    ob.location = loc
    ob.rotation_euler = (0, 0, rng.uniform(0, 6.28))
    return ob
