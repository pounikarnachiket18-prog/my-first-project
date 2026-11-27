"""Photoreal Earth for Cycles, built for speed (no stacked transparent shells).

Surface shader: NASA Blue Marble day map, Black Marble city lights on the night side, ocean glint,
topography bump, and the cloud layer mixed directly into the surface (with a sun-offset cloud
shadow). One thin emissive atmosphere shell gives the blue limb.

Orientation helpers place a given latitude/longitude (e.g. India) toward a direction.
UV sphere convention (Blender): longitude 0 maps to -X... we measure it in `lonlat_dir`.
"""
import math, os
import bpy
from mathutils import Vector, Matrix, Euler, Quaternion
from common import TEX, img, link_obj, new_mat, set_mat

TILT = 23.44


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


def _range(n, l, src, a, b, c=0.0, d=1.0):
    if a > b:  # smoothstep needs from_min < from_max: swap the edges and the targets (same mapping)
        a, b, c, d = b, a, d, c
    r = n.new("ShaderNodeMapRange"); r.interpolation_type = "SMOOTHSTEP"
    r.inputs[1].default_value = a; r.inputs[2].default_value = b; r.inputs[3].default_value = c; r.inputs[4].default_value = d
    l.new(src, r.inputs[0])
    return r.outputs[0]


def _mix(n, l, fac, a, b, blend="MIX"):
    m = n.new("ShaderNodeMix"); m.data_type = "RGBA"; m.blend_type = blend
    for sock, v in ((m.inputs[0], fac), (m.inputs[6], a), (m.inputs[7], b)):
        if isinstance(v, (int, float)):
            sock.default_value = v
        elif isinstance(v, tuple):
            sock.default_value = v
        else:
            l.new(v, sock)
    return m.outputs[2]


