"""
Just KnowIt: "How a walk-through metal detector works", the Instagram Reel cut (Blender 5.x).

An upgrade of ../build_scene.py (the first 3D remake), which is left untouched. This version:
  * follows the reel edit (cold-open hook, then the narration at 1.2x; 30 fps, 1417 frames, cut list in CUT),
  * moves the set to a dusk airport security lane with practical lights, a glossy floor, a queue, a guard
    and a baggage scanner,
  * shows the physics accurately: a flat transmitter coil (left panel) pulses a magnetic field across the
    walkway, metal bends the field, eddy currents circulate in the coin, the coin's own opposing field reaches
    the receiver coil (right panel), and the control unit shows the signal (trace, strength bar, zone LEDs,
    alarm),
  * uses depth of field on every shot and motion blur (whip pans, push-ins).

    python build_reel.py --out reel.blend --assets build/assets

Then:  ../render.py (frames), anchors.py (label positions), sound.py, post.py, encode_reel.sh.
"""
import bpy, math, random, os, sys, argparse
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cuts import FPS, END, CUT, PULSE, ALARM, BLINK, WALKS
import brand
BRAND = brand.NAME
ap = argparse.ArgumentParser()
ap.add_argument("--out", default="reel.blend")
ap.add_argument("--assets", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "build", "assets"))
args, _ = ap.parse_known_args(sys.argv[1:])
os.makedirs(args.assets, exist_ok=True)
random.seed(11)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.fps = FPS
scn.frame_start, scn.frame_end = 0, END - 1
prefs = bpy.context.preferences.edit

# Cut list: cuts.py. Narration phrase starts are in build/timeline.json (prep_audio.py).
C = CUT


def interp(kind):
    prefs.keyframe_new_interpolation_type = kind


# --------------------------------------------------------------------------- #
# Helpers (same conventions as ../build_scene.py)
def link(ob):
    if ob.name not in scn.collection.objects:
        scn.collection.objects.link(ob)
    return ob


def smooth(ob, bevel=0.0, segs=3, sub=0):
    if ob.type == "MESH":
        for p in ob.data.polygons:
            p.use_smooth = True
    if bevel:
        m = ob.modifiers.new("bevel", "BEVEL"); m.width = bevel; m.segments = segs; m.limit_method = "ANGLE"
    if sub:
        m = ob.modifiers.new("sub", "SUBSURF"); m.levels = sub; m.render_levels = sub
    return ob


def setp(ob, parent):
    bpy.context.view_layer.update()  # objects made via bpy.data have stale matrices until evaluated
    mw = ob.matrix_world.copy()
    ob.parent = parent
    ob.matrix_world = mw


def box(name, size, loc, mat=None, bevel=0.0, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.object; ob.name = name; ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel: smooth(ob, bevel)
    if mat: ob.data.materials.append(mat)
    if parent: setp(ob, parent)
    return ob


def cyl(name, r, depth, loc, mat=None, rot=(0, 0, 0), verts=48, parent=None, r2=None, caps=True):
    fill = "NGON" if caps else "NOTHING"
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts, end_fill_type=fill)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts, end_fill_type=fill)
    ob = bpy.context.object; ob.name = name
    smooth(ob)
    if mat: ob.data.materials.append(mat)
    if parent: setp(ob, parent)
    return ob


def sphere(name, r, loc, mat=None, scale=(1, 1, 1), parent=None, seg=40):
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


def poly_curve(name, pts, mat, bevel, cyclic=False, parent=None):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"
    sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (co[0], co[1], co[2], 1)
    sp.use_cyclic_u = cyclic
    cu.bevel_depth = bevel; cu.bevel_resolution = 2; cu.use_fill_caps = True
    cu.bevel_factor_mapping_start = "SPLINE"; cu.bevel_factor_mapping_end = "SPLINE"
    ob = bpy.data.objects.new(name, cu); link(ob)
    if mat: cu.materials.append(mat)
    if parent: setp(ob, parent)
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


def visible(obj, ranges):
    """Show obj only inside [a, b) frame ranges (constant keys)."""
    interp("CONSTANT")
    seq = [(0, True)]
    for a, b in ranges:
        seq += [(a, False), (b, True)]
    key(obj, "hide_render", seq)


def ramp_ranges(sock, ranges, lo, hi, kind="BEZIER"):
    """ranges: (on_start, on_full, off_start, off_end) -> lo..hi..lo."""
    interp(kind)
    seq = [(0, lo)]
    for a, b, c, d in ranges:
        seq += [(a, lo), (b, hi), (c, hi), (d, lo)]
    key_input(sock, seq)


