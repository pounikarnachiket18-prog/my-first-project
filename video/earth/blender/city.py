"""Procedural modern city street for the inertia shots (C1–C3).

Coordinates: +X = EAST (direction of Earth's rotation), +Y = north, +Z = up. Units = metres.
The street runs east–west along X. Everything unanchored can be animated with `fling()`.
"""
import math, random
import bpy
from mathutils import Vector, Euler
from common import (new_mat, link_obj, set_mat, cube, smooth, principled, emission_mat, lerp)

R = random.Random(7)


# ---------------------------------------------------------------- materials
def fogify(mat, color=(0.75, 0.72, 0.68), density=0.006, strength=1.0):
    """Cheap aerial perspective: blend the surface shader into a fog emission by view distance."""
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    if not out.inputs[0].links:
        return mat
    src = out.inputs[0].links[0].from_socket
    n, l = nt.nodes, nt.links
    cam = n.new("ShaderNodeCameraData")
    m1 = n.new("ShaderNodeMath"); m1.operation = "MULTIPLY"; m1.inputs[1].default_value = -density
    l.new(cam.outputs["View Distance"], m1.inputs[0])
    ex = n.new("ShaderNodeMath"); ex.operation = "EXPONENT"
    l.new(m1.outputs[0], ex.inputs[0])
    inv = n.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    l.new(ex.outputs[0], inv.inputs[1])
    em = n.new("ShaderNodeEmission"); em.inputs[0].default_value = (*color, 1); em.inputs[1].default_value = strength
    mix = n.new("ShaderNodeMixShader")
    l.new(inv.outputs[0], mix.inputs[0])
    l.new(src, mix.inputs[1])
    l.new(em.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs[0])
    return mat


def _m(n, l, op, a, b=None):
    m = n.new("ShaderNodeMath"); m.operation = op
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            l.new(v, m.inputs[i])
    return m.outputs[0]


def facade_material(name, wall, win_w=2.6, floor_h=3.3, lit_frac=0.18, glass_tint=(0.03, 0.035, 0.04), seed=0.0):
    m, n, l, out = new_mat(name)
    geo = n.new("ShaderNodeNewGeometry")
    ob = n.new("ShaderNodeTexCoord")
    sp = n.new("ShaderNodeSeparateXYZ"); l.new(ob.outputs["Object"], sp.inputs[0])
    sn = n.new("ShaderNodeSeparateXYZ"); l.new(geo.outputs["Normal"], sn.inputs[0])
    ax = _m(n, l, "ABSOLUTE", sn.outputs[0])
    az = _m(n, l, "ABSOLUTE", sn.outputs[2])
    # horizontal facade coordinate: x on N/S faces, y on E/W faces (object space * scale handled by caller via real dims)
    mixu = n.new("ShaderNodeMix"); mixu.data_type = "FLOAT"
    l.new(ax, mixu.inputs[0]); l.new(sp.outputs[0], mixu.inputs[2]); l.new(sp.outputs[1], mixu.inputs[3])
    u = mixu.outputs[0]
    v = sp.outputs[2]
    cu = _m(n, l, "DIVIDE", u, win_w)
    cv = _m(n, l, "DIVIDE", _m(n, l, "SUBTRACT", v, 0.6), floor_h)
    fu = _m(n, l, "FRACT", cu); fv = _m(n, l, "FRACT", cv)
    inu = _m(n, l, "MULTIPLY", _m(n, l, "GREATER_THAN", fu, 0.16), _m(n, l, "LESS_THAN", fu, 0.84))
    inv = _m(n, l, "MULTIPLY", _m(n, l, "GREATER_THAN", fv, 0.22), _m(n, l, "LESS_THAN", fv, 0.86))
    upper = _m(n, l, "GREATER_THAN", v, 4.2)
    vert = _m(n, l, "LESS_THAN", az, 0.5)
    win = _m(n, l, "MULTIPLY", _m(n, l, "MULTIPLY", inu, inv), _m(n, l, "MULTIPLY", upper, vert))
    # per-window random (lit interiors / blinds)
    comb = n.new("ShaderNodeCombineXYZ")
    l.new(_m(n, l, "FLOOR", cu), comb.inputs[0]); l.new(_m(n, l, "FLOOR", cv), comb.inputs[1])
    comb.inputs[2].default_value = seed
    wn = n.new("ShaderNodeTexWhiteNoise"); wn.noise_dimensions = "3D"
    l.new(comb.outputs[0], wn.inputs[0])
    lit = _m(n, l, "GREATER_THAN", wn.outputs["Value"], 1.0 - lit_frac)
    # wall: colour + grime noise + floor slab lines
    noise = n.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 0.6; noise.inputs["Detail"].default_value = 6
    l.new(ob.outputs["Object"], noise.inputs[0])
    grime = n.new("ShaderNodeMix"); grime.data_type = "RGBA"; grime.blend_type = "MULTIPLY"
    l.new(noise.outputs["Fac"], grime.inputs[0])
    grime.inputs[6].default_value = (*wall, 1)
    grime.inputs[7].default_value = (wall[0] * 0.7, wall[1] * 0.68, wall[2] * 0.66, 1)
    slab = _m(n, l, "LESS_THAN", fv, 0.07)
    slabmix = n.new("ShaderNodeMix"); slabmix.data_type = "RGBA"
    l.new(_m(n, l, "MULTIPLY", slab, 0.6), slabmix.inputs[0])
    l.new(grime.outputs[2], slabmix.inputs[6]); slabmix.inputs[7].default_value = (0.25, 0.24, 0.23, 1)
    wallb = n.new("ShaderNodeBsdfPrincipled")
    l.new(slabmix.outputs[2], wallb.inputs["Base Color"])
    wallb.inputs["Roughness"].default_value = 0.82
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25
    l.new(noise.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], wallb.inputs["Normal"])
    glass = n.new("ShaderNodeBsdfPrincipled")
    glass.inputs["Base Color"].default_value = (*glass_tint, 1)
    glass.inputs["Roughness"].default_value = 0.04
    glass.inputs["Specular IOR Level"].default_value = 0.9
    glass.inputs["Emission Color"].default_value = (1.0, 0.72, 0.42, 1)
    l.new(_m(n, l, "MULTIPLY", lit, _m(n, l, "ADD", _m(n, l, "MULTIPLY", wn.outputs["Value"], 0.8), 0.15)), glass.inputs["Emission Strength"])
    mix = n.new("ShaderNodeMixShader")
    l.new(win, mix.inputs[0]); l.new(wallb.outputs[0], mix.inputs[1]); l.new(glass.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs[0])
    return m