def surface_material(name="Earth", night=2.2, cloud_amt=1.0, heat=0.0, frost=0.0):
    """Sun direction is read from the scene's Sun lamp via a driver-free trick: we pass it as
    the object 'sun_vec' custom property through an Attribute node (Object attribute)."""
    m, n, l, out = new_mat(name)
    uv = n.new("ShaderNodeTexCoord")
    def tex(file, cs="sRGB"):
        t = n.new("ShaderNodeTexImage"); t.image = img(os.path.join(TEX, file), cs); t.interpolation = "Linear"
        return t
    day, nightt, water, topo, cloud = tex("earth-blue-marble.jpg"), tex("earth-night.jpg"), tex("earth-water.png", "Non-Color"), \
        tex("earth-topology.png", "Non-Color"), tex("clouds-alpha.jpg", "Non-Color")
    for t in (day, nightt, water, topo):
        l.new(uv.outputs["UV"], t.inputs[0])
    # clouds drift: UV offset in U driven by custom prop "cloud_u" on the object
    cu = n.new("ShaderNodeAttribute"); cu.attribute_type = "OBJECT"; cu.attribute_name = "cloud_u"
    off = n.new("ShaderNodeCombineXYZ"); l.new(cu.outputs["Fac"], off.inputs[0])
    add = n.new("ShaderNodeVectorMath"); add.operation = "ADD"
    l.new(uv.outputs["UV"], add.inputs[0]); l.new(off.outputs[0], add.inputs[1])
    l.new(add.outputs[0], cloud.inputs[0])
    sh = n.new("ShaderNodeVectorMath"); sh.operation = "ADD"; sh.inputs[1].default_value = (0.0012, 0.0006, 0)
    l.new(add.outputs[0], sh.inputs[0])
    cloud_sh = tex("clouds-alpha.jpg", "Non-Color"); l.new(sh.outputs[0], cloud_sh.inputs[0])
    # sun dot (sun vector stored on object as custom prop "sun_vec")
    sv = n.new("ShaderNodeAttribute"); sv.attribute_type = "OBJECT"; sv.attribute_name = "sun_vec"
    geo = n.new("ShaderNodeNewGeometry")
    dot = n.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    l.new(geo.outputs["Normal"], dot.inputs[0]); l.new(sv.outputs["Vector"], dot.inputs[1])
    sd = dot.outputs["Value"]
    dark = _range(n, l, sd, 0.06, -0.22)
    ca = _m(n, l, "MULTIPLY", _range(n, l, cloud.outputs[0], 0.08, 0.85), cloud_amt)
    csh = _m(n, l, "MULTIPLY", _range(n, l, cloud_sh.outputs[0], 0.1, 0.85), cloud_amt * 0.55)
    hsv = n.new("ShaderNodeHueSaturation"); hsv.inputs["Saturation"].default_value = 1.12
    l.new(day.outputs[0], hsv.inputs["Color"])
    ground = _mix(n, l, csh, hsv.outputs[0], (0.0, 0.0, 0.0, 1), "MULTIPLY")
    if heat > 0:
        ground = _mix(n, l, heat, ground, (0.95, 0.45, 0.15, 1), "MULTIPLY")
    col = _mix(n, l, ca, ground, (0.92, 0.93, 0.95, 1))
    if frost > 0:
        col = _mix(n, l, _m(n, l, "MULTIPLY", dark, frost), col, (0.75, 0.85, 1.0, 1))
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(col, b.inputs["Base Color"])
    wr = _range(n, l, water.outputs[0], 0, 1, 0.85, 0.42)
    rough = _m(n, l, "MAXIMUM", wr, _m(n, l, "MULTIPLY", ca, 0.95))
    l.new(rough, b.inputs["Roughness"])
    l.new(_range(n, l, water.outputs[0], 0, 1, 0.25, 0.5), b.inputs["Specular IOR Level"])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.18
    l.new(topo.outputs[0], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    sepc = n.new("ShaderNodeSeparateColor")
    l.new(nightt.outputs[0], sepc.inputs[0])
    city = _range(n, l, sepc.outputs[0], 0.05, 0.55)
    emi = _m(n, l, "MULTIPLY", _m(n, l, "MULTIPLY", city, dark), _m(n, l, "SUBTRACT", 1.0, _m(n, l, "MULTIPLY", ca, 0.8)))
    b.inputs["Emission Color"].default_value = (1.0, 0.66, 0.32, 1)
    l.new(_m(n, l, "MULTIPLY", emi, night), b.inputs["Emission Strength"])
    # limb haze (Rayleigh) on the lit side
    lw = n.new("ShaderNodeLayerWeight"); lw.inputs[0].default_value = 0.35
    lit = _range(n, l, sd, -0.15, 0.3)
    hz = _m(n, l, "MULTIPLY", _m(n, l, "POWER", lw.outputs["Facing"], 2.4), lit)
    em = n.new("ShaderNodeEmission"); em.inputs[0].default_value = (0.3, 0.55, 1.0, 1); em.inputs[1].default_value = 0.9
    mixs = n.new("ShaderNodeMixShader")
    l.new(_m(n, l, "MULTIPLY", hz, 0.45), mixs.inputs[0]); l.new(b.outputs[0], mixs.inputs[1]); l.new(em.outputs[0], mixs.inputs[2])
    l.new(mixs.outputs[0], out.inputs[0])
    return m


def atmo_material(strength=1.6):
    m, n, l, out = new_mat("Atmo")
    sv = n.new("ShaderNodeAttribute"); sv.attribute_type = "OBJECT"; sv.attribute_name = "sun_vec"
    geo = n.new("ShaderNodeNewGeometry")
    oi = n.new("ShaderNodeObjectInfo")
    # outward radial direction from position (the shading normal flips on back faces of a transparent shell)
    rel = n.new("ShaderNodeVectorMath"); rel.operation = "SUBTRACT"
    l.new(geo.outputs["Position"], rel.inputs[0]); l.new(oi.outputs["Location"], rel.inputs[1])
    nrm = n.new("ShaderNodeVectorMath"); nrm.operation = "NORMALIZE"; l.new(rel.outputs[0], nrm.inputs[0])
    dot = n.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    l.new(nrm.outputs[0], dot.inputs[0]); l.new(sv.outputs["Vector"], dot.inputs[1])
    lit = _range(n, l, dot.outputs["Value"], -0.3, 0.35)
    term = _m(n, l, "MULTIPLY", _range(n, l, dot.outputs["Value"], -0.2, 0.0), _range(n, l, dot.outputs["Value"], 0.2, 0.0))
    lw = n.new("ShaderNodeLayerWeight"); lw.inputs[0].default_value = 0.5
    rim = _m(n, l, "POWER", lw.outputs["Facing"], 3.0)
    edge = _range(n, l, lw.outputs["Facing"], 1.0, 0.9)
    s = _m(n, l, "MULTIPLY", _m(n, l, "MULTIPLY", rim, edge), _m(n, l, "ADD", lit, _m(n, l, "MULTIPLY", term, 0.3)))
    col = _mix(n, l, term, (0.25, 0.52, 1.0, 1), (1.0, 0.5, 0.22, 1))
    e = n.new("ShaderNodeEmission"); l.new(col, e.inputs[0]); l.new(_m(n, l, "MULTIPLY", s, strength), e.inputs[1])
    tr = n.new("ShaderNodeBsdfTransparent")
    add = n.new("ShaderNodeAddShader"); l.new(tr.outputs[0], add.inputs[0]); l.new(e.outputs[0], add.inputs[1])
    l.new(add.outputs[0], out.inputs[0])
    return m


class Planet:
    def __init__(self, loc=(0, 0, 0), radius=1.0, tilt=True, night=2.2, cloud_amt=1.0, heat=0.0, frost=0.0, atmo=1.0):
        self.tilt = bpy.data.objects.new("EarthTilt", None); link_obj(self.tilt)
        self.tilt.location = loc
        self.tilt.rotation_euler = (math.radians(TILT) if tilt else 0.0, 0, 0)
        self.spin = bpy.data.objects.new("EarthSpin", None); link_obj(self.spin)
        self.spin.parent = self.tilt
        bpy.ops.mesh.primitive_uv_sphere_add(segments=160, ring_count=80, radius=radius)
        self.surf = bpy.context.active_object; self.surf.name = "EarthSurface"
        for p in self.surf.data.polygons:
            p.use_smooth = True
        self.surf.parent = self.spin
        set_mat(self.surf, surface_material(night=night, cloud_amt=cloud_amt, heat=heat, frost=frost))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=radius * 1.025)
        self.atmo = bpy.context.active_object; self.atmo.name = "EarthAtmo"
        for p in self.atmo.data.polygons:
            p.use_smooth = True
        self.atmo.parent = self.tilt
        set_mat(self.atmo, atmo_material(atmo))
        self.atmo.visible_shadow = False
        for o in (self.surf, self.atmo):
            o["sun_vec"] = (1.0, 0.0, 0.0)
            o["cloud_u"] = 0.0
        self.radius = radius

    def set_sun(self, to_sun, frame=None):
        v = Vector(to_sun).normalized()
        for o in (self.surf, self.atmo):
            o["sun_vec"] = tuple(v)
            if frame is not None:
                o.keyframe_insert('["sun_vec"]', frame=frame)

    def key(self, frame, spin_rad, cloud_u=0.0):
        """spin about Earth's own axis (local Z of the tilt frame); positive = eastward (counter-clockwise from north)."""
        self.spin.rotation_euler = (0, 0, spin_rad)
        self.spin.keyframe_insert("rotation_euler", frame=frame)
        self.surf["cloud_u"] = cloud_u
        self.surf.keyframe_insert('["cloud_u"]', frame=frame)


