"""
HypoExplained — "How a metal detector works" (3D remake, Blender).

Builds the whole scene procedurally with bpy (Blender 5.x) and lays out every
shot on one 30 fps timeline that matches the original narration (1614 frames).
Camera cuts are timeline markers bound to per-shot cameras, so the whole film
renders in one pass.

    python build_scene.py --out scene.blend [--assets DIR]

Then render with render.py.
"""
import bpy, math, random, os, sys, argparse
from mathutils import Vector, Euler

FPS = 30
END = 1614
BRAND = "HypoExplained"
ap = argparse.ArgumentParser()
ap.add_argument("--out", default="scene.blend")
ap.add_argument("--assets", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets"))
args, _ = ap.parse_known_args(sys.argv[1:])
os.makedirs(args.assets, exist_ok=True)
random.seed(7)

# --------------------------------------------------------------------------- #
# Reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.fps = FPS
scn.frame_start, scn.frame_end = 0, END - 1
prefs = bpy.context.preferences.edit

def interp(kind):
    prefs.keyframe_new_interpolation_type = kind

# --------------------------------------------------------------------------- #
# Helpers
def link(ob):
    if ob.name not in scn.collection.objects:
        scn.collection.objects.link(ob)
    return ob

def active(ob):
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)

def smooth(ob, bevel=0.0, segs=3, sub=0):
    if ob.type == "MESH":
        for p in ob.data.polygons:
            p.use_smooth = True
    if bevel:
        m = ob.modifiers.new("bevel", "BEVEL"); m.width = bevel; m.segments = segs
        m.limit_method = "ANGLE"
    if sub:
        m = ob.modifiers.new("sub", "SUBSURF"); m.levels = sub; m.render_levels = sub
    return ob