def blink_ranges(sock, ranges, on, off, rest, period=8):
    interp("CONSTANT")
    seq = [(0, rest)]
    for a, b in ranges:
        for f in range(a, b, period):
            seq += [(f, on), (f + period // 2, off)]
        seq.append((b, rest))
    key_input(sock, seq)


# --------------------------------------------------------------------------- #
# Materials
def mat(name, color, rough=0.5, metal=0.0, emit=None, estr=0.0, coat=0.0, aniso=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if coat: b.inputs["Coat Weight"].default_value = coat
    if aniso: b.inputs["Anisotropic"].default_value = aniso
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = estr
    return m


def emit_mat(name, color, strength, alpha=1.0):
    """Pure emission mixed with transparency; returns (material, strength socket, alpha socket)."""
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


# Palette: dusk airport (slate, warm practicals), Just KnowIt brand red, physics colours with meaning:
#   cyan = magnetic field from the transmitter, amber = induced (eddy) current,
#   rose = the metal's own opposing field, red = alarm only.
BRAND_COL = tuple((c / 255) ** 2.2 for c in brand.RED)   # brand red in linear
CYAN = (0.08, 0.7, 1.0)
AMBER = (1.0, 0.5, 0.06)
ROSE = (1.0, 0.18, 0.45)

M = {}
M["floor"] = noise_bump(mat("Floor", (0.1, 0.105, 0.115), 0.2), 5, 0.02, ((0.075, 0.08, 0.09), (0.13, 0.135, 0.145)))
M["wall"] = mat("Wall", (0.07, 0.085, 0.1), 0.75)
M["frame"] = mat("WindowFrame", (0.03, 0.032, 0.036), 0.4, 0.5)
M["ceiling"] = mat("Ceiling", (0.05, 0.055, 0.06), 0.8)
M["strip"], _, _ = emit_mat("LightStrip", (1.0, 0.92, 0.82), 9.0)
M["alu"] = mat("BrushedAlu", (0.62, 0.64, 0.67), 0.3, 1.0, aniso=0.6)
M["graphite"] = mat("Graphite", (0.03, 0.032, 0.036), 0.38, 0.2)
M["screen"] = mat("Screen", (0.004, 0.008, 0.01), 0.12, emit=(0.0, 0.12, 0.1), estr=0.6, coat=1.0)
M["trace"], TRACE_STR, _ = emit_mat("Trace", (0.2, 1.0, 0.65), 6.0)
M["white"] = mat("PlateWhite", (0.88, 0.89, 0.9), 0.25, coat=0.4)
M["ink"] = mat("Ink", (0.04, 0.045, 0.06), 0.4)
M["brand"] = mat("Brand", BRAND_COL, 0.3, emit=BRAND_COL, estr=1.2)
M["brandplate"] = mat("BrandPlate", BRAND_COL, 0.35, coat=0.4)
M["redbtn"] = mat("RedButton", (0.5, 0.01, 0.01), 0.15, emit=(1.0, 0.03, 0.02), estr=0.3, coat=1.0)
M["chrome"] = mat("Chrome", (0.8, 0.81, 0.83), 0.12, 1.0)
M["strap"] = mat("QueueStrap", (0.1, 0.06, 0.35), 0.6)
M["machine"] = mat("ScannerBody", (0.42, 0.45, 0.5), 0.45, 0.1)
M["rubber"] = mat("Rubber", (0.02, 0.02, 0.022), 0.7)
M["curtain"] = mat("LeadCurtain", (0.05, 0.05, 0.06), 0.5)

# Character
def shirt_mat(name="Shirt", print_png=None):
    m = mat(name, (0.03, 0.05, 0.12), 0.7)
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 1.0; mr.inputs["From Max"].default_value = 1.45
    ramp = nt.nodes.new("ShaderNodeValToRGB"); e = ramp.color_ramp.elements
    e[0].position = 0.2; e[0].color = (0.05, 0.09, 0.2, 1)
    e[1].position = 0.8; e[1].color = (0.018, 0.03, 0.07, 1)
    nt.links.new(geo.outputs["Position"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nt.links.new(mr.outputs[0], ramp.inputs[0])
    colour = ramp.outputs[0]
    if print_png:
        # chest print, projected front-on in the torso's own space so it moves with the body
        tc = nt.nodes.new("ShaderNodeTexCoord"); so = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(tc.outputs["Object"], so.inputs[0])
        def remap(sock, lo, hi):
            r = nt.nodes.new("ShaderNodeMapRange"); r.clamp = False
            r.inputs["From Min"].default_value = lo; r.inputs["From Max"].default_value = hi
            nt.links.new(sock, r.inputs["Value"]); return r.outputs[0]
        u = remap(so.outputs["X"], -PRINT_W / 2, PRINT_W / 2)
        v = remap(so.outputs["Z"], PRINT_Z - PRINT_H / 2, PRINT_Z + PRINT_H / 2)
        uv = nt.nodes.new("ShaderNodeCombineXYZ")
        nt.links.new(u, uv.inputs[0]); nt.links.new(v, uv.inputs[1])
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(print_png)
        tex.extension = "CLIP"; tex.interpolation = "Cubic"
        nt.links.new(uv.outputs[0], tex.inputs["Vector"])
        front = nt.nodes.new("ShaderNodeMath"); front.operation = "LESS_THAN"
        front.inputs[1].default_value = -0.03
        nt.links.new(so.outputs["Y"], front.inputs[0])
        fac = nt.nodes.new("ShaderNodeMath"); fac.operation = "MULTIPLY"
        nt.links.new(tex.outputs["Alpha"], fac.inputs[0]); nt.links.new(front.outputs[0], fac.inputs[1])
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
        nt.links.new(fac.outputs[0], mix.inputs[0])
        nt.links.new(colour, mix.inputs[6]); nt.links.new(tex.outputs["Color"], mix.inputs[7])
        colour = mix.outputs[2]
    nt.links.new(colour, b.inputs["Base Color"])
    noise_bump(m, 160, 0.05)
    return m
M["shirt"] = shirt_mat()
M["shirtdark"] = mat("ShirtDark", (0.012, 0.02, 0.05), 0.6)
M["skin"] = mat("Skin", (0.62, 0.4, 0.29), 0.48)
M["skin"].node_tree.nodes["Principled BSDF"].inputs["Subsurface Weight"].default_value = 0.15
M["hair"] = mat("Hair", (0.02, 0.015, 0.012), 0.45)
M["eye"] = mat("Eye", (0.02, 0.02, 0.02), 0.1, coat=1.0)
M["belt"] = noise_bump(mat("Belt", (0.035, 0.025, 0.02), 0.4), 80, 0.1)
M["silver"] = mat("Silver", (0.85, 0.86, 0.88), 0.16, 1.0)
M["shoe_dark"] = mat("ShoeDark", (0.05, 0.05, 0.055), 0.35, coat=0.6)
M["shoe_white"] = mat("ShoeWhite", (0.85, 0.85, 0.84), 0.45)
M["watch"] = mat("Watch", (0.03, 0.03, 0.03), 0.3, 0.6)
M["gunmetal"] = mat("Gunmetal", (0.06, 0.065, 0.07), 0.3, 0.85)
M["holster"] = noise_bump(mat("Holster", (0.03, 0.025, 0.022), 0.5), 60, 0.1)


def pants_mat():
    """Stone chinos with an animatable X-ray fade (0 = cloth, 1 = ghost)."""
    m = mat("Pants", (0.5, 0.45, 0.36), 0.75)
    noise_bump(m, 120, 0.06)
    nt = m.node_tree; out = nt.nodes["Material Output"]; b = nt.nodes["Principled BSDF"]
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    rim = nt.nodes.new("ShaderNodeEmission"); rim.inputs["Color"].default_value = (0.3, 0.7, 1.0, 1)
    rim.inputs["Strength"].default_value = 0.9
    fres = nt.nodes.new("ShaderNodeLayerWeight"); fres.inputs[0].default_value = 0.5
    pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 3.0
    nt.links.new(fres.outputs["Facing"], pw.inputs[0])
    ghost = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(pw.outputs[0], ghost.inputs[0])
    nt.links.new(tr.outputs[0], ghost.inputs[1]); nt.links.new(rim.outputs[0], ghost.inputs[2])
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.0
    nt.links.new(b.outputs[0], mix.inputs[1]); nt.links.new(ghost.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m, mix.inputs[0]
M["pants"], PANTS_XRAY = pants_mat()


def pillar_mat():
    """Gate panel shell: brushed aluminium <-> see-through cutaway (fresnel rim)."""
    m = mat("Pillar", (0.62, 0.64, 0.67), 0.3, 1.0, aniso=0.6)
    nt = m.node_tree; out = nt.nodes["Material Output"]; metal = nt.nodes["Principled BSDF"]
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    rim = nt.nodes.new("ShaderNodeEmission"); rim.inputs["Color"].default_value = (0.6, 0.8, 1.0, 1)
    rim.inputs["Strength"].default_value = 0.7
    fres = nt.nodes.new("ShaderNodeLayerWeight"); fres.inputs[0].default_value = 0.2
    ghost = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(fres.outputs["Facing"], ghost.inputs[0])
    nt.links.new(tr.outputs[0], ghost.inputs[1]); nt.links.new(rim.outputs[0], ghost.inputs[2])
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.0
    nt.links.new(metal.outputs[0], mix.inputs[1]); nt.links.new(ghost.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m, mix.inputs[0]
M["pillar"], PILLAR_GHOST = pillar_mat()

M["txcoil"], TX_STR, _ = emit_mat("TXCoil", CYAN, 1.5)
M["txpulse"], TXP_STR, _ = emit_mat("TXPulse", (0.7, 0.95, 1.0), 12.0)


def rx_mat():
    """Receiver coil: copper wire that lights amber when the metal's field reaches it."""
    m = mat("RXCoil", (0.75, 0.42, 0.25), 0.3, 1.0)
    nt = m.node_tree; out = nt.nodes["Material Output"]; b = nt.nodes["Principled BSDF"]
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*AMBER, 1)
    em.inputs["Strength"].default_value = 6.0
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.0
    nt.links.new(b.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m, mix.inputs[0]
M["rxcoil"], RX_GLOW = rx_mat()
M["sigpulse"], SIG_STR, _ = emit_mat("SignalPulse", AMBER, 14.0)
M["arrow_field"], _, _ = emit_mat("ArrowField", (0.5, 0.9, 1.0), 6.0)
M["eddy"], EDDY_STR, _ = emit_mat("Eddy", AMBER, 5.0)
M["arrow_eddy"], _, _ = emit_mat("ArrowEddy", (1.0, 0.75, 0.3), 7.0)
M["mfield"], MFIELD_STR, _ = emit_mat("MacroField", CYAN, 2.5)
M["sec"], SEC_STR, _ = emit_mat("SecondaryField", ROSE, 3.0)
M["arrow_sec"], _, _ = emit_mat("ArrowSecondary", (1.0, 0.55, 0.75), 6.0)
M["gauge"], GAUGE_STR, _ = emit_mat("Gauge", (0.85, 0.93, 1.0), 5.0)
M["brass"] = noise_bump(mat("Brass", (0.95, 0.68, 0.3), 0.27, 1.0), 220, 0.06)
M["brassdark"] = mat("BrassDeep", (0.62, 0.42, 0.16), 0.35, 1.0)
M["steel"] = noise_bump(mat("CoinSteel", (0.78, 0.79, 0.8), 0.25, 1.0), 260, 0.06)
M["steeldark"] = mat("CoinSteelDeep", (0.5, 0.51, 0.53), 0.3, 1.0)
M["backdrop"] = noise_bump(mat("Backdrop", (0.035, 0.04, 0.05), 0.75), 3, 0.02, ((0.025, 0.03, 0.04), (0.05, 0.055, 0.07)))


def zone_led_mat(name, color):
    m = mat(name, tuple(c * 0.15 for c in color), 0.15, emit=color, estr=0.2, coat=1.0)
    return m, m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]


# --------------------------------------------------------------------------- #
# Fonts + generated textures (ID card, overhead sign)
FONT_DIR = "/usr/share/fonts/opentype/inter"
DEVA = "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf"


def load_font(fn):
    p = os.path.join(FONT_DIR, fn)
    return bpy.data.fonts.load(p) if os.path.exists(p) else None
F_BOLD = load_font("Inter-ExtraBold.otf") or load_font("Inter-Bold.otf")
F_SEMI = load_font("Inter-SemiBold.otf")


def pil_font(path, s):
    from PIL import ImageFont
    try:
        return ImageFont.truetype(path, s)
    except Exception:
        return ImageFont.load_default()


# Chest print: width and centre height in the torso mesh (its vertices keep standing height, z 1.02-1.48);
# the height follows the artwork's aspect ratio
PRINT_W, PRINT_Z = 0.26, 1.29
PRINT_H = PRINT_W * 0.5


def make_shirt_print(path):
    """The Just KnowIt logo (brain over wordmark) in white, as a transparent print."""
    global PRINT_H
    from PIL import Image
    img = brand.lockup(520, gap=0.2, stacked=True)
    pad = 24
    im = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0)); im.alpha_composite(img, (pad, pad))
    im.save(path)
    PRINT_H = PRINT_W * im.height / im.width


def make_id_card(path):
    from PIL import Image, ImageDraw
    W, H = 1080, 1720
    im = Image.new("RGB", (W, H), (250, 250, 252)); d = ImageDraw.Draw(im)
    f = lambda n, s: pil_font(os.path.join(FONT_DIR, n), s)
    d.polygon([(0, 0), (W, 0), (W, 360), (0, 620)], fill=brand.RED)
    d.polygon([(0, 0), (W * 0.55, 0), (0, 420)], fill=(222, 34, 46))
    d.polygon([(W * 0.6, 0), (W, 0), (W, 220)], fill=brand.RED_DARK)
    d.polygon([(W, 1350), (W, H), (W * 0.35, H)], fill=brand.RED)
    d.polygon([(W, 1530), (W, H), (W * 0.7, H)], fill=brand.RED_DARK)
    im.paste(brand.lockup(110, gap=0.22), (60, 50), brand.lockup(110, gap=0.22))
    cx, cy, r = W // 2, 520, 220
    d.ellipse([cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14], fill=(255, 255, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(222, 226, 240))
    d.ellipse([cx - 95, cy - 150, cx + 95, cy + 60], fill=(170, 112, 82))
    d.chord([cx - 105, cy - 175, cx + 105, cy + 10], 180, 360, fill=(28, 20, 16))
    d.pieslice([cx - 190, cy + 70, cx + 190, cy + 420], 180, 360, fill=(14, 24, 56))
    d.text((cx, 840), "Bauni Natkaht", font=f("Inter-ExtraBold.otf", 92), fill=(20, 22, 30), anchor="mm")
    d.text((cx, 950), "AKA Cheater", font=f("Inter-ExtraBold.otf", 80), fill=(20, 22, 30), anchor="mm")
    d.text((cx, 1035), "Graphic Designer", font=f("Inter-Medium.otf", 50), fill=(120, 120, 128), anchor="mm")
    rows = [("ID NO", "JK-7741-028"), ("EMAIL", "bauni@mail.com"), ("PHONE", "98XXX 12345"), ("DATE", "01.08.2026")]
    for i, (k, v) in enumerate(rows):
        y = 1140 + i * 82
        d.text((170, y), k, font=f("Inter-Bold.otf", 44), fill=(20, 22, 30))
        d.text((420, y), ":   " + v, font=f("Inter-Regular.otf", 44), fill=(60, 60, 70))
    im.save(path)


def make_sign(path):
    from PIL import Image, ImageDraw
    W, H = 2400, 420
    im = Image.new("RGB", (W, H), (10, 12, 18)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 18], fill=(92, 52, 255)); d.rectangle([0, H - 18, W, H], fill=(92, 52, 255))
    d.text((W * 0.5, H / 2 + 6), "SECURITY CHECK", font=pil_font(os.path.join(FONT_DIR, "Inter-ExtraBold.otf"), 200),
           fill=(255, 214, 90), anchor="mm")
    im.save(path)


CARD_PNG = os.path.join(args.assets, "id_card.png"); make_id_card(CARD_PNG)
SIGN_PNG = os.path.join(args.assets, "sign.png"); make_sign(SIGN_PNG)
PRINT_PNG = os.path.join(args.assets, "shirt_print.png"); make_shirt_print(PRINT_PNG)
PLATE_PNG = os.path.join(args.assets, "plate_logo.png")
_pl = brand.lockup(200, gap=0.26); _pl.save(PLATE_PNG); PLATE_ASPECT = _pl.height / _pl.width


def decal_mat(name, png, emit=0.0):
    """White artwork with alpha, for a decal plane in front of a surface."""
    m = mat(name, (1, 1, 1), 0.4)
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(png); t.interpolation = "Cubic"
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"]); nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    if emit:
        nt.links.new(t.outputs["Color"], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = emit
    return m
M["plateart"] = decal_mat("PlateArt", PLATE_PNG, emit=0.6)
M["shirtprint"] = shirt_mat("ShirtPrint", PRINT_PNG)


def image_mat(name, png, emit=0.0, rough=0.35, coat=0.0):
    m = mat(name, (1, 1, 1), rough, coat=coat)
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(png)
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    if emit:
        nt.links.new(t.outputs["Color"], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = emit
    return m
M["card"] = image_mat("IDCard", CARD_PNG, coat=0.7)
M["sign"] = image_mat("Sign", SIGN_PNG, emit=3.0)

# --------------------------------------------------------------------------- #
# Environment: dusk airport security lane
world = bpy.data.worlds.new("World"); scn.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.03, 0.045, 0.08, 1); bg.inputs[1].default_value = 1.0

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 4, 0)); fl = bpy.context.object; fl.name = "Floor"
fl.data.materials.append(M["floor"])

WALL_Y = 7.0
box("WallLow", (30, 0.3, 0.9), (0, WALL_Y, 0.45), M["wall"])
box("WallTop", (30, 0.3, 1.0), (0, WALL_Y, 4.5), M["wall"])
for i, z in enumerate([0.9, 2.3, 3.6]):
    box(f"MullionH{i}", (30, 0.14, 0.08), (0, WALL_Y - 0.1, z), M["frame"])
for i in range(-13, 14):
    box(f"MullionV{i}", (0.08, 0.14, 3.2), (i * 1.6, WALL_Y - 0.1, 2.4), M["frame"])


def sky_mat():
    m = bpy.data.materials.new("DuskSky"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB"); e = ramp.color_ramp.elements
    e[0].position = 0.12; e[0].color = (1.0, 0.45, 0.16, 1)
    e[1].position = 0.75; e[1].color = (0.06, 0.12, 0.34, 1)
    mid = e.new(0.33); mid.color = (0.75, 0.32, 0.32, 1)
    nt.links.new(tc.outputs["Generated"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], em.inputs["Color"]); em.inputs["Strength"].default_value = 2.2
    nt.links.new(em.outputs[0], out.inputs[0])
    return m
box("SkyPanel", (40, 0.05, 6), (0, WALL_Y + 1.5, 2.6), sky_mat())
# distant runway lights in the dusk
for i in range(40):
    x = -18 + i * 0.9 + random.uniform(-0.2, 0.2)
    sphere(f"RunwayLight{i}", 0.04, (x, WALL_Y + 1.2, 1.05 + random.uniform(-0.05, 0.05)),
           emit_mat(f"RL{i}", (1.0, 0.8, 0.5) if i % 3 else (0.6, 0.8, 1.0), 25.0)[0], seg=8)
box("WallLeft", (0.3, 20, 5), (-7, 0, 2.5), M["wall"])
box("WallRight", (0.3, 20, 5), (7, 0, 2.5), M["wall"])
box("Ceiling", (16, 20, 0.1), (0, 0, 4.05), M["ceiling"])
for i, x in enumerate((-3.2, -1.1, 1.1, 3.2)):
    box(f"Strip{i}", (0.1, 16, 0.03), (x, 0, 3.99), M["strip"])

# overhead lightbox sign behind the gate
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 3.2, 3.0), rotation=(math.pi / 2, 0, 0))
sg = bpy.context.object; sg.name = "Sign"; sg.scale = (2.6, 0.455, 1); sg.data.materials.append(M["sign"])
box("SignHousing", (2.66, 0.1, 0.5), (0, 3.26, 3.0), M["graphite"], 0.01)
for s in (-1, 1):
    cyl(f"SignRod{s}", 0.008, 0.8, (s * 1.1, 3.26, 3.6), M["chrome"])

# queue lane stanchions + straps
for s in (-1, 1):
    ys = [1.1, 2.3, 3.5, 4.7]
    for j, y in enumerate(ys):
        cyl(f"Post{s}_{j}", 0.025, 0.95, (s * 0.7, y, 0.475), M["chrome"])
        cyl(f"PostBase{s}_{j}", 0.15, 0.02, (s * 0.7, y, 0.01), M["chrome"])
        if j < len(ys) - 1:
            box(f"Strap{s}_{j}", (0.008, 1.2, 0.05), (s * 0.7, y + 0.6, 0.88), M["strap"])

# X-ray baggage scanner on the left
box("ScannerBody", (1.0, 2.6, 1.25), (-2.6, 0.9, 0.75), M["machine"], 0.04)
box("ScannerTunnel", (0.84, 2.7, 0.62), (-2.6, 0.9, 0.62), M["rubber"], 0.01)
box("ScannerStripe", (1.01, 2.62, 0.06), (-2.6, 0.9, 1.25), M["brand"], 0.005)
for k in range(14):
    box(f"Curtain{k}", (0.055, 0.004, 0.55), (-2.95 + k * 0.054, -0.39, 0.66), M["curtain"])
box("Conveyor", (0.8, 2.0, 0.06), (-2.6, -1.4, 0.72), M["rubber"], 0.01)
box("ConveyorFrame", (0.86, 2.0, 0.6), (-2.6, -1.4, 0.4), M["machine"], 0.02)
box("Tray", (0.5, 0.36, 0.08), (-2.6, -1.6, 0.79), mat("Tray", (0.25, 0.27, 0.3), 0.5), 0.02)
cyl("Bag", 0.13, 0.42, (-2.6, -1.1, 0.88), mat("Bag", (0.3, 0.05, 0.05), 0.6), rot=(math.pi / 2, 0, 0))


def area(name, loc, rot, size, energy, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, "AREA"); d.size = size; d.energy = energy; d.color = color
    ob = bpy.data.objects.new(name, d); ob.location = loc; ob.rotation_euler = rot; link(ob)
    return ob


sun_d = bpy.data.lights.new("DuskSun", "SUN"); sun_d.energy = 3.2; sun_d.angle = math.radians(3); sun_d.color = (1.0, 0.62, 0.36)
sun = bpy.data.objects.new("DuskSun", sun_d); sun.rotation_euler = (math.radians(72), 0, math.radians(195)); link(sun)
area("KeyFront", (-2.4, -3.6, 3.2), (math.radians(55), 0, math.radians(-33)), 3.0, 330, (1.0, 0.93, 0.85))
area("FillCool", (2.8, -2.6, 1.6), (math.radians(72), 0, math.radians(48)), 3.0, 80, (0.7, 0.82, 1.0))
area("TopGate", (0, -0.5, 3.7), (0, 0, 0), 1.4, 110, (1.0, 0.95, 0.9))

# --------------------------------------------------------------------------- #
# Walk-through gate. Panels at x = +-PX; opening faces -Y. Left panel = transmitter, right = receiver.
gate = empty("Gate")
PX = 0.47
for s in (-1, 1):
    box(f"Pillar{'L' if s < 0 else 'R'}", (0.12, 0.5, 2.1), (s * PX, 0, 1.05), M["pillar"], 0.012, gate)
    box(f"Foot{s}", (0.16, 0.56, 0.03), (s * PX, 0, 0.015), M["graphite"], 0.006, gate)
    box(f"EdgeTrim{s}", (0.126, 0.03, 2.1), (s * PX, -0.245, 1.05), M["graphite"], 0.006, gate)
box("Crossbar", (1.08, 0.55, 0.18), (0, 0, 2.19), M["graphite"], 0.012, gate)


def rr_point(u, hw, hh, r):
    """Point on a rounded rectangle (half sizes hw x hh, corner r) at perimeter fraction u."""
    sw, sh, arc = 2 * (hw - r), 2 * (hh - r), math.pi * r / 2
    segs = [sw, arc, sh, arc, sw, arc, sh, arc]
    d = (u % 1.0) * sum(segs)
    for i, L in enumerate(segs):
        if d <= L or i == 7:
            t = d / L if L else 0
            break
        d -= L
    if i == 0: return (-hw + r + t * sw, -hh)
    if i == 2: return (hw, -hh + r + t * sh)
    if i == 4: return (hw - r - t * sw, hh)
    if i == 6: return (-hw, hh - r - t * sh)
    cx, cy, a0 = {1: (hw - r, -hh + r, -math.pi / 2), 3: (hw - r, hh - r, 0),
                  5: (-hw + r, hh - r, math.pi / 2), 7: (-hw + r, -hh + r, math.pi)}[i]
    a = a0 + t * math.pi / 2
    return (cx + r * math.cos(a), cy + r * math.sin(a))


def flat_coil(name, x, turns, mat_, bevel, zc=1.08, hw=0.19, hh=0.9, step=0.016):
    pts = []
    n = int(turns * 260)
    for i in range(n + 1):
        t = i / 260
        inset = t * step
        y, z = rr_point(t, hw - inset, hh - inset, 0.07)
        pts.append((x + 0.004 * math.sin(t * 2 * math.pi), y, zc + z))
    return poly_curve(name, pts, mat_, bevel, parent=gate), pts


TX, TX_PTS = flat_coil("TXCoil", -PX, 6, M["txcoil"], 0.0042)
TXP, _ = flat_coil("TXCoilPulse", -PX, 6, M["txpulse"], 0.0062)
RX, RX_PTS = flat_coil("RXCoil", PX, 6, M["rxcoil"], 0.0042)
# signal cable from the receiver coil up to the control unit
CABLE_PTS = [(PX, -0.05, 1.0), (PX, -0.05, 2.06), (PX - 0.05, -0.1, 2.2), (0.36, -0.14, 2.31)]
cable = poly_curve("RXCable", CABLE_PTS, M["graphite"], 0.006, parent=gate)
sigp = poly_curve("RXCablePulse", CABLE_PTS, M["sigpulse"], 0.009, parent=gate)

# zone LED strips on the front edge of both panels (8 zones, bottom to top), shared material per zone
ZONE_Z = [0.3 + k * 0.235 for k in range(8)]
ZONE = []
for k, z in enumerate(ZONE_Z):
    m_, s_ = zone_led_mat(f"ZoneLED{k}", (1.0, 0.08, 0.03))
    ZONE.append(s_)
    for s in (-1, 1):
        box(f"Zone{s}_{k}", (0.03, 0.008, 0.16), (s * PX, -0.262, z), m_, 0.003, gate)

# control unit on the crossbar: screen with signal trace, strength bar, alarm button
box("UnitHousing", (0.5, 0.14, 0.16), (0.2, -0.13, 2.36), M["graphite"], 0.012, gate)
box("Screen", (0.27, 0.01, 0.095), (0.12, -0.203, 2.375), M["screen"], 0.004, gate)
NTR = 72
TRACE_X = [0.0 + i * 0.24 / (NTR - 1) for i in range(NTR)]
trace = poly_curve("Trace", [(x, -0.2095, 2.375) for x in TRACE_X], M["trace"], 0.0011, parent=gate)
BARS = []
for i in range(10):
    col = (0.1, 1.0, 0.35) if i < 4 else ((1.0, 0.6, 0.05) if i < 7 else (1.0, 0.06, 0.03))
    m_, s_ = zone_led_mat(f"Bar{i}", col)
    box(f"Bar{i}", (0.02, 0.006, 0.014), (0.006 + i * 0.0253, -0.205, 2.302), m_, 0.002, gate)
    BARS.append(s_)
cyl("ButtonRing", 0.042, 0.02, (0.355, -0.2, 2.36), M["silver"], rot=(math.pi / 2, 0, 0), parent=gate)
red = sphere("RedButton", 0.034, (0.355, -0.212, 2.36), M["redbtn"], scale=(1, 0.55, 1), parent=gate)
# brand plate
box("LogoPlate", (0.4, 0.025, 0.11), (-0.33, -0.22, 2.335), M["brandplate"], 0.008, gate)
bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.33, -0.2335, 2.335), rotation=(math.pi / 2, 0, 0))
lp = bpy.context.object; lp.name = "LogoArt"
lp.scale = (0.34, 0.34 * PLATE_ASPECT, 1); lp.data.materials.append(M["plateart"]); setp(lp, gate)