def road_material():
    m, n, l, out = new_mat("Asphalt")
    tc = n.new("ShaderNodeTexCoord")
    sp = n.new("ShaderNodeSeparateXYZ"); l.new(tc.outputs["Object"], sp.inputs[0])
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40; nz.inputs["Detail"].default_value = 10
    l.new(tc.outputs["Object"], nz.inputs[0])
    wet = n.new("ShaderNodeTexNoise"); wet.inputs["Scale"].default_value = 0.12; wet.inputs["Detail"].default_value = 4
    l.new(tc.outputs["Object"], wet.inputs[0])
    wetm = n.new("ShaderNodeMapRange"); wetm.inputs[1].default_value = 0.42; wetm.inputs[2].default_value = 0.62
    wetm.inputs[3].default_value = 0.7; wetm.inputs[4].default_value = 0.06
    l.new(wet.outputs["Fac"], wetm.inputs[0])
    # lane markings: dashed centre line + edge lines (y in object space)
    y = sp.outputs[1]; x = sp.outputs[0]
    centre = _m(n, l, "MULTIPLY", _m(n, l, "LESS_THAN", _m(n, l, "ABSOLUTE", y), 0.09),
                _m(n, l, "LESS_THAN", _m(n, l, "FRACT", _m(n, l, "DIVIDE", x, 9.0)), 0.5))
    edge = _m(n, l, "MULTIPLY", _m(n, l, "GREATER_THAN", _m(n, l, "ABSOLUTE", y), 5.55), _m(n, l, "LESS_THAN", _m(n, l, "ABSOLUTE", y), 5.7))
    # zebra crossing near x in [-4, 4]
    zebra = _m(n, l, "MULTIPLY", _m(n, l, "LESS_THAN", _m(n, l, "ABSOLUTE", _m(n, l, "SUBTRACT", x, 0.0)), 2.2),
               _m(n, l, "LESS_THAN", _m(n, l, "FRACT", _m(n, l, "DIVIDE", y, 1.2)), 0.5))
    paint = _m(n, l, "MINIMUM", _m(n, l, "ADD", _m(n, l, "ADD", centre, edge), zebra), 1.0)
    base = n.new("ShaderNodeMix"); base.data_type = "RGBA"
    l.new(nz.outputs["Fac"], base.inputs[0])
    base.inputs[6].default_value = (0.035, 0.036, 0.04, 1); base.inputs[7].default_value = (0.08, 0.08, 0.085, 1)
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"
    l.new(paint, col.inputs[0]); l.new(base.outputs[2], col.inputs[6]); col.inputs[7].default_value = (0.75, 0.75, 0.72, 1)
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(col.outputs[2], b.inputs["Base Color"])
    l.new(wetm.outputs[0], b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.6
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.15
    l.new(nz.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def sidewalk_material():
    m, n, l, out = new_mat("Sidewalk")
    tc = n.new("ShaderNodeTexCoord")
    br = n.new("ShaderNodeTexBrick")
    br.inputs["Color1"].default_value = (0.36, 0.35, 0.33, 1); br.inputs["Color2"].default_value = (0.3, 0.29, 0.28, 1)
    br.inputs["Mortar"].default_value = (0.15, 0.15, 0.15, 1)
    br.inputs["Scale"].default_value = 1.0; br.inputs["Mortar Size"].default_value = 0.012
    br.inputs["Brick Width"].default_value = 0.9; br.inputs["Row Height"].default_value = 0.9
    br.offset = 0.0
    l.new(tc.outputs["Object"], br.inputs[0])
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(br.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.55
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.4; bump.invert = True
    l.new(br.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def car_paint(color):
    m = principled(f"Paint{color}", color, rough=0.18, metal=0.6)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.03
    return m


# ---------------------------------------------------------------- props
MATS = {}


def mats():
    if MATS:
        return MATS
    MATS["glass"] = principled("CarGlass", (0.02, 0.025, 0.03), rough=0.02, spec=1.0)
    MATS["rubber"] = principled("Rubber", (0.02, 0.02, 0.02), rough=0.7)
    MATS["rim"] = principled("Rim", (0.6, 0.6, 0.62), rough=0.25, metal=1.0)
    MATS["head"] = emission_mat("HeadLight", (1.0, 0.95, 0.85), 18)
    MATS["tail"] = emission_mat("TailLight", (1.0, 0.05, 0.02), 10)
    MATS["metal"] = principled("PoleMetal", (0.12, 0.12, 0.13), rough=0.35, metal=1.0)
    MATS["lamp"] = emission_mat("LampGlow", (1.0, 0.8, 0.55), 6)
    MATS["bark"] = principled("Bark", (0.08, 0.06, 0.045), rough=0.9)
    MATS["leaf"] = principled("Leaves", (0.045, 0.1, 0.03), rough=0.8)
    MATS["skin"] = [principled(f"Skin{i}", c, rough=0.55) for i, c in enumerate([(0.55, 0.36, 0.26), (0.38, 0.24, 0.16), (0.7, 0.52, 0.42), (0.26, 0.16, 0.1)])]
    MATS["cloth"] = [principled(f"Cloth{i}", c, rough=0.85) for i, c in enumerate([
        (0.06, 0.07, 0.1), (0.35, 0.05, 0.04), (0.05, 0.12, 0.25), (0.4, 0.38, 0.35), (0.12, 0.2, 0.12), (0.5, 0.36, 0.12), (0.03, 0.03, 0.03)])]
    MATS["denim"] = principled("Denim", (0.06, 0.1, 0.2), rough=0.8)
    MATS["card"] = principled("Cardboard", (0.45, 0.32, 0.18), rough=0.9)
    MATS["paper"] = principled("Paper", (0.85, 0.85, 0.82), rough=0.7)
    MATS["concrete"] = principled("Concrete", (0.42, 0.41, 0.39), rough=0.85)
    MATS["awning"] = [principled(f"Awning{i}", c, rough=0.7) for i, c in enumerate([(0.05, 0.15, 0.45), (0.5, 0.06, 0.05), (0.08, 0.25, 0.12)])]
    MATS["shop"] = principled("ShopWindow", (0.04, 0.04, 0.045), rough=0.08, emission=(1.0, 0.75, 0.5), estr=0.35, spec=0.9)
    return MATS


def empty(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    link_obj(e)
    e.location = loc
    return e


def parent(ch, p):
    ch.parent = p
    ch.matrix_parent_inverse = p.matrix_world.inverted()


def car(name, loc, color, heading=0.0):
    M = mats()
    root = empty(name, loc)
    root.rotation_euler = (0, 0, heading)
    paint = car_paint(color)
    body = cube(name + "_body", (4.4, 1.82, 0.72), (loc[0], loc[1], loc[2] + 0.62), bevel=0.18)
    set_mat(body, paint)
    cab = cube(name + "_cab", (2.3, 1.62, 0.62), (loc[0] - 0.25, loc[1], loc[2] + 1.22), bevel=0.22)
    set_mat(cab, M["glass"])
    roof = cube(name + "_roof", (1.9, 1.5, 0.08), (loc[0] - 0.3, loc[1], loc[2] + 1.55), bevel=0.04)
    set_mat(roof, paint)
    parts = [body, cab, roof]
    for sx in (1.35, -1.35):
        for sy in (0.82, -0.82):
            bpy.ops.mesh.primitive_cylinder_add(radius=0.34, depth=0.26, vertices=24, location=(loc[0] + sx, loc[1] + sy, loc[2] + 0.34), rotation=(math.pi / 2, 0, 0))
            w = bpy.context.active_object; smooth(w); set_mat(w, M["rubber"]); parts.append(w)
    for sy in (0.6, -0.6):
        hl = cube(name + "_hl", (0.06, 0.32, 0.12), (loc[0] + 2.2, loc[1] + sy, loc[2] + 0.78)); set_mat(hl, M["head"]); parts.append(hl)
        tl = cube(name + "_tl", (0.06, 0.34, 0.1), (loc[0] - 2.2, loc[1] + sy, loc[2] + 0.8)); set_mat(tl, M["tail"]); parts.append(tl)
    for p in parts:
        parent(p, root)
    root.rotation_euler = (0, 0, heading)
    return root


def person(name, loc, rng, pose=0.0, heading=0.0):
    M = mats()
    root = empty(name, loc)
    skin = rng.choice(M["skin"]); top = rng.choice(M["cloth"]); legs = rng.choice([M["denim"]] + M["cloth"][:3])
    h = rng.uniform(0.92, 1.06)
    parts = []

    def limb(r, length, a, b, mat):
        a, b = Vector(a), Vector(b)
        mid = (a + b) / 2
        d = (b - a)
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, vertices=12, location=Vector(loc) + mid)
        o = bpy.context.active_object
        o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
        md = o.modifiers.new("b", "BEVEL"); md.width = r * 0.8; md.segments = 3
        smooth(o); set_mat(o, mat); parts.append(o)
        return o

    sw = math.sin(pose) * 0.25
    limb(0.085 * h, 0.9, (0.0 + sw * 0.4, 0.1, 0.05), (0.0, 0.1, 0.92 * h), legs)
    limb(0.085 * h, 0.9, (0.0 - sw * 0.4, -0.1, 0.05), (0.0, -0.1, 0.92 * h), legs)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=20, ring_count=12, location=Vector(loc) + Vector((0, 0, 1.25 * h)))
    t = bpy.context.active_object; t.scale = (0.17, 0.24, 0.36 * h); smooth(t); set_mat(t, top); parts.append(t)
    limb(0.055, 0.6, (0.0, 0.27, 1.45 * h), (-sw * 0.5, 0.3, 0.85 * h), top)
    limb(0.055, 0.6, (0.0, -0.27, 1.45 * h), (sw * 0.5, -0.3, 0.85 * h), top)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.115, segments=20, ring_count=12, location=Vector(loc) + Vector((0.01, 0, 1.74 * h)))
    hd = bpy.context.active_object; hd.scale = (1.0, 0.9, 1.12); smooth(hd); set_mat(hd, skin); parts.append(hd)
    for p in parts:
        parent(p, root)
    root.rotation_euler = (0, 0, heading)
    return root


def tree(name, loc, rng, h=6.0):
    M = mats()
    root = empty(name, loc)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.16, depth=h * 0.6, vertices=10, location=(loc[0], loc[1], loc[2] + h * 0.3))
    tr = bpy.context.active_object; set_mat(tr, M["bark"])
    crowns = []
    for i in range(6):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=h * rng.uniform(0.13, 0.2),
                                              location=(loc[0] + rng.uniform(-1.1, 1.1), loc[1] + rng.uniform(-1.1, 1.1), loc[2] + h * rng.uniform(0.6, 0.9)))
        c = bpy.context.active_object
        tex = bpy.data.textures.new(name + f"_n{i}", "CLOUDS"); tex.noise_scale = 0.22; tex.noise_depth = 3
        d = c.modifiers.new("d", "DISPLACE"); d.texture = tex; d.strength = 0.75
        set_mat(c, M["leaf"]); crowns.append(c)
    for p in [tr] + crowns:
        parent(p, root)
    return root, crowns