# With spin = 0 a camera on the -Y axis sees longitude ~85 W. Spin that puts longitude `lon` toward -Y:
def spin_facing(lon_deg, extra_deg=0.0):
    return math.radians(-(lon_deg + 85.0) + extra_deg)


INDIA = (22.0, 79.0)


def lonlat_local(lat, lon):
    """Direction of (lat, lon) on Blender's UV sphere before any rotation.
    Blender UV sphere: u=0 at angle pi (−X) going counter-clockwise; equirect lon -180 at u=0."""
    th = math.radians(lon) + math.pi  # azimuth from +X
    phi = math.radians(lat)
    return Vector((-math.cos(th) * math.cos(phi) * -1, -math.sin(th) * math.cos(phi) * -1, math.sin(phi)))


def marker(planet, lat, lon, color=(1.0, 0.82, 0.3), size=0.018, strength=12):
    """Glowing pin on the surface (spins with the planet)."""
    from common import emission_mat
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=size)
    mk = bpy.context.active_object; mk.name = "Marker"
    # place on the unrotated sphere: azimuth measured so that spin_facing() logic holds
    az = math.radians(lon + 85.0) - math.pi / 2  # lon -85 sits at -Y (azimuth -90 deg)
    v = Vector((math.cos(az) * math.cos(math.radians(lat)), math.sin(az) * math.cos(math.radians(lat)), math.sin(math.radians(lat))))
    mk.location = v * planet.radius * 1.004
    mk.parent = planet.spin
    set_mat(mk, emission_mat("MarkerGlow", color, strength))
    return mk


def ring(name, radius, width, color, strength, loc=(0, 0, 0), parent=None, rot=(0, 0, 0)):
    from common import emission_mat
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=width, major_segments=256, minor_segments=8, location=loc, rotation=rot)
    r = bpy.context.active_object; r.name = name
    set_mat(r, emission_mat(name + "_m", color, strength))
    r.visible_shadow = False
    if parent is not None:
        r.parent = parent
    return r


def space_world(stars=0.6):
    from common import space_world as sw
    sw(stars)