# --------------------------------------------------------------------------- #
# Character (stylised, built from primitives). Faces -Y; his right is -X.
root = empty("Person")
hips = empty("Hips", (0, 0, 0.95), root)
box("Pelvis", (0.36, 0.22, 0.2), (0, 0, 0.93), M["pants"], 0.06, hips)
bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=0.46, location=(0, 0, 1.25), vertices=48)
torso = bpy.context.object; torso.name = "Torso"
torso.scale = (1.05, 0.62, 1); bpy.ops.object.transform_apply(scale=True)
for v in torso.data.vertices:
    t = (v.co.z - 1.02) / 0.46
    f = 0.9 + 0.18 * math.sin(min(max(t, 0), 1) * math.pi * 0.8)
    v.co.x *= f; v.co.y *= 0.95 + 0.1 * t
smooth(torso, 0.04, 4, 1); torso.data.materials.append(M["shirtprint"]); setp(torso, hips)
cyl("Collar", 0.075, 0.05, (0, -0.005, 1.5), M["shirtdark"], parent=hips)
cyl("Neck", 0.055, 0.12, (0, 0, 1.55), M["skin"], parent=hips)
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
box("Mouth", (0.032, 0.006, 0.005), (0, -0.1, 1.635), M["hair"], 0.002, head)


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
    cyl(f"Thigh{side}", 0.088, 0.46, (side * 0.095, 0, 0.66), M["pants"], parent=hp, r2=0.072, caps=False)
    kn = empty(f"Knee{side}", (side * 0.095, 0, 0.44), hp)
    cyl(f"Shin{side}", 0.072, 0.4, (side * 0.095, 0, 0.25), M["pants"], parent=kn, r2=0.066, caps=False)
    box(f"ShoeToe{side}", (0.1, 0.17, 0.07), (side * 0.095, -0.07, 0.04), M["shoe_white"], 0.03, kn)
    box(f"ShoeHeel{side}", (0.1, 0.12, 0.08), (side * 0.095, 0.04, 0.045), M["shoe_dark"], 0.03, kn)
    box(f"ShoeCap{side}", (0.096, 0.07, 0.065), (side * 0.095, -0.13, 0.04), M["shoe_dark"], 0.03, kn)
    return hp, kn