def lamp(name, loc, side=1):
    M = mats()
    root = empty(name, loc)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=7.5, vertices=12, location=(loc[0], loc[1], loc[2] + 3.75))
    p = bpy.context.active_object; set_mat(p, M["metal"])
    arm = cube(name + "_arm", (0.1, 1.6, 0.1), (loc[0], loc[1] - side * 0.8, loc[2] + 7.4)); set_mat(arm, M["metal"])
    hd = cube(name + "_hd", (0.5, 0.25, 0.12), (loc[0], loc[1] - side * 1.5, loc[2] + 7.3), bevel=0.04); set_mat(hd, M["lamp"])
    for o in (p, arm, hd):
        parent(o, root)
    return root


def debris_piece(name, loc, rng, kind=None):
    M = mats()
    kind = kind or rng.choice(["box", "box", "paper", "chunk", "chunk", "plank"])
    if kind == "box":
        o = cube(name, (rng.uniform(0.3, 0.7), rng.uniform(0.3, 0.6), rng.uniform(0.25, 0.5)), loc, bevel=0.02); set_mat(o, M["card"])
    elif kind == "paper":
        bpy.ops.mesh.primitive_plane_add(size=0.3, location=loc); o = bpy.context.active_object; set_mat(o, M["paper"])
    elif kind == "plank":
        o = cube(name, (rng.uniform(1.0, 2.2), 0.18, 0.05), loc); set_mat(o, M["card"])
    else:
        o = cube(name, (rng.uniform(0.15, 0.6),) * 3, loc, bevel=0.03); set_mat(o, M["concrete"])
    o.name = name
    return o


