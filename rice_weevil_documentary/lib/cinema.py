"""Blockbuster layer: per-scene lighting palettes, volumetric atmosphere with real light shafts,
shockwave dust rings, a holographic scan-ring rig and a 3D metal title.

Everything here is real Cycles geometry / lights / volumes, rendered with the scenes.
Original design language ("micro-epic"): giant grain landscapes fading into haze, hard
coloured rim light, single motivated light shafts, cyan scientific holograms.
"""
import math

import bpy
from mathutils import Vector

from . import core, rigs
from . import materials as M

# emotional palettes: key / fill / rim / beam colours
PALETTES = {
    # danger + discovery: cold key, molten back light
    "hook": dict(key=(0.62, 0.82, 1.0), fill=(0.5, 0.62, 0.85), rim=(1.0, 0.55, 0.22),
                 beam=(1.0, 0.62, 0.3)),
    # the hero reveal: steel-teal key, hot amber rim, sun shaft
    "reveal": dict(key=(0.7, 0.86, 1.0), fill=(0.45, 0.6, 0.8), rim=(1.0, 0.6, 0.25),
                   beam=(1.0, 0.72, 0.42)),
    # secret act: almost dark, one warm practical, cold edge
    "secret": dict(key=(1.0, 0.78, 0.55), fill=(0.4, 0.5, 0.7), rim=(0.45, 0.78, 1.0),
                   beam=(1.0, 0.7, 0.4)),
    # inside the grain: furnace amber / ember red
    "inside": dict(key=(1.0, 0.86, 0.7), fill=(0.6, 0.5, 0.45), rim=(1.0, 0.42, 0.18),
                   beam=(1.0, 0.6, 0.3)),
    # metamorphosis: dimensional cyan + violet
    "dimension": dict(key=(0.6, 0.9, 1.0), fill=(0.42, 0.45, 0.85), rim=(0.78, 0.45, 1.0),
                      beam=(0.55, 0.85, 1.0)),
    # epic finale: golden-hour rim on blue shadow
    "epic": dict(key=(0.75, 0.85, 1.0), fill=(0.35, 0.48, 0.75), rim=(1.0, 0.66, 0.3),
                 beam=(1.0, 0.74, 0.45)),
    # verdict: clean neutral with a gold edge
    "verdict": dict(key=(1.0, 0.96, 0.9), fill=(0.6, 0.7, 0.9), rim=(1.0, 0.78, 0.45),
                    beam=(1.0, 0.85, 0.6)),
}


def palette_three_point(coll, center, pal, dist=10.0, key=700, fill=90, rim=1500, height=1.0):
    p = PALETTES[pal]
    k, f, r = rigs.three_point(coll, center, dist=dist, key=key, fill=fill, rim=rim,
                               key_col=p["key"], rim_col=p["rim"], height=height)
    f.data.color = p["fill"]
    return k, f, r


def lights_of(coll):
    return [o for o in coll.all_objects if o.type == 'LIGHT']


def keep_volume_dark(coll, except_=()):
    """Only the designated beam lights scatter in the haze; everything else lights surfaces.
    This is what gives defined shafts instead of a flat grey wash."""
    for o in lights_of(coll):
        if o not in except_:
            o.visible_volume_scatter = False