R_HIP, R_KN = leg(-1)
L_HIP, L_KN = leg(1)

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
seam = mat("Seam", (0.42, 0.38, 0.3), 0.8)
poly_curve("Fly", [(0.012, -0.112, 0.98), (0.014, -0.112, 0.88), (0.0, -0.11, 0.84)], seam, 0.0025, parent=hips)
for s in (-1, 1):
    pts = [(s * (0.08 + 0.06 * t), -0.112 + 0.03 * t * t, 0.975 - 0.13 * math.sin(t * math.pi / 2)) for t in [i / 12 for i in range(13)]]
    poly_curve(f"Pocket{s}", pts, seam, 0.0025, parent=hips)
gun = empty("Gun", (0.15, -0.115, 0.95), hips)
box("Holster", (0.05, 0.03, 0.13), (0.15, -0.122, 0.93), M["holster"], 0.01, gun)
box("Grip", (0.035, 0.028, 0.08), (0.157, -0.128, 1.02), M["gunmetal"], 0.008, gun, rot=(0, math.radians(-12), 0))
box("Slide", (0.075, 0.03, 0.03), (0.165, -0.128, 0.995), M["gunmetal"], 0.006, gun)
bpy.ops.mesh.primitive_torus_add(major_radius=0.016, minor_radius=0.004, location=(0.15, -0.128, 0.975), rotation=(math.pi / 2, 0, 0))
tg = bpy.context.object; tg.name = "TriggerGuard"; smooth(tg); tg.data.materials.append(M["gunmetal"]); setp(tg, gun)
for i in range(5):
    box(f"GripLine{i}", (0.03, 0.004, 0.003), (0.159, -0.143, 1.0 + i * 0.012), M["ink"], 0, gun)