def building(name, x0, x1, y_face, depth, height, wall, side, seed):
    """Box building whose street facade sits at y=y_face; side=+1 north row, -1 south row."""
    w = x1 - x0
    cy = y_face + side * depth / 2
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    # bake real dimensions into the mesh so object-space facade coordinates are in metres
    for v in o.data.vertices:
        v.co.x *= w; v.co.y *= depth; v.co.z = (v.co.z + 0.5) * height
    o.location = ((x0 + x1) / 2, cy, 0)
    rr = random.Random(seed)
    set_mat(o, facade_material(name + "_mat", wall, win_w=rr.uniform(1.8, 3.4), floor_h=rr.uniform(3.0, 3.8), seed=seed, lit_frac=rr.uniform(0.03, 0.1),
                               glass_tint=rr.choice([(0.03, 0.035, 0.04), (0.05, 0.08, 0.09), (0.02, 0.03, 0.05), (0.08, 0.07, 0.05)])))
    return o


# ---------------------------------------------------------------- the street
WALLS = [(0.55, 0.48, 0.38), (0.45, 0.2, 0.14), (0.62, 0.6, 0.56), (0.32, 0.33, 0.35), (0.6, 0.45, 0.22),
         (0.7, 0.66, 0.58), (0.25, 0.26, 0.28), (0.5, 0.42, 0.36)]