def box(name, size, loc, mat=None, bevel=0.0, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.object; ob.name = name; ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: smooth(ob, bevel)
    if mat: ob.data.materials.append(mat)
    if parent: setp(ob, parent)
    return ob

def cyl(name, r, depth, loc, mat=None, rot=(0, 0, 0), verts=48, parent=None, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    ob = bpy.context.object; ob.name = name
    smooth(ob)
    if mat: ob.data.materials.append(mat)
    if parent: setp(ob, parent)
    return ob

def sphere(name, r, loc, mat=None, scale=(1, 1, 1), parent=None, seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    ob = bpy.context.object; ob.name = name; ob.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    smooth(ob)
    if mat: ob.data.materials.append(mat)
    if parent: setp(ob, parent)
    return ob

def empty(name, loc=(0, 0, 0), parent=None):
    ob = bpy.data.objects.new(name, None); ob.location = loc; link(ob)
    if parent: setp(ob, parent)
    return ob

def setp(ob, parent):
    bpy.context.view_layer.update()  # objects made via bpy.data have stale matrices until evaluated
    mw = ob.matrix_world.copy()
    ob.parent = parent
    ob.matrix_world = mw

def poly_curve(name, pts, mat, bevel, cyclic=False, parent=None):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"
    sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (co[0], co[1], co[2], 1)
    sp.use_cyclic_u = cyclic
    cu.bevel_depth = bevel; cu.bevel_resolution = 3; cu.use_fill_caps = True
    cu.bevel_factor_mapping_start = "SPLINE"; cu.bevel_factor_mapping_end = "SPLINE"
    ob = bpy.data.objects.new(name, cu); link(ob)
    if mat: cu.materials.append(mat)
    if parent: ob.parent = parent
    return ob

def text(name, body, size, loc, mat, rot=(math.pi / 2, 0, 0), font=None, extrude=0.002, align="CENTER", parent=None):
    cu = bpy.data.curves.new(name, "FONT"); cu.body = body; cu.size = size
    cu.extrude = extrude; cu.align_x = align; cu.align_y = "CENTER"
    if font: cu.font = font
    ob = bpy.data.objects.new(name, cu); ob.location = loc; ob.rotation_euler = rot
    link(ob); cu.materials.append(mat)
    if parent: setp(ob, parent)
    return ob

def key(obj, path, frames_vals, index=-1):
    for f, v in frames_vals:
        if index >= 0:
            getattr(obj, path)[index] = v
            obj.keyframe_insert(path, index=index, frame=f)
        else:
            setattr(obj, path, v)
            obj.keyframe_insert(path, frame=f)

def key_input(sock, frames_vals):
    for f, v in frames_vals:
        sock.default_value = v
        sock.keyframe_insert("default_value", frame=f)

# --------------------------------------------------------------------------- #
# Materials
def mat(name, color, rough=0.5, metal=0.0, emit=None, estr=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if coat: b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = estr
    return m

def emit_mat(name, color, strength, alpha=1.0):
    """Pure emission mixed with transparency; returns (material, strength socket, alpha mix socket)."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.inputs[0].default_value = alpha
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m, em.inputs["Strength"], mix.inputs[0]

def noise_bump(m, scale=40.0, strength=0.15, col_var=None):
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexNoise"); tex.inputs["Scale"].default_value = scale
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = strength
    nt.links.new(tex.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs[0], b.inputs["Normal"])
    if col_var:
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (*col_var[0], 1); ramp.color_ramp.elements[1].color = (*col_var[1], 1)
        nt.links.new(tex.outputs["Fac"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    return m

M = {}
M["floor"] = noise_bump(mat("Floor", (0.3, 0.3, 0.31), 0.55), 6, 0.05, ((0.24, 0.24, 0.25), (0.34, 0.34, 0.35)))
M["wall"] = mat("Wall", (0.62, 0.62, 0.6), 0.8)
M["frame"] = mat("WindowFrame", (0.55, 0.56, 0.58), 0.4, 0.2)
M["sky"], _, _ = emit_mat("Sky", (1.0, 0.98, 0.9), 2.0)
M["metal"] = mat("GateMetal", (0.3, 0.31, 0.33), 0.32, 0.35)
M["darkplastic"] = mat("DarkPlastic", (0.025, 0.027, 0.03), 0.35)
M["key"] = mat("Key", (0.12, 0.14, 0.17), 0.3, emit=(0.3, 0.6, 0.9), estr=0.25)
M["white"] = mat("PlateWhite", (0.9, 0.91, 0.92), 0.25, coat=0.4)
M["ink"] = mat("Ink", (0.06, 0.07, 0.09), 0.4)
M["brand"] = mat("Brand", (0.91, 0.66, 0.24), 0.35, emit=(0.91, 0.66, 0.24), estr=0.3)
M["redbtn"] = mat("RedButton", (0.6, 0.02, 0.02), 0.15, emit=(1.0, 0.04, 0.03), estr=0.4, coat=1.0)
M["led"] = mat("GreenLED", (0.05, 0.3, 0.05), 0.15, emit=(0.15, 1.0, 0.2), estr=0.5, coat=1.0)
M["cable"] = mat("Cable", (0.35, 0.36, 0.38), 0.5)

# Shirt: dark teal on top, bright cyan at the hem (object-space gradient)
def shirt_mat():
    m = mat("Shirt", (0.05, 0.3, 0.32), 0.65)
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 1.0; mr.inputs["From Max"].default_value = 1.4
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position = 0.25; e[0].color = (0.25, 0.72, 0.74, 1)
    e[1].position = 0.6; e[1].color = (0.02, 0.2, 0.22, 1)
    geo = nt.nodes.new("ShaderNodeNewGeometry"); nt.links.new(geo.outputs["Position"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"]); nt.links.new(mr.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    return m
M["shirt"] = shirt_mat()
M["shirtdark"] = mat("ShirtDark", (0.02, 0.18, 0.2), 0.6)
M["skin"] = mat("Skin", (0.72, 0.47, 0.34), 0.5)
M["hair"] = mat("Hair", (0.025, 0.018, 0.014), 0.45)
M["eye"] = mat("Eye", (0.02, 0.02, 0.02), 0.1, coat=1.0)
M["belt"] = noise_bump(mat("Belt", (0.2, 0.09, 0.035), 0.45), 80, 0.1)
M["silver"] = mat("Silver", (0.85, 0.86, 0.88), 0.18, 1.0)
M["shoe_brown"] = mat("ShoeBrown", (0.22, 0.09, 0.04), 0.35, coat=0.6)
M["shoe_white"] = mat("ShoeWhite", (0.9, 0.9, 0.88), 0.4)
M["watch"] = mat("Watch", (0.03, 0.03, 0.03), 0.3, 0.6)
M["gunmetal"] = mat("Gunmetal", (0.06, 0.065, 0.07), 0.32, 0.85)
M["holster"] = noise_bump(mat("Holster", (0.1, 0.05, 0.025), 0.5), 60, 0.1)

# Pants with an animatable X-ray fade (0 = cloth, 1 = ghost)
def pants_mat():
    m = mat("Pants", (0.72, 0.72, 0.7), 0.75)
    noise_bump(m, 120, 0.06)
    nt = m.node_tree; out = nt.nodes["Material Output"]; b = nt.nodes["Principled BSDF"]
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    ghost = nt.nodes.new("ShaderNodeMixShader"); ghost.inputs[0].default_value = 0.22
    fres = nt.nodes.new("ShaderNodeLayerWeight"); fres.inputs[0].default_value = 0.35
    nt.links.new(fres.outputs["Facing"], ghost.inputs[0])
    nt.links.new(tr.outputs[0], ghost.inputs[1]); nt.links.new(b.outputs[0], ghost.inputs[2])
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.0
    nt.links.new(b.outputs[0], mix.inputs[1]); nt.links.new(ghost.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m, mix.inputs[0]
M["pants"], PANTS_XRAY = pants_mat()

# Gate pillar shell: grey metal  <->  pink glass  <->  clear glass
def pillar_mat():
    m = mat("Pillar", (0.3, 0.31, 0.33), 0.32, 0.35)
    nt = m.node_tree; out = nt.nodes["Material Output"]; metal = nt.nodes["Principled BSDF"]
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    pink = nt.nodes.new("ShaderNodeBsdfPrincipled")
    pink.inputs["Base Color"].default_value = (1.0, 0.33, 0.42, 1); pink.inputs["Roughness"].default_value = 0.15
    pink.inputs["Emission Color"].default_value = (1.0, 0.3, 0.4, 1); pink.inputs["Emission Strength"].default_value = 0.35
    pinkglass = nt.nodes.new("ShaderNodeMixShader"); pinkglass.inputs[0].default_value = 0.55
    nt.links.new(tr.outputs[0], pinkglass.inputs[1]); nt.links.new(pink.outputs[0], pinkglass.inputs[2])
    clear = nt.nodes.new("ShaderNodeMixShader"); clear.inputs[0].default_value = 0.12
    nt.links.new(tr.outputs[0], clear.inputs[1]); nt.links.new(metal.outputs[0], clear.inputs[2])
    glass = nt.nodes.new("ShaderNodeMixShader"); glass.inputs[0].default_value = 0.0  # 0 pink, 1 clear
    nt.links.new(pinkglass.outputs[0], glass.inputs[1]); nt.links.new(clear.outputs[0], glass.inputs[2])
    top = nt.nodes.new("ShaderNodeMixShader"); top.inputs[0].default_value = 0.0  # 0 metal, 1 glass
    nt.links.new(metal.outputs[0], top.inputs[1]); nt.links.new(glass.outputs[0], top.inputs[2])
    nt.links.new(top.outputs[0], out.inputs[0])
    return m, top.inputs[0], glass.inputs[0]
M["pillar"], PILLAR_GLASS, PILLAR_CLEAR = pillar_mat()

M["coil"], COIL_STR, _ = emit_mat("Coil", (0.02, 0.3, 1.0), 2.0)
M["field"], FIELD_STR, _ = emit_mat("FieldLine", (0.02, 0.32, 1.0), 1.6)
M["arrow_red"], _, _ = emit_mat("ArrowRed", (1.0, 0.04, 0.02), 2.0)
M["arrow_blue"], _, _ = emit_mat("ArrowBlue", (0.01, 0.1, 1.0), 2.0)
M["eddy"], EDDY_STR, _ = emit_mat("Eddy", (0.05, 0.9, 1.0), 5.0)
M["gauge"], GAUGE_STR, _ = emit_mat("Gauge", (0.35, 0.95, 1.0), 6.0)
M["gold"] = noise_bump(mat("Gold", (1.0, 0.7, 0.28), 0.28, 1.0), 220, 0.08)
M["golddark"] = mat("GoldDeep", (0.75, 0.5, 0.18), 0.35, 1.0)
M["backdrop"] = noise_bump(mat("Backdrop", (0.72, 0.46, 0.42), 0.8), 3, 0.02, ((0.62, 0.36, 0.34), (0.82, 0.58, 0.52)))

# --------------------------------------------------------------------------- #
# Fonts + ID card texture
FONT_DIR = "/usr/share/fonts/opentype/inter"
def load_font(fn):
    p = os.path.join(FONT_DIR, fn)
    return bpy.data.fonts.load(p) if os.path.exists(p) else None
F_BOLD = load_font("Inter-ExtraBold.otf") or load_font("Inter-Bold.otf")
F_SEMI = load_font("Inter-SemiBold.otf")

def make_id_card(path):
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1080, 1720
    im = Image.new("RGB", (W, H), (255, 255, 255)); d = ImageDraw.Draw(im)
    def f(name, s):
        try: return ImageFont.truetype(os.path.join(FONT_DIR, name), s)
        except Exception: return ImageFont.load_default()
    # orange geometric header
    d.polygon([(0, 0), (W, 0), (W, 360), (0, 620)], fill=(247, 148, 29))
    d.polygon([(0, 0), (W * 0.55, 0), (0, 420)], fill=(253, 186, 70))
    d.polygon([(W * 0.6, 0), (W, 0), (W, 220)], fill=(232, 105, 25))
    d.polygon([(W, 1350), (W, H), (W * 0.35, H)], fill=(247, 148, 29))
    d.polygon([(W, 1530), (W, H), (W * 0.7, H)], fill=(232, 105, 25))
    # brand line
    d.text((70, 60), "h.", font=f("Inter-ExtraBold.otf", 90), fill=(255, 255, 255))
    d.text((190, 85), BRAND.upper(), font=f("Inter-Bold.otf", 46), fill=(255, 255, 255))
    # avatar
    cx, cy, r = W // 2, 520, 220
    d.ellipse([cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14], fill=(255, 255, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(214, 234, 236))
    d.ellipse([cx - 95, cy - 150, cx + 95, cy + 60], fill=(184, 124, 92))       # face
    d.chord([cx - 105, cy - 175, cx + 105, cy + 10], 180, 360, fill=(30, 22, 18))  # hair
    d.pieslice([cx - 190, cy + 70, cx + 190, cy + 420], 180, 360, fill=(12, 70, 76))  # shirt
    # text
    d.text((cx, 840), "Gareeb Kumar", font=f("Inter-ExtraBold.otf", 92), fill=(20, 22, 30), anchor="mm")
    d.text((cx, 950), "AKA Poor", font=f("Inter-ExtraBold.otf", 80), fill=(20, 22, 30), anchor="mm")
    d.text((cx, 1035), "Graphic Designer", font=f("Inter-Medium.otf", 50), fill=(120, 120, 128), anchor="mm")
    rows = [("ID NO", "HX-7741-028"), ("EMAIL", "gareeb@mail.com"), ("PHONE", "98XXX 12345"), ("DATE", "01.08.2026")]
    for i, (k, v) in enumerate(rows):
        y = 1140 + i * 82
        d.text((170, y), k, font=f("Inter-Bold.otf", 44), fill=(20, 22, 30))
        d.text((420, y), ":   " + v, font=f("Inter-Regular.otf", 44), fill=(60, 60, 70))
    im.save(path)

CARD_PNG = os.path.join(args.assets, "id_card.png")
make_id_card(CARD_PNG)
def card_mat():
    m = mat("IDCard", (1, 1, 1), 0.35, coat=0.7)
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(CARD_PNG)
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    return m
M["card"] = card_mat()

# --------------------------------------------------------------------------- #
# Environment: floor, window wall, world, lights
world = bpy.data.worlds.new("World"); scn.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.78, 0.8, 0.84, 1); bg.inputs[1].default_value = 0.45

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 4, 0)); fl = bpy.context.object; fl.name = "Floor"
fl.data.materials.append(M["floor"])

WALL_Y = 7.0
box("WallLow", (30, 0.3, 1.0), (0, WALL_Y, 0.5), M["wall"])
box("WallTop", (30, 0.3, 1.2), (0, WALL_Y, 5.6), M["wall"])
for i, z in enumerate([1.0, 2.45, 3.9, 5.0]):
    box(f"MullionH{i}", (30, 0.18, 0.1), (0, WALL_Y - 0.1, z), M["frame"])
for i in range(-13, 14):
    box(f"MullionV{i}", (0.1, 0.18, 4.0), (i * 1.15, WALL_Y - 0.1, 3.0), M["frame"])
sky = box("SkyPanel", (30, 0.05, 6), (0, WALL_Y + 0.8, 3.0), M["sky"])
box("WallLeft", (0.3, 20, 6), (-7, 0, 3), M["wall"])
box("WallRight", (0.3, 20, 6), (7, 0, 3), M["wall"])

def area(name, loc, rot, size, energy, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, "AREA"); d.size = size; d.energy = energy; d.color = color
    ob = bpy.data.objects.new(name, d); ob.location = loc; ob.rotation_euler = rot; link(ob)
    return ob

sun_d = bpy.data.lights.new("Sun", "SUN"); sun_d.energy = 2.4; sun_d.angle = math.radians(6); sun_d.color = (1, 0.97, 0.92)
sun = bpy.data.objects.new("Sun", sun_d); sun.rotation_euler = (math.radians(50), 0, math.radians(-25)); link(sun)
area("KeyFront", (-2.5, -4.5, 4.0), (math.radians(55), 0, math.radians(-30)), 4.0, 420)
area("Fill", (3.5, -3.0, 2.0), (math.radians(70), 0, math.radians(50)), 3.0, 260, (0.9, 0.95, 1.0))

# --------------------------------------------------------------------------- #
# Walk-through metal detector gate (centred on the origin, opening faces -Y)
gate = empty("Gate")
PX = 0.47
pillars = []
for s in (-1, 1):
    p = box(f"Pillar{'L' if s < 0 else 'R'}", (0.12, 0.5, 2.1), (s * PX, 0, 1.05), M["pillar"], 0.012, gate)
    pillars.append(p)
    box(f"Foot{s}", (0.16, 0.56, 0.03), (s * PX, 0, 0.015), M["metal"], 0.006, gate)
    # coil wound inside the pillar
    pts = []
    for i in range(1400):
        t = i / 1400
        a = t * 2 * math.pi * 26
        pts.append((s * PX + 0.04 * math.cos(a), 0.2 * math.sin(a), 0.12 + t * 1.86))
    poly_curve(f"Coil{s}", pts, M["coil"], 0.0045, parent=gate)
box("Crossbar", (1.08, 0.55, 0.18), (0, 0, 2.19), M["metal"], 0.012, gate)
# control panel with keypad + red alarm button
box("PanelHousing", (0.46, 0.16, 0.12), (0.23, -0.12, 2.34), M["metal"], 0.01, gate)
box("Screen", (0.3, 0.012, 0.085), (0.18, -0.2, 2.34), M["darkplastic"], 0.003, gate)
k = box("Key", (0.022, 0.01, 0.014), (0.05, -0.208, 2.374), M["key"], 0.002, gate)
a1 = k.modifiers.new("ax", "ARRAY"); a1.relative_offset_displace = (1.25, 0, 0); a1.count = 10
a2 = k.modifiers.new("az", "ARRAY"); a2.relative_offset_displace = (0, 0, -1.35); a2.count = 4
btn_ring = cyl("ButtonRing", 0.04, 0.02, (0.4, -0.2, 2.34), M["silver"], rot=(math.pi / 2, 0, 0), parent=gate)
red = sphere("RedButton", 0.034, (0.4, -0.212, 2.34), M["redbtn"], scale=(1, 0.55, 1), parent=gate)
# brand plate
box("LogoPlate", (0.34, 0.025, 0.11), (-0.32, -0.22, 2.335), M["white"], 0.008, gate)
box("LogoMark", (0.06, 0.01, 0.06), (-0.455, -0.236, 2.335), M["brand"], 0.006, gate)
text("LogoMarkTxt", "h.", 0.045, (-0.455, -0.243, 2.333), M["white"], font=F_BOLD, parent=gate)
text("LogoText", BRAND, 0.042, (-0.295, -0.236, 2.335), M["ink"], font=F_BOLD, parent=gate)
# antenna / transmitter box with LEDs
AX = -0.06
box("TxBox", (0.13, 0.11, 0.13), (AX, -0.02, 2.345), M["darkplastic"], 0.008, gate)
leds = []
for i, z in enumerate((2.38, 2.315)):
    cyl(f"LEDRing{i}", 0.02, 0.01, (AX, -0.077, z), M["silver"], rot=(math.pi / 2, 0, 0), parent=gate)
    leds.append(sphere(f"LED{i}", 0.016, (AX, -0.082, z), M["led"], scale=(1, 0.6, 1), parent=gate))
ANT = []
for i, dx in enumerate((-0.035, 0.035)):
    cyl(f"AntBase{i}", 0.012, 0.03, (AX + dx, -0.02, 2.425), M["darkplastic"], parent=gate)
    cyl(f"Antenna{i}", 0.009, 0.24, (AX + dx, -0.02, 2.55), M["darkplastic"], r2=0.004, parent=gate)
    ANT.append(Vector((AX + dx, -0.02, 2.67)))
for i, dx in enumerate((-0.03, 0.03)):
    poly_curve(f"Cable{i}", [(AX + dx, -0.078, 2.29), (AX + dx, -0.12, 2.29), (AX + dx * 1.6, -0.2, 2.29),
                             (AX + dx * 2.2, -0.24, 2.282)], M["cable"], 0.006, parent=gate)

# --------------------------------------------------------------------------- #
# Character (stylised, built from primitives). Faces -Y; his right is -X.
root = empty("Person")
hips = empty("Hips", (0, 0, 0.95), root)
box("Pelvis", (0.36, 0.22, 0.2), (0, -0.0, 0.93), M["pants"], 0.06, hips)
# torso
bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=0.46, location=(0, 0, 1.25), vertices=48)
torso = bpy.context.object; torso.name = "Torso"
torso.scale = (1.05, 0.62, 1); bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.object.mode_set(mode="OBJECT")
for v in torso.data.vertices:  # broaden the chest, taper the waist
    t = (v.co.z - 1.02) / 0.46
    f = 0.9 + 0.18 * math.sin(min(max(t, 0), 1) * math.pi * 0.8)
    v.co.x *= f; v.co.y *= 0.95 + 0.1 * t
smooth(torso, 0.04, 4, 1); torso.data.materials.append(M["shirt"]); setp(torso, hips)
cyl("Collar", 0.075, 0.05, (0, -0.005, 1.5), M["shirtdark"], parent=hips)
box("Placket", (0.04, 0.01, 0.12), (0, -0.128, 1.42), M["shirtdark"], 0.004, hips)
box("ChestLogo", (0.05, 0.006, 0.012), (-0.1, -0.13, 1.37), M["white"], 0.002, hips)
neck = cyl("Neck", 0.055, 0.12, (0, 0, 1.55), M["skin"], parent=hips)
head = empty("Head", (0, 0, 1.6), hips)
sphere("Skull", 0.105, (0, 0, 1.69), M["skin"], (0.95, 1.05, 1.22), head)
sphere("Jaw", 0.085, (0, -0.02, 1.625), M["skin"], (1.0, 1.0, 0.8), head)
sphere("Hair", 0.112, (0, 0.012, 1.735), M["hair"], (0.98, 1.06, 0.9), head)
sphere("HairFringe", 0.06, (0.035, -0.07, 1.775), M["hair"], (1.4, 0.8, 0.6), head)
for s in (-1, 1):
    sphere(f"Eye{s}", 0.012, (s * 0.037, -0.098, 1.7), M["eye"], parent=head)
    box(f"Brow{s}", (0.032, 0.008, 0.007), (s * 0.038, -0.1, 1.725), M["hair"], 0.003, head)
    sphere(f"Ear{s}", 0.022, (s * 0.1, 0, 1.68), M["skin"], (0.5, 0.9, 1.3), head)
sphere("Nose", 0.016, (0, -0.112, 1.672), M["skin"], (0.9, 1.2, 1.4), head)
box("Mouth", (0.032, 0.006, 0.005), (0, -0.1, 1.635), M["shoe_brown"], 0.002, head)

def arm(side):
    sh = empty(f"Shoulder{side}", (side * 0.245, 0, 1.44), hips)
    sphere(f"Delt{side}", 0.062, (side * 0.245, 0, 1.43), M["shirt"], parent=sh)
    cyl(f"Sleeve{side}", 0.06, 0.2, (side * 0.26, 0, 1.33), M["shirt"], parent=sh, r2=0.056)
    cyl(f"UpperArm{side}", 0.044, 0.16, (side * 0.265, 0, 1.2), M["skin"], parent=sh)
    el = empty(f"Elbow{side}", (side * 0.265, 0, 1.13), sh)
    sphere(f"ElbowJ{side}", 0.042, (side * 0.265, 0, 1.13), M["skin"], parent=el)
    cyl(f"Forearm{side}", 0.04, 0.24, (side * 0.265, 0, 1.01), M["skin"], parent=el, r2=0.032)
    sphere(f"Hand{side}", 0.045, (side * 0.265, 0, 0.855), M["skin"], (0.75, 1.0, 1.35), el)
    if side > 0:
        cyl("Watch", 0.037, 0.03, (side * 0.265, 0, 0.92), M["watch"], parent=el)
    return sh, el
R_SH, R_EL = arm(-1)
L_SH, L_EL = arm(1)

def leg(side):
    hp = empty(f"HipJ{side}", (side * 0.095, 0, 0.9), hips)
    cyl(f"Thigh{side}", 0.088, 0.46, (side * 0.095, 0, 0.66), M["pants"], parent=hp, r2=0.072)
    kn = empty(f"Knee{side}", (side * 0.095, 0, 0.44), hp)
    cyl(f"Shin{side}", 0.072, 0.4, (side * 0.095, 0, 0.25), M["pants"], parent=kn, r2=0.066)
    box(f"ShoeToe{side}", (0.1, 0.17, 0.07), (side * 0.095, -0.07, 0.04), M["shoe_white"], 0.03, kn)
    box(f"ShoeHeel{side}", (0.1, 0.12, 0.08), (side * 0.095, 0.04, 0.045), M["shoe_brown"], 0.03, kn)
    box(f"ShoeCap{side}", (0.096, 0.07, 0.065), (side * 0.095, -0.13, 0.04), M["shoe_brown"], 0.03, kn)
    return hp, kn
R_HIP, R_KN = leg(-1)
L_HIP, L_KN = leg(1)

# belt, loops, buckle
bpy.ops.mesh.primitive_torus_add(major_radius=0.18, minor_radius=0.022, location=(0, 0, 1.005),
                                 major_segments=96, minor_segments=12)
belt = bpy.context.object; belt.name = "Belt"; belt.scale = (1.03, 0.66, 0.85)
bpy.ops.object.transform_apply(scale=True); smooth(belt); belt.data.materials.append(M["belt"]); setp(belt, hips)
for i, x in enumerate((-0.14, -0.07, 0.07, 0.14)):
    y = -0.115 * math.sqrt(max(0.0, 1 - (x / 0.2) ** 2))
    box(f"BeltLoop{i}", (0.014, 0.008, 0.05), (x, y - 0.012, 1.0), M["pants"], 0.003, hips)
bk = box("BuckleFrame", (0.06, 0.012, 0.045), (0, -0.128, 1.005), M["silver"], 0.004, hips)
hole = box("BuckleHole", (0.042, 0.05, 0.03), (0.0, -0.128, 1.005), None)
bmod = bk.modifiers.new("hole", "BOOLEAN"); bmod.object = hole; bmod.operation = "DIFFERENCE"
hole.hide_render = True; hole.hide_viewport = True
box("BuckleTongue", (0.006, 0.006, 0.034), (0.002, -0.134, 1.005), M["silver"], 0.002, hips)
# fly + pocket seams
seam = mat("Seam", (0.7, 0.7, 0.68), 0.8)
poly_curve("Fly", [(0.012, -0.112, 0.98), (0.014, -0.112, 0.88), (0.0, -0.11, 0.84)], seam, 0.0025, parent=hips)
for s in (-1, 1):
    pts = [(s * (0.08 + 0.06 * t), -0.112 + 0.03 * t * t, 0.975 - 0.13 * math.sin(t * math.pi / 2)) for t in [i / 12 for i in range(13)]]
    poly_curve(f"Pocket{s}", pts, seam, 0.0025, parent=hips)
# gun in holster on his left hip (screen-right in front shots)
gun = empty("Gun", (0.15, -0.115, 0.95), hips)
box("Holster", (0.05, 0.03, 0.13), (0.15, -0.122, 0.93), M["holster"], 0.01, gun)
box("Grip", (0.035, 0.028, 0.08), (0.157, -0.128, 1.02), M["gunmetal"], 0.008, gun, rot=(0, math.radians(-12), 0))
box("Slide", (0.075, 0.03, 0.03), (0.165, -0.128, 0.995), M["gunmetal"], 0.006, gun)
bpy.ops.mesh.primitive_torus_add(major_radius=0.016, minor_radius=0.004, location=(0.15, -0.128, 0.975), rotation=(math.pi / 2, 0, 0))
tg = bpy.context.object; tg.name = "TriggerGuard"; smooth(tg); tg.data.materials.append(M["gunmetal"]); setp(tg, gun)
for i in range(5):
    box(f"GripLine{i}", (0.03, 0.004, 0.003), (0.159, -0.143, 1.0 + i * 0.012), M["ink"], 0, gun)

# --------------------------------------------------------------------------- #
# Coins + ID card: tiny real-size copy inside his right front pocket (X-ray reveal)
def coin(name, r, loc, rot, parent=None):
    c = empty(name, loc, parent); c.rotation_euler = rot
    body = cyl(name + "Body", r, r * 0.14, (0, 0, 0), M["gold"], verts=96)
    smooth(body, r * 0.03, 3); body.parent = c
    for s in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.86, minor_radius=r * 0.025, location=(0, 0, s * r * 0.07),
                                         major_segments=96, minor_segments=8)
        ring = bpy.context.object; ring.name = name + f"Rim{s}"; smooth(ring)
        ring.data.materials.append(M["golddark"]); ring.parent = c
        for i in range(36):
            a = i / 36 * 2 * math.pi
            d = box(name + f"Dot{s}_{i}", (r * 0.04, r * 0.04, r * 0.02),
                    (r * 0.93 * math.cos(a), r * 0.93 * math.sin(a), s * r * 0.07), M["golddark"], 0)
            d.parent = c
    t = text(name + "B", "\u20bf", r * 1.15, (0, 0, r * 0.07), M["golddark"], rot=(0, 0, math.radians(-12)),
             font=F_BOLD, extrude=r * 0.03)
    t.parent = c
    return c

def id_card(name, w, loc, rot, parent=None):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
    c = bpy.context.object; c.name = name; c.scale = (w, w * 1.593, 1)
    bpy.ops.object.transform_apply(scale=True)
    sol = c.modifiers.new("thick", "SOLIDIFY"); sol.thickness = w * 0.015
    smooth(c, w * 0.01, 2); c.data.materials.append(M["card"])
    c.location = loc; c.rotation_euler = rot
    if parent: c.parent = parent
    return c

pocket = empty("PocketStuff", (-0.1, -0.045, 0.83), hips)
pc1 = coin("PCoinA", 0.02, (0, 0, 0), (math.radians(80), 0, math.radians(5)))
pc1.parent = pocket; pc1.location = (0.015, 0, 0.02)
pc2 = coin("PCoinB", 0.02, (0, 0, 0), (math.radians(80), 0, math.radians(-10)))
pc2.parent = pocket; pc2.location = (-0.005, 0.01, -0.025)
pcard = id_card("PCard", 0.035, (0, 0, 0), (math.radians(85), 0, math.radians(8)))
pcard.parent = pocket; pcard.location = (-0.012, -0.008, -0.01)

# Macro "X-ray" set far away: big coins on a warm, out-of-focus backdrop
MAC = Vector((60, 0, 0))
bpy.ops.mesh.primitive_plane_add(size=12, location=MAC + Vector((0, 0, -0.02)))
bd = bpy.context.object; bd.name = "MacroBackdrop"; bd.data.materials.append(M["backdrop"])
macro_coinA = coin("CoinA", 0.2, MAC + Vector((-0.05, 0.22, 0.04)), (math.radians(6), math.radians(-4), 0))
macro_coinB = coin("CoinB", 0.2, MAC + Vector((0.33, -0.06, 0.06)), (math.radians(-8), math.radians(10), math.radians(30)))
macro_card = id_card("Card", 0.36, MAC + Vector((-0.08, -0.38, 0.09)), (math.radians(4), math.radians(-3), math.radians(-14)))
area("MacroKey", MAC + Vector((-1.2, -1.0, 2.2)), (math.radians(35), math.radians(-30), 0), 2.0, 260, (1, 0.96, 0.9))
area("MacroRim", MAC + Vector((1.5, 1.2, 1.2)), (math.radians(-50), math.radians(45), 0), 1.5, 140, (0.85, 0.92, 1.0))

# --------------------------------------------------------------------------- #
# Timeline (frames @30fps, matched to the original cuts)
CUT = dict(A=0, B=94, C=156, D=210, E=221, F=315, G=356, H=418, H2=480, I=566, J=983, K=1184,
           L=1237, M=1328, N=1436, N2=1472, O=1553, END=END)

# Person path. Walk in (0-80), stand; hidden during the empty-gate part of shot I,
# walk in from the right (805-870), stand.
interp("LINEAR")
HIDE = (0, 0, -40)

def walk(f0, f1, p0, p1, steps_per_sec=1.9):
    p0, p1 = Vector(p0), Vector(p1)
    d = (p1 - p0); yaw = math.atan2(-d.x, d.y) + math.pi  # face travel direction (-Y forward)
    yaw = (yaw + math.pi) % (2 * math.pi) - math.pi
    for f in range(f0, f1 + 1, 2):
        t = (f - f0) / (f1 - f0)
        te = t * t * (3 - 2 * t) if False else t
        pos = p0.lerp(p1, te)
        ph = (f - f0) / FPS * steps_per_sec * math.pi
        amp = min(1.0, (f - f0) / 8, (f1 - f) / 8)
        s = math.sin(ph) * amp
        root.location = (pos.x, pos.y, abs(math.cos(ph)) * 0.025 * amp)
        root.keyframe_insert("location", frame=f)
        root.rotation_euler = (0, 0, yaw); root.keyframe_insert("rotation_euler", frame=f)
        for j, ang in ((R_HIP, s * 0.42), (L_HIP, -s * 0.42), (R_SH, -s * 0.38), (L_SH, s * 0.38)):
            j.rotation_euler = (ang, 0, 0); j.keyframe_insert("rotation_euler", frame=f)
        for j, ang in ((R_KN, max(0, -s) * 0.6), (L_KN, max(0, s) * 0.6), (R_EL, -0.2 - 0.15 * amp), (L_EL, -0.2 - 0.15 * amp)):
            j.rotation_euler = (ang, 0, 0); j.keyframe_insert("rotation_euler", frame=f)

def stand(f, pos=(0, 0)):
    root.location = (pos[0], pos[1], 0); root.keyframe_insert("location", frame=f)
    root.rotation_euler = (0, 0, 0); root.keyframe_insert("rotation_euler", frame=f)
    for j in (R_HIP, L_HIP, R_KN, L_KN, R_SH, L_SH):
        j.rotation_euler = (0, 0, 0); j.keyframe_insert("rotation_euler", frame=f)
    for j in (R_EL, L_EL):
        j.rotation_euler = (-0.12, 0, 0); j.keyframe_insert("rotation_euler", frame=f)

walk(0, 80, (0, 1.9), (0, 0.0))
stand(84)
# hand drifts toward the right pocket (shot C)
interp("BEZIER")
for f, rs, re_ in ((150, (0, 0, 0), (-0.12, 0, 0)), (200, (0.18, 0.12, 0.05), (-0.75, 0, 0.1)), (214, (0.18, 0.12, 0.05), (-0.75, 0, 0.1)),
                   (232, (0, 0, 0), (-0.12, 0, 0))):
    R_SH.rotation_euler = rs; R_SH.keyframe_insert("rotation_euler", frame=f)
    R_EL.rotation_euler = re_; R_EL.keyframe_insert("rotation_euler", frame=f)
interp("LINEAR")
stand(564)
interp("CONSTANT")
key(root, "location", [(564, (0, 0, 0)), (566, HIDE), (804, HIDE)])
interp("LINEAR")
walk(805, 866, (1.9, -0.9), (0.0, 0.0))
stand(884)
stand(END)

# X-ray: pants fade to ghost while the camera pushes into the pocket
interp("BEZIER")
key_input(PANTS_XRAY, [(0, 0.0), (440, 0.0), (472, 1.0), (482, 0.0), (1434, 0.0), (1442, 1.0), (1474, 1.0), (1476, 0.0)])

# Gate pillars: pink glass -> clear glass (coils visible) -> metal again
interp("CONSTANT")
key_input(PILLAR_GLASS, [(0, 0.0), (566, 1.0)])
interp("BEZIER")
key_input(PILLAR_GLASS, [(680, 1.0), (705, 0.0)])
key_input(PILLAR_CLEAR, [(0, 0.0), (590, 0.0), (612, 1.0)])
key_input(COIL_STR, [(0, 2.0), (612, 1.0), (640, 4.0), (680, 2.0)])

# Red alarm button blinks in the panel shots
interp("CONSTANT")
rb = M["redbtn"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
blink = [(0, 0.4)]
for a, b_ in ((CUT["B"], CUT["C"]), (CUT["G"] + 20, CUT["H"]), (CUT["K"], CUT["L"])):
    for f in range(a, b_, 8):
        blink += [(f, 14.0), (f + 4, 0.6)]
    blink.append((b_, 0.4))
key_input(rb, blink)
# Green LEDs: dim, then bright at the end
interp("BEZIER")
ledin = M["led"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
key_input(ledin, [(0, 1.0), (1237, 1.5), (1300, 4.0), (1553, 6.0), (1590, 22.0)])

# Magnetic field lines: hourglass of horizontal loops threading the doorway
FIELD = []
for i in range(13):
    z = 0.15 + i * 0.155
    u = (z - 1.08) / 0.95
    rx = 0.3 + 0.2 * abs(u) ** 0.8
    ry = 0.26 + 0.2 * abs(u) ** 0.8
    pts = [(rx * math.cos(a), ry * math.sin(a), z + 0.03 * math.sin(2 * a))
           for a in [k / 96 * 2 * math.pi for k in range(96)]]
    ob = poly_curve(f"Field{i}", pts, M["field"], 0.0045, cyclic=False)
    FIELD.append((ob, rx, ry, z))
FIELD_ON = [(690, 790), (872, 983)]

def field_grow(ob, start, stop, delay):
    cu = ob.data
    interp("BEZIER")
    key(cu, "bevel_factor_end", [(0, 0.0), (start + delay, 0.0), (start + delay + 30, 1.0),
                                 (stop - 12, 1.0), (stop, 0.0)])

for i, (ob, rx, ry, z) in enumerate(FIELD):
    cu = ob.data; interp("BEZIER")
    seq = [(0, 0.0)]
    for (a, b_) in FIELD_ON:
        dl = abs(i - 6) * 2
        seq += [(a + dl, 0.0), (a + dl + 28, 1.0)]
        if b_ < END: seq += [(b_ - 12, 1.0), (b_, 0.0)]
    key(cu, "bevel_factor_end", seq)
    interp("CONSTANT")
    key(ob, "hide_render", [(0, True)] + sum([[(a + abs(i - 6) * 2 + 1, False), (b_, True)] for a, b_ in FIELD_ON], []))

# arrows riding the loops (red one way, blue the other) — positions baked as keys
cone_red = cone_blue = None
ARROWS = []
for i, (ob, rx, ry, z) in enumerate(FIELD):
    for k in range(4):
        m_ = M["arrow_red"] if (i + k) % 2 == 0 else M["arrow_blue"]
        bpy.ops.mesh.primitive_cone_add(radius1=0.018, radius2=0, depth=0.045, vertices=16)
        a = bpy.context.object; a.name = f"Arrow{i}_{k}"; a.data.materials.append(m_)
        ARROWS.append((a, i, k, rx, ry, z))
interp("LINEAR")
for (a, i, k, rx, ry, z) in ARROWS:
    for f in range(0, END + 1, 2):
        on = any(s0 + 30 + abs(i - 6) * 2 <= f <= s1 - 12 for s0, s1 in FIELD_ON)
        ang = k * math.pi / 2 + f * 0.045 * (1 if i % 2 == 0 else -1) * 0.9
        x, y = rx * math.cos(ang), ry * math.sin(ang)
        zz = z + 0.03 * math.sin(2 * ang)
        dx, dy = -rx * math.sin(ang), ry * math.cos(ang)
        if i % 2: dx, dy = -dx, -dy
        a.location = (x, y, zz) if on else (x, y, -30)
        a.rotation_euler = (math.pi / 2, 0, math.atan2(dx, -dy))
        a.keyframe_insert("location", frame=f); a.keyframe_insert("rotation_euler", frame=f)

# Eddy currents on coin A (macro shot J): jagged glowing loops that crawl and flicker
EDDY = []
cA = macro_coinA.location.copy()
for n in range(6):
    r0 = 0.035 + n * 0.022
    pts = []
    for k in range(110):
        a = k / 109 * 2 * math.pi + n
        rr = r0 * (1 + 0.05 * math.sin(k * 0.7 + n)) + random.uniform(-0.002, 0.002)
        pts.append((cA.x + rr * math.cos(a) + 0,
                    cA.y + rr * math.sin(a), cA.z + 0.045 + n * 0.0004))
    ob = poly_curve(f"Eddy{n}", pts, M["eddy"], 0.0018)
    EDDY.append(ob)
interp("BEZIER")
for n, ob in enumerate(EDDY):
    cu = ob.data
    st = CUT["J"] + 40 + n * 9
    keys_e, keys_s = [(0, 0.0)], [(0, 0.0)]
    f = st
    while f < CUT["K"]:
        keys_e += [(f, 0.0), (f + 22, 1.0)]
        keys_s += [(f, 0.0), (f + 10, 0.0), (f + 30, 1.0)]
        f += 34 + (n % 3) * 4
    key(cu, "bevel_factor_end", keys_e)
    key(cu, "bevel_factor_start", keys_s)
interp("CONSTANT")
key_input(EDDY_STR, [(0, 9.0)] + [(f, 5.0 if (f // 3) % 3 else 9.0) for f in range(CUT["J"], CUT["K"], 3)])

# Measuring gauge across coin A (shot M)
gauge = empty("Gauge", cA + Vector((0, -0.02, 0.05)))
gbar = cyl("GaugeBar", 0.006, 1.0, (0, 0, 0), M["gauge"], rot=(0, math.pi / 2, 0))
gbar.parent = gauge; gbar.location = (0, 0, 0)
caps = []
for s in (-1, 1):
    c = box(f"GaugeCap{s}", (0.008, 0.008, 0.05), (0, 0, 0), M["gauge"], 0)
    c.parent = gauge; c.rotation_euler = (math.pi / 2, 0, 0); caps.append((c, s))
interp("BEZIER")
gauge.rotation_euler = (0, 0, math.radians(-6))
key(gbar, "scale", [(0, (1, 1, 0.001)), (CUT["M"] + 25, (1, 1, 0.001)), (CUT["M"] + 60, (1, 1, 0.42)), (CUT["N"], (1, 1, 0.42))])
for c, s in caps:
    key(c, "location", [(0, (0, 0, 0)), (CUT["M"] + 25, (0, 0, 0)), (CUT["M"] + 60, (s * 0.21, 0, 0)), (CUT["N"], (s * 0.21, 0, 0))])
key(gauge, "scale", [(0, (0, 0, 0)), (CUT["M"] + 22, (0, 0, 0)), (CUT["M"] + 25, (1, 1, 1)), (CUT["N"] - 1, (1, 1, 1)), (CUT["N"], (0, 0, 0))])

# Radio waves from the antennas (shots L and O): expanding domes that fade out
WAVES = []
for w in range(5):
    m_, s_, a_ = emit_mat(f"Wave{w}", (0.2, 0.6, 1.0), 4.0, 1.0)
    grps = []
    for j, tip in enumerate(ANT):
        grp = empty(f"WaveGrp{w}_{j}", tip)
        for tilt in (0, 1, 2):
            pts = [(0.1 * math.cos(t), 0, 0.1 * math.sin(t)) for t in [k / 48 * math.pi for k in range(49)]]
            ob = poly_curve(f"Wave{w}_{j}_{tilt}", pts, m_, 0.0016)
            ob.parent = grp; ob.rotation_euler = (0, 0, math.radians(-40 + tilt * 40))
        grps.append(grp)
    WAVES.append((grps, a_))
interp("BEZIER")
for w, (grps, a_) in enumerate(WAVES):
    ks, ka = [(0, (0, 0, 0))], [(0, 0.0)]
    for (a, b_, period) in ((CUT["L"], CUT["M"], 45), (CUT["O"], END, 36)):
        f = a + w * period // 5
        while f + 2 < b_:
            ks += [(f, (0.05, 0.05, 0.05)), (f + period - 1, (1.7, 1.7, 1.7)), (f + period, (0, 0, 0))]
            ka += [(f, 1.0), (f + period // 2, 0.9), (f + period - 1, 0.0)]
            f += period
    for grp in grps:
        for f_, v in ks:
            grp.scale = v; grp.keyframe_insert("scale", frame=int(f_))
    key_input(a_, [(int(f_), v) for f_, v in ka])

# --------------------------------------------------------------------------- #
# Cameras — one per shot, bound to timeline markers
def camera(name, lens=40, dof=None, fstop=2.8):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24
    cd.clip_start = 0.01; cd.clip_end = 200
    cam = bpy.data.objects.new(name, cd); link(cam)
    tgt = empty(name + "_tgt")
    c = cam.constraints.new("TRACK_TO"); c.target = tgt; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    if dof:
        cd.dof.use_dof = True; cd.dof.focus_object = tgt; cd.dof.aperture_fstop = fstop
    return cam, tgt

def move(cam, tgt, f0, f1, c0, c1, t0, t1, lens=None):
    interp("BEZIER")
    key(cam, "location", [(f0, c0), (f1, c1)])
    key(tgt, "location", [(f0, t0), (f1, t1)])
    if lens:
        key(cam.data, "lens", [(f0, lens[0]), (f1, lens[1])])

def shot(name, f0, f1, c0, c1, t0, t1, lens=40, dof=None, fstop=2.8, lens_end=None):
    cam, tgt = camera(name, lens, dof, fstop)
    move(cam, tgt, f0, f1 - 1, c0, c1, t0, t1, (lens, lens_end) if lens_end else None)
    mk = scn.timeline_markers.new(name, frame=f0); mk.camera = cam
    return cam

M_ = lambda v: tuple(MAC + Vector(v))
shot("A_walkin", CUT["A"], CUT["B"], (0.9, -7.0, 1.45), (0.45, -4.3, 1.4), (0, 0, 1.2), (0, 0, 1.15), 38)
shot("B_panel", CUT["B"], CUT["C"], (0.62, -0.95, 1.86), (0.55, -0.84, 1.9), (0.24, -0.2, 2.3), (0.24, -0.2, 2.32), 26, True, 5)
shot("C_pocket", CUT["C"], CUT["D"], (-0.5, -0.85, 0.92), (-0.38, -0.62, 0.9), (-0.1, -0.1, 0.88), (-0.1, -0.1, 0.87), 45, True, 2.8)
shot("D_flash", CUT["D"], CUT["E"], M_((0.05, -0.9, 1.35)), M_((0.05, -0.85, 1.3)), M_((0.05, -0.08, 0.05)), M_((0.05, -0.08, 0.05)), 40, True, 3.5)
shot("E_gun", CUT["E"], CUT["F"], (0.42, -0.6, 1.0), (0.12, -0.55, 1.06), (0.16, -0.12, 0.98), (0.0, -0.12, 1.0), 50, True, 2.8)
shot("F_buckle", CUT["F"], CUT["G"], (-0.16, -0.42, 1.08), (-0.1, -0.36, 1.06), (0, -0.13, 1.0), (0, -0.13, 1.0), 50, True, 2.8)
shot("G_wide", CUT["G"], CUT["H"], (-0.6, -4.6, 1.3), (-0.4, -4.0, 1.32), (0, 0, 1.15), (0, 0, 1.15), 38)
shot("H_pushin", CUT["H"], CUT["H2"], (-0.45, -1.35, 1.05), (-0.11, -0.3, 0.86), (-0.1, -0.08, 0.86), (-0.1, -0.07, 0.85), 40, True, 4)
shot("H2_macro", CUT["H2"], CUT["I"], M_((0.0, -1.3, 1.5)), M_((0.05, -1.0, 1.35)), M_((0.05, -0.06, 0.05)), M_((0.05, -0.06, 0.05)), 36, True, 4)
camI = shot("I_gate", CUT["I"], CUT["J"], (-1.9, -3.7, 0.75), (-0.2, -3.1, 1.15), (0, 0, 1.15), (0, 0, 1.15), 30)
# extra moves inside the long science shot
move(camI, bpy.data.objects["I_gate_tgt"], 790, 870, (-1.1, -3.5, 1.0), (0.5, -3.9, 1.1), (0, 0, 1.15), (0.2, 0, 1.1))
move(camI, bpy.data.objects["I_gate_tgt"], 871, CUT["J"] - 1, (0.5, -3.6, 1.1), (0.1, -2.75, 1.2), (0, 0, 1.12), (0, 0, 1.1))
shot("J_eddy", CUT["J"], CUT["K"], M_((-0.25, -0.75, 1.0)), M_((-0.1, -0.55, 0.85)), M_((-0.05, 0.18, 0.05)), M_((-0.05, 0.2, 0.05)), 40, True, 5)
shot("K_alarm", CUT["K"], CUT["L"], (0.5, -0.9, 1.9), (0.48, -0.78, 1.95), (0.3, -0.2, 2.32), (0.3, -0.2, 2.33), 28, True, 5)
shot("L_antenna", CUT["L"], CUT["M"], (AX + 0.12, -0.85, 2.42), (AX + 0.08, -0.72, 2.45), (AX, -0.05, 2.46), (AX, -0.05, 2.48), 34, True, 5)
shot("M_gauge", CUT["M"], CUT["N"], M_((-0.05, -0.62, 0.95)), M_((-0.05, -0.55, 0.88)), M_((-0.05, 0.2, 0.05)), M_((-0.05, 0.2, 0.05)), 40, True, 5)
shot("N_pocket", CUT["N"], CUT["N2"], (-0.4, -0.75, 0.98), (-0.2, -0.42, 0.9), (-0.1, -0.08, 0.86), (-0.1, -0.07, 0.85), 40, True, 4)
shot("N2_macro", CUT["N2"], CUT["O"], M_((0.1, -1.5, 1.7)), M_((0.05, -1.0, 1.25)), M_((0.05, -0.06, 0.05)), M_((0.05, -0.06, 0.05)), 36, True, 4)
shot("O_antenna", CUT["O"], CUT["END"], (AX + 0.1, -0.75, 2.4), (AX + 0.06, -0.62, 2.44), (AX, -0.05, 2.47), (AX, -0.05, 2.5), 32, True, 5)
scn.camera = bpy.data.objects["A_walkin"]
interp("BEZIER")

# --------------------------------------------------------------------------- #
# Render settings: Cycles CPU, denoised, AgX look, 1080x1920
r = scn.render
r.engine = "CYCLES"; scn.cycles.device = "CPU"
scn.cycles.samples = 10; scn.cycles.denoising_quality = "FAST"; scn.cycles.denoising_prefilter = "FAST"; scn.cycles.use_adaptive_sampling = True; scn.cycles.adaptive_threshold = 0.03
scn.cycles.use_denoising = True; scn.cycles.denoiser = "OPENIMAGEDENOISE"
scn.cycles.max_bounces = 4; scn.cycles.diffuse_bounces = 1; scn.cycles.glossy_bounces = 2
scn.cycles.transparent_max_bounces = 16; scn.cycles.transmission_bounces = 4
scn.cycles.caustics_reflective = False; scn.cycles.caustics_refractive = False
scn.cycles.blur_glossy = 1.0
r.resolution_x, r.resolution_y, r.resolution_percentage = 720, 1280, 100  # upscaled to 1080x1920 at encode
r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGB"
r.use_overwrite = False; r.use_placeholder = True; r.use_persistent_data = True
scn.view_settings.view_transform = "AgX"
try:
    scn.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass
scn.view_settings.exposure = -0.35
try:
    scn.view_settings.look = "Medium High Contrast"
except Exception:
    pass
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.out))
print("saved", args.out)