# --------------------------------------------------------------------------- #
# Rs 10 bimetallic coins + ID card (tiny copy in his right front pocket, big copy on the macro set)
def coin(name, r, loc, rot, parent=None, detail=True):
    c = empty(name, loc, parent); c.rotation_euler = rot
    ring = cyl(name + "Ring", r, r * 0.13, (0, 0, 0), M["steel"], verts=96); smooth(ring, r * 0.025, 3); ring.parent = c
    core = cyl(name + "Core", r * 0.66, r * 0.136, (0, 0, 0), M["brass"], verts=96); core.parent = c
    for s in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_radius=r * 0.95, minor_radius=r * 0.022, location=(0, 0, s * r * 0.065),
                                         major_segments=96, minor_segments=8)
        rim = bpy.context.object; rim.name = name + f"Rim{s}"; smooth(rim); rim.data.materials.append(M["steeldark"]); rim.parent = c
    if detail:
        for i in range(40):
            a = i / 40 * 2 * math.pi
            d = box(name + f"Ray{i}", (r * 0.13, r * 0.018, r * 0.012), (r * 0.82 * math.cos(a), r * 0.82 * math.sin(a), r * 0.066),
                    M["steeldark"], 0, rot=(0, 0, a))
            d.parent = c
    g = text(name + "Rs", "₹", r * 0.62, (0, r * 0.14, r * 0.068), M["brassdark"], rot=(0, 0, 0), font=F_BOLD, extrude=r * 0.012)
    g.parent = c
    n = text(name + "10", "10", r * 0.3, (0, -r * 0.33, r * 0.068), M["brassdark"], rot=(0, 0, 0), font=F_BOLD, extrude=r * 0.01)
    n.parent = c
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
pc1 = coin("PCoinA", 0.02, (0, 0, 0), (math.radians(80), 0, math.radians(5)), detail=False)
pc1.parent = pocket; pc1.location = (0.012, -0.016, 0.018)
pc2 = coin("PCoinB", 0.02, (0, 0, 0), (math.radians(80), 0, math.radians(-10)), detail=False)
pc2.parent = pocket; pc2.location = (-0.008, -0.012, -0.02)
pcard = id_card("PCard", 0.035, (0, 0, 0), (math.radians(85), 0, math.radians(8)))
pcard.parent = pocket; pcard.location = (-0.004, 0.006, -0.004)

MAC = Vector((60, 0, 0))
bpy.ops.mesh.primitive_plane_add(size=12, location=MAC + Vector((0, 0, -0.02)))
bd = bpy.context.object; bd.name = "MacroBackdrop"; bd.data.materials.append(M["backdrop"])
macro_coinA = coin("CoinA", 0.2, MAC + Vector((-0.05, 0.22, 0.026)), (0, 0, math.radians(8)))
macro_coinB = coin("CoinB", 0.2, MAC + Vector((0.36, -0.08, 0.05)), (math.radians(-8), math.radians(10), math.radians(30)))
macro_card = id_card("Card", 0.36, MAC + Vector((-0.1, -0.4, 0.09)), (math.radians(4), math.radians(-3), math.radians(-14)))
area("MacroKey", MAC + Vector((-1.2, -1.0, 2.2)), (math.radians(35), math.radians(-30), 0), 2.0, 170, (1, 0.95, 0.88))
area("MacroRim", MAC + Vector((1.5, 1.4, 1.0)), (math.radians(-55), math.radians(45), 0), 1.5, 150, (0.6, 0.75, 1.0))
area("MacroTop", MAC + Vector((0, 0.1, 2.6)), (0, 0, 0), 3.0, 40, (0.8, 0.85, 1.0))
COIN_TOP = macro_coinA.location + Vector((0, 0, 0.2 * 0.068))

# --------------------------------------------------------------------------- #
# Background people (static, always out of focus): queue + guard
def figure(name, loc, yaw, shirt, pants_c, height=1.0, cap=False):
    """Simple background person; parts are built at the origin and parented in local space."""
    g = empty(name, loc); g.rotation_euler = (0, 0, yaw)
    ms, mp = mat(name + "Top", shirt, 0.7), mat(name + "Bottom", pants_c, 0.75)
    h = height
    def own(ob):
        ob.parent = g
        return ob
    b = own(cyl(name + "Body", 0.17, 0.62 * h, (0, 0, 1.22 * h), ms)); smooth(b, 0.06, 3); b.scale = (1, 0.65, 1)
    own(sphere(name + "Head", 0.1, (0, 0, 1.68 * h), M["skin"], (0.95, 1.0, 1.15)))
    own(sphere(name + "Hair", 0.104, (0, 0.01, 1.72 * h), M["hair"], (0.98, 1.04, 0.8)))
    for s in (-1, 1):
        own(cyl(name + f"Leg{s}", 0.075, 0.88 * h, (s * 0.09, 0, 0.45 * h), mp))
        own(cyl(name + f"Arm{s}", 0.045, 0.6 * h, (s * 0.21, 0, 1.18 * h), ms, rot=(0, s * 0.08, 0)))
    if cap:
        own(cyl(name + "Cap", 0.105, 0.05, (0, 0, 1.79 * h), mat(name + "CapM", (0.02, 0.03, 0.06), 0.5)))
        own(box(name + "Badge", (0.05, 0.01, 0.06), (0.08, -0.115, 1.35 * h), M["silver"], 0.005))
    return g


Q = [figure("Queue1", (0.12, 3.0, 0), 0.05, (0.45, 0.12, 0.08), (0.12, 0.13, 0.16), 0.97),
     figure("Queue2", (-0.18, 4.0, 0), -0.1, (0.15, 0.32, 0.3), (0.3, 0.27, 0.22), 1.03),
     figure("Queue3", (0.2, 5.0, 0), 0.2, (0.55, 0.5, 0.45), (0.08, 0.08, 0.1), 0.95)]
GUARD = figure("Guard", (-1.3, 0.95, 0), 1.107, (0.03, 0.05, 0.1), (0.03, 0.04, 0.08), 1.02, cap=True)

# Label anchors (screen positions exported by anchors.py; drawn by post.py)
LBL = {}
for nm, loc, par in (("TX", (-PX + 0.07, -0.18, 1.45), gate), ("RX", (PX - 0.07, -0.18, 1.45), gate),
                     ("FIELD", (0.0, -0.35, 1.62), None), ("POCKET", (-0.1, -0.1, 0.83), None),
                     ("SCREEN", (0.12, -0.21, 2.375), gate), ("BAR", (0.12, -0.21, 2.302), gate),
                     ("ZONE", (PX, -0.27, ZONE_Z[3]), gate), ("CABLE", (PX, -0.06, 1.9), gate),
                     ("METAL", tuple(macro_coinA.location + Vector((0.0, -0.05, 0.03))), None),
                     ("EDDY", tuple(COIN_TOP + Vector((0.13, -0.06, 0.0))), None),
                     ("SEC", tuple(COIN_TOP + Vector((0.18, 0.0, 0.2))), None),
                     ("GAUGE", tuple(COIN_TOP + Vector((0.0, -0.02, 0.03))), None)):
    LBL[nm] = empty("LBL_" + nm, loc, par)
setp(LBL["POCKET"], pocket)

# --------------------------------------------------------------------------- #
# Person animation
interp("LINEAR")
HIDE = (0, 0, -40)
JOINTS = (R_HIP, L_HIP, R_KN, L_KN, R_SH, L_SH, R_EL, L_EL, head, hips)


def pose(f, loc, yaw, hipsrot=(0, 0, 0), headrot=(0, 0, 0), legs=(0, 0, 0, 0), arms=(0, 0), elbows=(-0.12, -0.12)):
    root.location = loc; root.keyframe_insert("location", frame=f)
    root.rotation_euler = (0, 0, yaw); root.keyframe_insert("rotation_euler", frame=f)
    hips.rotation_euler = hipsrot; hips.keyframe_insert("rotation_euler", frame=f)
    head.rotation_euler = headrot; head.keyframe_insert("rotation_euler", frame=f)
    for j, a in zip((R_HIP, L_HIP, R_KN, L_KN), legs):
        j.rotation_euler = (a, 0, 0); j.keyframe_insert("rotation_euler", frame=f)
    for j, a in zip((R_SH, L_SH), arms):
        j.rotation_euler = (a, 0, 0); j.keyframe_insert("rotation_euler", frame=f)
    for j, a in zip((R_EL, L_EL), elbows):
        j.rotation_euler = (a, 0, 0); j.keyframe_insert("rotation_euler", frame=f)


def walk(f0, f1, p0, p1, cadence=1.9):
    """Walk cycle with eased start/stop, hip sway, counter-swinging arms and head stabilisation."""
    interp("LINEAR")
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0; yaw = math.atan2(-d.x, d.y) + math.pi
    yaw = (yaw + math.pi) % (2 * math.pi) - math.pi
    frames = list(range(f0, f1, 2)) + [f1]
    for f in frames:
        t = (f - f0) / (f1 - f0)
        te = 0.75 * t + 0.25 * t * t * (3 - 2 * t)
        pos = p0.lerp(p1, te)
        ph = (f - f0) / FPS * cadence * math.pi
        amp = min(1.0, (f - f0) / 10, (f1 - f) / 10)
        s = math.sin(ph) * amp
        bob = (abs(math.cos(ph)) * 0.03 - 0.012) * amp
        pose(f, (pos.x, pos.y, bob), yaw + 0.04 * s, hipsrot=(0.03 * amp, 0.035 * s, -0.05 * s),
             headrot=(0, 0, 0.045 * s),
             legs=(s * 0.45, -s * 0.45, 0.08 * amp + max(0, -s) * 0.65, 0.08 * amp + max(0, s) * 0.65),
             arms=(-s * 0.36, s * 0.36),
             elbows=(-0.18 - 0.22 * max(0, s) * amp, -0.18 - 0.22 * max(0, -s) * amp))