def build_street(x_min=-160, x_max=420, fog=((0.78, 0.66, 0.52), 0.006), skyline=True, rng=None):
    rng = rng or random.Random(11)
    M = mats()
    objs = dict(buildings=[], cars=[], people=[], trees=[], lamps=[], debris=[], static=[])
    # road + sidewalks + far ground
    bpy.ops.mesh.primitive_plane_add(size=1, location=((x_min + x_max) / 2, 0, 0))
    road = bpy.context.active_object; road.scale = (x_max - x_min, 11.4, 1)
    bpy.ops.object.transform_apply(scale=True)
    set_mat(road, road_material())
    # re-centre object coords so lane maths uses x around 0 at origin
    for v in road.data.vertices:
        v.co.x += road.location.x
    road.location.x = 0
    objs["static"].append(road)
    bpy.ops.mesh.primitive_plane_add(size=3000, location=(0, 0, -0.02))
    gnd = bpy.context.active_object; gnd.name = "Ground"; set_mat(gnd, M["concrete"])
    for side in (1, -1):
        sw = cube(f"Sidewalk{side}", (x_max - x_min, 4.0, 0.18), ((x_min + x_max) / 2, side * 7.7, 0.09))
        set_mat(sw, sidewalk_material())
        curb = cube(f"Curb{side}", (x_max - x_min, 0.25, 0.2), ((x_min + x_max) / 2, side * 5.75, 0.1)); set_mat(curb, M["concrete"])
        objs["static"] += [sw, curb]
        # building rows
        x = x_min
        i = 0
        while x < x_max:
            w = rng.uniform(12, 26)
            hgt = rng.choice([rng.uniform(14, 26), rng.uniform(24, 48), rng.uniform(40, 80)])
            wall = rng.choice(WALLS)
            b = building(f"B{side}_{i}", x, x + w - 0.3, side * 9.7, rng.uniform(14, 22), hgt, wall, side, seed=rng.random() * 100)
            objs["buildings"].append(b)
            # shopfront + awning on the ground floor
            if rng.random() < 0.7:
                sf = cube(f"Shop{side}_{i}", (w * 0.7, 0.05, 2.6), (x + w / 2, side * 9.68, 1.7)); set_mat(sf, M["shop"])
                aw = cube(f"Awn{side}_{i}", (w * 0.72, 1.4, 0.12), (x + w / 2, side * 9.0, 3.4), rot=(side * 0.25, 0, 0)); set_mat(aw, rng.choice(M["awning"]))
                objs["debris"].append(aw)
                objs["static"].append(sf)
            x += w
            i += 1
        # trees + lamps on sidewalks
        for k, tx in enumerate(range(int(x_min) + 8, int(x_max), 24)):
            t, crowns = tree(f"T{side}_{k}", (tx + rng.uniform(-2, 2), side * 6.9, 0.18), rng, rng.uniform(5.5, 7.5))
            objs["trees"].append((t, crowns))
        for k, lx in enumerate(range(int(x_min) + 20, int(x_max), 30)):
            objs["lamps"].append(lamp(f"L{side}_{k}", (lx, side * 6.1, 0.18), side))
    if skyline:  # distant towers down the street axis (fill the vanishing point)
        for k in range(26):
            h = rng.uniform(60, 190)
            tw = rng.uniform(14, 30)
            o = building(f"Tower{k}", x_max + rng.uniform(20, 260), x_max + rng.uniform(20, 260) + tw, rng.uniform(-90, 60), tw, h,
                         rng.choice(WALLS[2:5]), 1, seed=rng.random() * 99)
            objs["buildings"].append(o)
    return objs