def atmosphere(coll, center, half, density=0.004, color=(1.0, 1.0, 1.0), aniso=0.55,
               name="Atmos"):
    """Homogeneous scattering medium in a box (cheap in Cycles: no ray-marching of noise)."""
    c, h = Vector(center), Vector(half)
    vs = [(c.x + sx * h.x, c.y + sy * h.y, c.z + sz * h.z)
          for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(vs, [], faces)
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    mat = bpy.data.materials.new(name + "_mat")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Density"].default_value = density
    pv.inputs["Anisotropy"].default_value = aniso
    pv.inputs["Color"].default_value = (*color, 1)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(pv.outputs[0], out.inputs["Volume"])
    me.materials.append(mat)
    o.visible_shadow = False
    return o, pv


def beam(name, coll, loc, target, power, angle=18.0, blend=0.5, color=(1, 0.8, 0.5),
         radius=0.15):
    """A hard spot that scatters in the atmosphere: visible light shaft with real occlusion."""
    return rigs.spot(name, coll, loc, target, power, angle=angle, blend=blend, color=color,
                     radius=radius)


def key_energy(light, pairs):
    for f, e in pairs:
        light.data.energy = e
        light.data.keyframe_insert("energy", frame=f)


def dust_ring(name, coll, center, f0, n=40, r0=0.15, r1=2.2, dur=14, size=0.05, mat=None,
              seed=3, parent=None, lift=0.25):
    """Shockwave: debris thrown outward along the surface in a ring, decelerating."""
    from .scenes import particles  # local import: scenes imports cinema
    rr = core.rng(seed)
    mat = mat or M.frass_material(name + "_mat")
    specs = []
    c = Vector(center)
    for i in range(n):
        a = 2 * math.pi * i / n + rr.uniform(-0.08, 0.08)
        d = r1 * rr.uniform(0.7, 1.15)
        p0 = c + Vector((r0 * math.cos(a), r0 * math.sin(a), 0.02))
        p1 = c + Vector((d * math.cos(a), d * math.sin(a), rr.uniform(-0.05, lift)))
        fa = f0 + rr.randint(0, 2)
        specs.append((fa, p0, p1, fa + int(dur * rr.uniform(0.8, 1.2))))
    objs = particles(name, coll, mat, specs, size=size, parent=parent)
    for o in objs:  # decelerating: ease-out on location
        ad = o.animation_data
        if ad and ad.action:
            for fc in _fcurves(ad.action):
                if fc.data_path == "location":
                    for kp in fc.keyframe_points:
                        kp.interpolation = 'EXPO'
                        kp.easing = 'EASE_OUT'
    return objs


def _fcurves(action):
    fcs = getattr(action, "fcurves", None)
    if fcs is None:
        fcs = [fc for layer in action.layers for strip in layer.strips
               for bag in strip.channelbags for fc in bag.fcurves]
    return fcs


# --------------------------------------------------------------------------- holo scan rings
def holo_material(name, color=(0.35, 0.85, 1.0), strength=6.0, dashes=48):
    """Emissive dashed ring material (tick marks around the circumference), alpha-faded."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    at = nt.nodes.new("ShaderNodeMath")
    at.operation = 'ARCTAN2'
    nt.links.new(sep.outputs[1], at.inputs[0])
    nt.links.new(sep.outputs[0], at.inputs[1])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = dashes / (2 * math.pi)
    nt.links.new(at.outputs[0], mul.inputs[0])
    fr = nt.nodes.new("ShaderNodeMath")
    fr.operation = 'FRACT'
    nt.links.new(mul.outputs[0], fr.inputs[0])
    gt = nt.nodes.new("ShaderNodeMath")
    gt.operation = 'LESS_THAN'
    gt.inputs[1].default_value = 0.62
    nt.links.new(fr.outputs[0], gt.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    em.name = em.label = "HoloEmit"
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    # master fade: Value node keyed over time (0 = invisible)
    val = nt.nodes.new("ShaderNodeValue")
    val.name = val.label = "HoloFade"
    val.outputs[0].default_value = 1.0
    fac = nt.nodes.new("ShaderNodeMath")
    fac.operation = 'MULTIPLY'
    nt.links.new(gt.outputs[0], fac.inputs[0])
    nt.links.new(val.outputs[0], fac.inputs[1])
    nt.links.new(fac.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return mat


def torus(name, coll, R, r, segs=160, ring=8):
    import bmesh
    bm = bmesh.new()
    rings = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        c = Vector((R * math.cos(a), R * math.sin(a), 0))
        n = Vector((math.cos(a), math.sin(a), 0))
        rv = []
        for k in range(ring):
            b = 2 * math.pi * k / ring
            rv.append(bm.verts.new(c + n * r * math.cos(b) + Vector((0, 0, r * math.sin(b)))))
        rings.append(rv)
    for i in range(segs):
        a_, b_ = rings[i], rings[(i + 1) % segs]
        for k in range(ring):
            bm.faces.new((a_[k], a_[(k + 1) % ring], b_[(k + 1) % ring], b_[k]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.shade_smooth()
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    return o


def scan_rings(coll, center, f_on, f_off, f_end, color=(0.35, 0.85, 1.0), radii=(5.6, 6.3, 7.1)):
    """Three nested gyroscopic measurement rings orbiting the specimen (original design:
    a lab scanner, ticks = 7.5 degree graduations). Power on, slow counter-rotation, fade out."""
    piv = core.empty("ScanRig", loc=center)
    core.link(piv, coll)
    objs = []
    for i, R in enumerate(radii):
        mat = holo_material(f"Holo{i}", color=color, strength=2.6 - 0.5 * i, dashes=96 + 48 * i)
        o = torus(f"ScanRing{i}", coll, R, 0.010 + 0.004 * i, segs=240)
        o.data.materials.append(mat)
        o.parent = piv
        o.visible_shadow = False
        o.visible_volume_scatter = False
        o.rotation_mode = 'XYZ'
        tilt = (math.radians(72 - 26 * i), math.radians(18 * i - 14), 0)
        for f in range(f_on, f_end + 1, 2):
            t = (f - f_on) / 30.0
            o.rotation_euler = (tilt[0] + 0.05 * math.sin(t * 0.6 + i),
                                tilt[1] + 0.04 * math.cos(t * 0.5 + i),
                                (0.45 if i % 2 == 0 else -0.35) * t + i)
            o.keyframe_insert("rotation_euler", frame=f)
        # power-up stagger, then fade before the camera moves inside them
        fade = mat.node_tree.nodes["HoloFade"].outputs[0]
        for f, v in ((f_on - 1, 0.0), (f_on + 6 + 5 * i, 0.0), (f_on + 14 + 5 * i, 1.0),
                     (f_off, 1.0), (f_off + 18, 0.0)):
            fade.default_value = v
            fade.keyframe_insert("default_value", frame=f)
        objs.append(o)
    return piv, objs


# --------------------------------------------------------------------------- 3D title
def metal_material(name, color=(0.95, 0.78, 0.52), rough=0.22):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Roughness"].default_value = rough
    p.inputs["Coat Weight"].default_value = 0.3
    # fine brushed anisotropy-like grain via a stretched noise bump
    nt = mat.node_tree
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 60.0
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 40.0, 1.0)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    nt.links.new(mp.outputs[0], nz.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.04
    nt.links.new(nz.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs[0], p.inputs["Normal"])
    return mat


def text3d(name, coll, body, font_path, size, extrude, bevel, mat, align='CENTER'):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body
    cu.font = bpy.data.fonts.load(font_path, check_existing=True)
    cu.size = size
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = 3
    cu.align_x = align
    cu.align_y = 'CENTER'
    o = bpy.data.objects.new(name, cu)
    coll.objects.link(o)
    cu.materials.append(mat)
    return o