def stand(f, pos=(0, 0), headrot=(0, 0, 0)):
    interp("LINEAR")
    pose(f, (pos[0], pos[1], 0), 0, headrot=headrot)


def hide(f0, f1):
    """Hidden (moved far below the floor) on frames f0..f1, with constant keys so motion blur never streaks."""
    interp("CONSTANT")
    root.location = HIDE; root.keyframe_insert("location", frame=f0); root.keyframe_insert("location", frame=f1)


def hold_constant(f):
    """Make the segment that starts at frame f constant (for a jump cut)."""
    interp("CONSTANT")
    root.keyframe_insert("location", frame=f)


# hook: walks through the gate (0-56), hidden for the panel shot
walk(0, 56, (0, 1.25), (0, -1.05), 2.05)
hold_constant(56); hide(57, 89)
# S1: walks in, looks up at the beep, stands
walk(90, 146, (0, 2.0), (0, 0), 1.9)
stand(150)
interp("BEZIER")
for f, hr in ((132, (0, 0, 0)), (142, (-0.28, 0, 0.12)), (160, (-0.28, 0, 0.12)), (172, (0, 0, 0))):
    head.rotation_euler = hr; head.keyframe_insert("rotation_euler", frame=f)
stand(335)
hold_constant(335); hide(336, 700)
walk(701, 754, (0, 1.75), (0, 0), 1.9)
stand(760)
interp("BEZIER")
for f, hr in ((1040, (0, 0, 0)), (1050, (-0.22, 0, -0.1)), (1080, (-0.22, 0, -0.1)), (1100, (0, 0, 0))):
    head.rotation_euler = hr; head.keyframe_insert("rotation_euler", frame=f)
stand(END)

# X-ray: pants fade to a ghost (pocket contents show)
ramp_ranges(PANTS_XRAY, [(16, 26, 46, 54), (244, 253, 269, 271), (784, 800, 909, 911), (1138, 1146, 1172, 1175),
                         (1284, 1287, 1298, 1300)], 0.0, 1.0)

# Gate panels go see-through for the science part (S11 .. S21), solid again for the zone-LED shot
interp("BEZIER")
key_input(PILLAR_GHOST, [(0, 0.0), (C["S11"] + 10, 0.0), (C["S11"] + 40, 1.0)])
interp("CONSTANT")
key_input(PILLAR_GHOST, [(C["S22"] - 1, 1.0), (C["S22"], 0.0)])
for ob in (TX, TXP, RX, cable, sigp):
    visible(ob, [(C["S11"] + 8, C["S22"])])

# transmitter: steady glow + a current pulse running round the coil, repeating (pulse induction, slowed down)
interp("BEZIER")
key_input(TX_STR, [(0, 0.3), (C["S12"], 0.4), (C["S12"] + 20, 2.2)])
cu = TXP.data
for f in range(C["S12"] + 10, C["S22"], PULSE):
    interp("LINEAR"); key(cu, "bevel_factor_start", [(f, 0.0)]); key(cu, "bevel_factor_end", [(f, 0.04)])
    interp("CONSTANT"); key(cu, "bevel_factor_start", [(f + 20, 0.96)]); key(cu, "bevel_factor_end", [(f + 20, 1.0)])
# receiver: lights when the coin's own field reaches it, signal pulse runs up the cable to the unit
ramp_ranges(RX_GLOW, [(C["S19"] + 2, C["S19"] + 10, C["S21"] + 30, C["S22"])], 0.0, 1.0)
cu = sigp.data
interp("LINEAR")
for f in range(C["S19"] + 6, C["S21"] + 40, 14):
    key(cu, "bevel_factor_start", [(f, 0.0), (f + 12, 0.92)]); key(cu, "bevel_factor_end", [(f, 0.08), (f + 12, 1.0)])
key_input(SIG_STR, [(0, 0.0), (C["S19"] + 5, 0.0), (C["S19"] + 6, 14.0)])