def fog_all(color, density, strength=1.0):
    for m in bpy.data.materials:
        if m.use_nodes and m.name not in ("_nofog",):
            fogify(m, color, density, strength)


# ---------------------------------------------------------------- inertia animation
def fling(ob, frames, sim_time, rng, v_east=465.0, ramp=0.08, lift=(1.0, 12.0), spin=(2.0, 14.0), drag=0.0, start_delay=0.0):
    """Key an object that keeps the Earth's eastward momentum after the ground stops.

    sim_time(frame) -> seconds since the stop (can be slowed for slow motion).
    In the ground's frame the object accelerates east to v_east over `ramp` seconds (the ground's
    braking time), gets kicked up by contact with the ground and tumbles.
    """
    p0 = ob.location.copy()
    r0 = Euler(ob.rotation_euler)
    vz = rng.uniform(*lift)
    wx, wy, wz = (rng.uniform(-1, 1) * rng.uniform(*spin) for _ in range(3))
    vy = rng.uniform(-1.5, 1.5)
    for f in frames:
        s = max(0.0, sim_time(f) - start_delay)
        # x(s) for linear ramp of velocity up to v_east
        if s < ramp:
            x = 0.5 * v_east / ramp * s * s
        else:
            x = 0.5 * v_east * ramp + v_east * (s - ramp)
        x *= (1 - drag)
        z = max(0.0, vz * s - 4.9 * s * s) if s > 0 else 0.0
        ob.location = (p0.x + x, p0.y + vy * s, p0.z + z)
        ob.rotation_euler = (r0.x + wx * s, r0.y + wy * s, r0.z + wz * s)
        ob.keyframe_insert("location", frame=f)
        ob.keyframe_insert("rotation_euler", frame=f)