# alarm button + zone LEDs + strength bar
blink_ranges(M["redbtn"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"],
             ALARM, 18.0, 0.8, 0.3, BLINK)
for k, s_ in enumerate(ZONE):
    if k in (2, 3):
        blink_ranges(s_, [(36, 90), (C["S20"], C["S23"]), (C["S28"], END)], 9.0, 2.5, 0.12, 10)
    else:
        key_input(s_, [(0, 0.12)])


def bar_level(f):
    if 36 <= f < 90: return 8
    if 137 <= f < 153: return 5
    if C["S20"] <= f < C["S21"]: return 8
    if C["S21"] <= f < C["S22"]: return 2 + min(7, int((f - C["S21"]) / 6))
    if f >= C["S28"]: return 9
    return 0
interp("CONSTANT")
for i, s_ in enumerate(BARS):
    seq, last = [], None
    for f in range(0, END):
        v = 7.0 if bar_level(f) > i else 0.12
        if v != last:
            seq.append((f, v)); last = v
    key_input(s_, seq)


# signal trace on the screen: calm baseline, spikes when metal is detected
def spike_amp(f):
    if 36 <= f < 90: return 1.0
    if C["S8"] + 30 <= f < C["S9"]: return 0.45
    if C["S10"] <= f < C["S11"]: return 0.25 + 0.55 * min(1, (f - C["S10"]) / 15)
    if C["S20"] <= f < C["S21"]: return 1.0
    if C["S21"] <= f < C["S22"]: return 0.35 + 0.65 * min(1, (f - C["S21"]) / 40)
    return 0.0
SCREEN_ON = [(57, 90), (C["S8"], C["S9"]), (C["S10"], C["S11"]), (C["S20"], C["S22"])]
interp("LINEAR")
pts = trace.data.splines[0].points
for a, b in SCREEN_ON:
    for f in list(range(a, b, 2)) + [b - 1]:
        A = spike_amp(f)
        for i, p in enumerate(pts):
            x = i / (NTR - 1)
            base = 0.004 * math.sin(x * 26 + f * 0.35) + 0.002 * math.sin(x * 61 - f * 0.6)
            # receive pulse: decaying ringing burst sweeping left -> right
            c0 = ((f * 0.022) % 1.25) - 0.1
            burst = A * 0.034 * math.exp(-((x - c0) / 0.07) ** 2) * math.sin((x - c0) * 70)
            p.co = (TRACE_X[i], -0.2095, 2.375 + base + burst, 1)
            p.keyframe_insert("co", frame=f)

# --------------------------------------------------------------------------- #
# Magnetic field of the transmitter coil (left panel): dipole-like loops that leave the coil's inner face,
# cross the walkway and close around the panel.
def clip_run(pts, ok):
    best, cur = [], []
    for p in pts:
        if ok(p):
            cur.append(p)
        else:
            if len(cur) > len(best): best = cur
            cur = []
    return cur if len(cur) > len(best) else best


def dipole_pts(center, L, phi, axis="X", n=150, r_min=0.07):
    th0 = math.asin(min(1.0, math.sqrt(r_min / L)))
    out = []
    for k in range(n + 1):
        th = th0 + (math.pi - 2 * th0) * k / n
        r = L * math.sin(th) ** 2
        a, rho = r * math.cos(th), r * math.sin(th)
        u, v = rho * math.cos(phi), rho * math.sin(phi)
        if axis == "X":
            out.append(Vector((center[0] + a, center[1] + u, center[2] + v)))
        else:
            out.append(Vector((center[0] + u, center[1] + v, center[2] + a)))
    return out


def field_mat():
    """Cyan field lines that turn amber and brighten near the metal in his pocket (keyed factor)."""
    m = bpy.data.materials.new("FieldLine"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.object = LBL["POCKET"]
    ln = nt.nodes.new("ShaderNodeVectorMath"); ln.operation = "LENGTH"
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.06; mr.inputs["From Max"].default_value = 0.42
    mr.inputs["To Min"].default_value = 1.0; mr.inputs["To Max"].default_value = 0.0
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = 0.0
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (*CYAN, 1); mix.inputs[7].default_value = (*AMBER, 1)   # colour A / B sockets
    strength = nt.nodes.new("ShaderNodeMath"); strength.operation = "MULTIPLY_ADD"
    strength.inputs[1].default_value = 0.8; strength.inputs[2].default_value = 1.6
    nt.links.new(tc.outputs["Object"], ln.inputs[0]); nt.links.new(ln.outputs["Value"], mr.inputs["Value"])
    nt.links.new(mr.outputs[0], mul.inputs[0]); nt.links.new(mul.outputs[0], mix.inputs[0])
    nt.links.new(mul.outputs[0], strength.inputs[0]); nt.links.new(strength.outputs[0], em.inputs["Strength"])
    nt.links.new(mix.outputs[2], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs[0])
    return m, mul.inputs[1], strength.inputs[2]
M["field"], FIELD_BEND, FIELD_BASE = field_mat()

POCKET_W = Vector((-0.1, -0.045, 0.83))   # pocket position while he stands in the gate
inside = lambda p: -1.75 < p.x < 1.25 and abs(p.y) < 1.05 and 0.03 < p.z < 2.55
FIELD = []
for zc in (0.6, 1.1, 1.6):
    for L in (1.05, 1.9):
        for phi in (0.0, math.pi, math.radians(35), math.radians(215)):
            run = clip_run(dipole_pts((-PX, 0, zc), L, phi), inside)
            if len(run) > 12:
                FIELD.append(run)
FIELD_ON = (C["S13"], C["S20"])
for i, run in enumerate(FIELD):
    ob = poly_curve(f"Field{i}", run, M["field"], 0.003)
    ob.shape_key_add(name="Basis", from_mix=False)
    kb = ob.shape_key_add(name="Bent", from_mix=False)
    for j, p in enumerate(run):   # pushed out of the metal's region (the metal changes the field)
        dv = p - POCKET_W; dist = max(dv.length, 1e-4)
        push = 0.13 * math.exp(-(dist / 0.24) ** 2)
        q = p + dv.normalized() * push
        kb.data[j].co = q
    interp("BEZIER")
    key(kb, "value", [(0, 0.0), (C["S15"] + 30, 0.0), (C["S15"] + 70, 1.0)])
    delay = (i * 7) % 24
    key(ob.data, "bevel_factor_end", [(0, 0.0), (FIELD_ON[0] + 6 + delay, 0.0), (FIELD_ON[0] + 40 + delay, 1.0)])
    visible(ob, [(FIELD_ON[0] + 6, FIELD_ON[1])])
    FIELD[i] = (ob, run)
interp("BEZIER")
key_input(FIELD_BEND, [(0, 0.0), (C["S15"] + 30, 0.0), (C["S15"] + 70, 1.0)])
# continuous field, pulsing gently in time with the transmitter pulses
interp("BEZIER")
seq = [(0, 1.6)]
for f in range(C["S12"] + 10, FIELD_ON[1], PULSE):
    seq += [(f + 10, 2.6), (f + 18, 1.4)]
key_input(FIELD_BASE, seq)


def arc_param(run):
    acc = [0.0]
    for a, b in zip(run, run[1:]):
        acc.append(acc[-1] + (b - a).length)
    return acc


def along(run, acc, s):
    s = s % acc[-1]
    lo, hi = 0, len(acc) - 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if acc[mid] <= s: lo = mid
        else: hi = mid
    t = (s - acc[lo]) / max(acc[hi] - acc[lo], 1e-6)
    p = run[lo].lerp(run[hi], t)
    return p, (run[hi] - run[lo]).normalized()


def arrows_along(prefix, runs, mat_, f_on, f_off, speed, size=0.016, every=2, phase_seed=3):
    rnd = random.Random(phase_seed)
    for i, run in enumerate(runs):
        acc = arc_param(run)
        bpy.ops.mesh.primitive_cone_add(radius1=size, radius2=0, depth=size * 2.6, vertices=12)
        a = bpy.context.object; a.name = f"{prefix}{i}"; a.data.materials.append(mat_)
        off = rnd.uniform(0, acc[-1]); prev = None
        interp("LINEAR")
        for f in list(range(f_on, f_off, every)) + [f_off]:
            p, tng = along(run, acc, off + (f - f_on) / FPS * speed)
            a.location = p
            e = tng.to_track_quat("Z", "Y").to_euler("XYZ", prev) if prev else tng.to_track_quat("Z", "Y").to_euler("XYZ")
            a.rotation_euler = e; prev = e
            a.keyframe_insert("location", frame=f); a.keyframe_insert("rotation_euler", frame=f)
        visible(a, [(f_on, f_off)])


arrows_along("FieldArrow", [r for _, r in FIELD[::2]], M["arrow_field"], FIELD_ON[0] + 40, FIELD_ON[1], 0.55)

# --------------------------------------------------------------------------- #
# Macro physics on coin A
# 1) primary field from the transmitter passing the coin (bulging round it: the eddy currents oppose it)
MF = []
cA = COIN_TOP
for k in range(14):
    a = k / 14 * 2 * math.pi; rr = 0.08 + 0.2 * ((k * 5) % 7) / 6
    run = []
    for j in range(80):
        z = 0.7 - j * 0.0095
        bulge = 1 + 0.35 * math.exp(-((z - 0.0) / 0.12) ** 2) * (0.3 / max(rr, 0.08))
        run.append(cA + Vector((rr * bulge * math.cos(a), rr * bulge * math.sin(a), z)))
    ob = poly_curve(f"MacroField{k}", run, M["mfield"], 0.0022)
    interp("BEZIER")
    key(ob.data, "bevel_factor_end", [(0, 0.0), (C["S16"] + 30, 0.0), (C["S17"] + 16, 1.0)])
    visible(ob, [(C["S16"] + 30, C["S18"])])
    MF.append(run)
arrows_along("MFArrow", MF[::2], M["arrow_field"], C["S17"] + 10, C["S18"], 0.22, 0.011)
interp("BEZIER")
seq = [(0, 2.5)]
for f in range(C["S12"] + 10 + ((C["S17"] - C["S12"] - 10) // PULSE) * PULSE, C["S18"], PULSE):
    seq += [(f + 10, 3.6), (f + 18, 1.8)]
key_input(MFIELD_STR, seq)

# 2) eddy currents: concentric loops in the coin face, all circulating the same way (Lenz)
EDDY_RUNS = []
for n in range(6):
    r0 = 0.03 + n * 0.026
    run = [cA + Vector((r0 * math.cos(t), r0 * math.sin(t), 0.004)) for t in [k / 120 * 2 * math.pi for k in range(121)]]
    ob = poly_curve(f"Eddy{n}", run, M["eddy"], 0.0024)
    interp("BEZIER")
    key(ob.data, "bevel_factor_end", [(0, 0.0), (C["S17"] + 20 + n * 5, 0.0), (C["S17"] + 44 + n * 5, 1.0)])
    visible(ob, [(C["S17"] + 20, C["S19"])])
    EDDY_RUNS.append(run)
arrows_along("EddyArrow", EDDY_RUNS + EDDY_RUNS[2:], M["arrow_eddy"], C["S17"] + 48, C["S19"], 0.12, 0.009, phase_seed=5)
interp("BEZIER")
seq = [(0, 3.0)]
for f in range(C["S12"] + 10 + ((C["S17"] - C["S12"]) // PULSE + 1) * PULSE, C["S19"], PULSE):   # induced current surges with each pulse, then decays
    seq += [(f + 10, 8.0), (f + 20, 2.5)]
key_input(EDDY_STR, seq)

# 3) the coin's own (secondary) field: arches out of the coin, opposing the primary
SEC = []
for phi in [k / 8 * 2 * math.pi for k in range(8)]:
    for L in (0.22, 0.38, 0.6):
        run = clip_run(dipole_pts((cA.x, cA.y, cA.z), L, phi, axis="Z", n=120, r_min=0.02), lambda p: p.z > cA.z - 0.004)
        if len(run) > 10:
            ob = poly_curve(f"Sec{len(SEC)}", run, M["sec"], 0.0026)
            interp("BEZIER")
            key(ob.data, "bevel_factor_end", [(0, 0.0), (C["S18"] + 2, 0.0), (C["S18"] + 20, 1.0)])
            visible(ob, [(C["S18"], C["S19"])])
            SEC.append(run)
arrows_along("SecArrow", SEC[::2], M["arrow_sec"], C["S18"] + 12, C["S19"], 0.3, 0.012)

# 4) gauge across coin A (size of the metal)
gauge = empty("Gauge", cA + Vector((0, -0.02, 0.03)))
gbar = cyl("GaugeBar", 0.0045, 1.0, (0, 0, 0), M["gauge"], rot=(0, math.pi / 2, 0)); gbar.parent = gauge; gbar.location = (0, 0, 0)
caps = []
for s in (-1, 1):
    cc = box(f"GaugeCap{s}", (0.006, 0.006, 0.05), (0, 0, 0), M["gauge"], 0)
    cc.parent = gauge; cc.rotation_euler = (math.pi / 2, 0, 0); caps.append((cc, s))
interp("BEZIER")
gauge.rotation_euler = (0, 0, math.radians(-6))
key(gbar, "scale", [(0, (1, 1, 0.001)), (C["S23"] + 12, (1, 1, 0.001)), (C["S23"] + 45, (1, 1, 0.42))])
for cc, s in caps:
    key(cc, "location", [(0, (0, 0, 0)), (C["S23"] + 12, (0, 0, 0)), (C["S23"] + 45, (s * 0.21, 0, 0))])
visible(gauge, [(C["S23"] + 10, C["S24"])])
for ch in gauge.children:
    visible(ch, [(C["S23"] + 10, C["S24"])])

# --------------------------------------------------------------------------- #
# Cameras: one per shot, bound to timeline markers. keys = [(frame, cam_loc, target_loc, lens), ...]
def camera(name, fstop):
    cd = bpy.data.cameras.new(name); cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24
    cd.clip_start = 0.01; cd.clip_end = 200
    cam = bpy.data.objects.new(name, cd); link(cam)
    tgt = empty(name + "_tgt")
    c = cam.constraints.new("TRACK_TO"); c.target = tgt; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    cd.dof.use_dof = True; cd.dof.focus_object = tgt; cd.dof.aperture_fstop = fstop
    return cam, tgt


def shot(name, keys, fstop=4.0, focus=None):
    cam, tgt = camera(name, fstop)
    interp("BEZIER")
    for f, c, t, lens in keys:
        cam.location = c; cam.keyframe_insert("location", frame=f)
        tgt.location = t; tgt.keyframe_insert("location", frame=f)
        cam.data.lens = lens; cam.data.keyframe_insert("lens", frame=f)
    if focus is not None:
        cam.data.dof.focus_object = focus
    mk = scn.timeline_markers.new(name, frame=keys[0][0]); mk.camera = cam
    return cam


M_ = lambda v: tuple(MAC + Vector(v))
P = (-0.1, -0.06, 0.85)       # pocket (standing in the gate)
cAt = tuple(cA)

shot("H1_hip", [(0, (-0.42, -1.15, 0.92), (-0.1, 1.15, 0.86), 38), (40, (-0.4, -2.0, 0.92), (-0.1, -0.35, 0.86), 38),
                (50, (-0.38, -2.3, 0.95), (-0.08, -0.85, 0.9), 38), (56, (-0.36, -2.45, 1.0), (0.4, -0.3, 2.9), 38)], 3.2)
shot("H2_panel", [(57, (0.62, -0.78, 1.95), (-0.25, -0.2, 2.05), 30), (63, (0.62, -0.74, 2.02), (0.24, -0.2, 2.36), 30),
                  (89, (0.48, -0.62, 2.22), (0.22, -0.2, 2.35), 32)], 6.0)
shot("S1_wide", [(90, (1.7, -5.4, 3.1), (0, 0.6, 1.0), 30), (163, (0.65, -3.7, 1.35), (0, 0, 1.12), 34)], 5.6)
shot("S2_orbit", [(164, (-1.35, -1.6, 1.45), (0, 0, 1.2), 35), (198, (-0.1, -2.05, 1.38), (0, 0, 1.18), 35),
                  (232, (1.15, -1.7, 1.3), (0, 0, 1.15), 35)], 3.5)
shot("S3_pocket", [(233, (-0.58, -1.05, 1.02), P, 42), (252, (-0.34, -0.62, 0.92), P, 46)], 2.8)
shot("S4_coin", [(253, (-0.3, -0.5, 0.93), P, 50), (270, (-0.22, -0.4, 0.88), P, 52)], 2.8)
shot("S5_gun", [(271, (0.47, -0.56, 1.03), (0.15, -0.12, 0.98), 50), (288, (0.31, -0.45, 1.0), (0.15, -0.12, 0.98), 52)], 2.8)
shot("S6_buckle", [(289, (-0.2, -0.46, 1.08), (0, -0.13, 1.0), 55), (311, (-0.08, -0.38, 1.03), (0, -0.13, 1.0), 58)], 2.8)
shot("S7_pullout", [(312, (0.0, -0.42, 1.02), (0, -0.13, 1.0), 58), (322, (0.0, -0.9, 1.08), (0, -0.1, 1.02), 48),
                    (335, (0.0, -4.2, 1.6), (0, 0, 1.2), 30)], 4.0)
shot("S8_unit", [(336, (-0.05, -0.64, 2.32), (0.1, -0.2, 2.36), 36), (397, (0.42, -0.6, 2.4), (0.24, -0.2, 2.35), 36)], 6.0)
shot("S9_macro", [(398, M_((0.32, -1.1, 1.0)), M_((0.05, -0.05, 0.05)), 40), (467, M_((0.1, -0.86, 0.76)), M_((0.02, 0.0, 0.05)), 40)], 4.0)
shot("S10_screen", [(468, (0.13, -0.44, 2.41), (0.12, -0.2, 2.37), 46), (506, (0.12, -0.37, 2.39), (0.12, -0.2, 2.37), 48)], 11.0)
shot("S11_gate", [(507, (0.05, -4.0, 1.3), (0, 0, 1.15), 30), (560, (-0.55, -1.85, 1.25), (-0.4, 0, 1.15), 30)], 4.5)
shot("S12_coils", [(561, (-2.3, -0.75, 1.18), (-0.47, 0.02, 1.1), 24), (584, (-2.05, -1.25, 1.22), (-0.47, 0.0, 1.1), 24),
                   (597, (0.0, -2.9, 1.3), (0.0, 0, 1.12), 24), (610, (2.05, -1.2, 1.2), (0.47, 0, 1.1), 24)], 5.6)
shot("S13_field", [(611, (0.0, -3.5, 1.3), (-0.05, 0, 1.15), 28), (700, (0.35, -2.65, 1.42), (0, 0, 1.15), 28)], 5.6)
shot("S14_walk", [(701, (-1.45, -2.65, 1.2), (0, 1.75, 1.0), 32), (752, (-0.95, -2.05, 1.15), (0, 0, 1.0), 32),
                  (760, (-0.92, -2.0, 1.15), (0, 0, 1.0), 32)], 4.0)
shot("S15_bend", [(761, (-0.95, -1.35, 1.02), P, 38), (872, (-0.52, -0.96, 0.93), P, 40)], 4.5)
shot("S16_dive", [(873, (-0.46, -0.76, 0.9), P, 40), (902, (-0.16, -0.22, 0.86), P, 40), (910, (-0.12, -0.15, 0.855), P, 40)], 3.0)
shot("S17_eddy", [(911, M_((-0.22, -0.48, 0.9)), M_((-0.05, 0.22, 0.03)), 40), (994, M_((-0.12, -0.42, 0.66)), M_((-0.05, 0.22, 0.03)), 42)], 5.0)
shot("S18_secondary", [(995, M_((-0.05, -1.25, 0.5)), M_((-0.05, 0.22, 0.18)), 32), (1024, M_((-0.05, -1.12, 0.58)), M_((-0.05, 0.22, 0.2)), 32)], 4.0)
shot("S19_rx", [(1025, (1.3, -1.05, 1.2), (0.47, 0, 1.15), 32), (1042, (1.12, -0.92, 1.45), (0.42, 0, 1.75), 32)], 4.0)
shot("S20_alarm", [(1043, (0.64, -0.88, 2.04), (0.28, -0.2, 2.35), 30), (1075, (0.5, -0.72, 2.16), (0.28, -0.2, 2.35), 32)], 6.0)
shot("S21_signal", [(1076, (0.13, -0.52, 2.43), (0.12, -0.2, 2.35), 38), (1128, (0.15, -0.45, 2.39), (0.12, -0.2, 2.34), 40)], 9.0)
shot("S22_zones", [(1129, (-0.45, -2.45, 1.05), (0, 0, 0.95), 22), (1174, (-0.15, -2.1, 1.0), (0, 0, 0.95), 22)], 4.0)
shot("S23_gauge", [(1175, M_((-0.05, -0.62, 0.95)), M_((-0.05, 0.22, 0.04)), 40), (1259, M_((-0.05, -0.52, 0.82)), M_((-0.05, 0.22, 0.04)), 40)], 5.0)
shot("S24_low", [(1260, (0.95, -3.0, 0.42), (0, 0, 1.2), 26), (1286, (0.62, -2.6, 0.52), (0, 0, 1.2), 26)], 5.6)
shot("S25_coin", [(1287, (-0.28, -0.5, 0.92), P, 50), (1299, (-0.24, -0.44, 0.9), P, 50)], 2.8)
shot("S26_belt", [(1300, (0.16, -0.44, 1.07), (0, -0.13, 1.0), 55), (1311, (0.1, -0.39, 1.04), (0, -0.13, 1.0), 56)], 2.8)
shot("S27_gun", [(1312, (0.43, -0.52, 1.05), (0.15, -0.12, 0.98), 50), (1351, (0.28, -0.42, 1.0), (0.15, -0.12, 0.98), 52)], 2.8)
shot("S28_final", [(1352, (0.3, -2.2, 1.1), (0, 0, 1.1), 32), (1416, (0.95, -4.7, 2.8), (0, 0, 1.3), 28)], 5.6)
scn.camera = bpy.data.objects["H1_hip"]
interp("BEZIER")

# --------------------------------------------------------------------------- #
# Render settings: Cycles CPU, denoised, AgX, motion blur. 720x1280 (upscaled to 1080x1920 in post).
r = scn.render
r.engine = "CYCLES"; scn.cycles.device = "CPU"
scn.cycles.samples = 12; scn.cycles.use_adaptive_sampling = True; scn.cycles.adaptive_threshold = 0.03
scn.cycles.use_denoising = True; scn.cycles.denoiser = "OPENIMAGEDENOISE"
scn.cycles.denoising_quality = "FAST"; scn.cycles.denoising_prefilter = "FAST"
scn.cycles.max_bounces = 4; scn.cycles.diffuse_bounces = 1; scn.cycles.glossy_bounces = 2
scn.cycles.transparent_max_bounces = 16; scn.cycles.transmission_bounces = 2
scn.cycles.caustics_reflective = False; scn.cycles.caustics_refractive = False
scn.cycles.blur_glossy = 1.0
r.use_motion_blur = True; r.motion_blur_shutter = 0.5
r.resolution_x, r.resolution_y, r.resolution_percentage = 720, 1280, 100
r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGB"
r.use_persistent_data = True
scn.view_settings.view_transform = "AgX"
for look in ("AgX - Medium High Contrast", "Medium High Contrast"):
    try:
        scn.view_settings.look = look
        break
    except Exception:
        pass
scn.view_settings.exposure = 0.0
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.out))
print("saved", args.out, "frames", END)
