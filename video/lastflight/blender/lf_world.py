"""THE LAST FLIGHT environments: damaged skyline, volumetric dust, smoke columns, fires, rooftop, light."""
import math, random
import bpy
from mathutils import Vector
import common
from common import new_mat, link_obj, set_mat, principled, emission_mat, gradient_world, sun_light
from india import MB
import india
from city import building as tower_block, WALLS


def dusk_dust_light(sun_elev=14, sun_az=200, sun=2.6, sky=0.9):
    """Low sun filtered through dust: warm key, desaturated sky."""
    gradient_world(top=(0.42, 0.42, 0.42), horizon=(0.78, 0.66, 0.52), strength=sky)
    el, az = math.radians(sun_elev), math.radians(sun_az)
    d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    sun_light("Sun", tuple(-d), strength=sun, color=(1.0, 0.8, 0.6), angle_deg=3)
    return d


def dust_volume(name, loc, size, density=0.02, color=(0.62, 0.55, 0.46), scale=0.012, drift=None, frames=None):
    """Box of drifting volumetric dust. Density is shaped by animated noise so it reads as billowing clouds.
    drift: metres per frame the noise moves (the wind), keyed over `frames`."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object; o.name = name; o.scale = size
    m, n, l, out = new_mat(name + "_m")
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    l.new(tc.outputs["Object"], mp.inputs[0])
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 2.2; nz.inputs["Detail"].default_value = 6; nz.inputs["Roughness"].default_value = 0.62
    l.new(mp.outputs[0], nz.inputs[0])
    mr = n.new("ShaderNodeMapRange"); mr.inputs[1].default_value = 0.45; mr.inputs[2].default_value = 0.75
    l.new(nz.outputs["Fac"], mr.inputs[0])
    # soften the box edges (object space -0.5..0.5)
    grad = n.new("ShaderNodeTexGradient"); grad.gradient_type = "SPHERICAL"
    l.new(tc.outputs["Object"], grad.inputs[0])
    mul = n.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
    l.new(mr.outputs[0], mul.inputs[0]); l.new(grad.outputs["Fac"], mul.inputs[1])
    mul2 = n.new("ShaderNodeMath"); mul2.operation = "MULTIPLY"; mul2.inputs[1].default_value = density
    l.new(mul.outputs[0], mul2.inputs[0])
    v = n.new("ShaderNodeVolumePrincipled"); v.inputs["Color"].default_value = (*color, 1); v.inputs["Anisotropy"].default_value = 0.35
    l.new(mul2.outputs[0], v.inputs["Density"])
    l.new(v.outputs[0], out.inputs["Volume"])
    set_mat(o, m)
    if drift and frames:
        for f in (frames[0], frames[-1]):
            mp.inputs["Location"].default_value = (-drift[0] * f / size[0], -drift[1] * f / size[1], -drift[2] * f / size[2])
            mp.inputs["Location"].keyframe_insert("default_value", frame=f)
        for fc in common.iter_fcurves(m.node_tree.animation_data.action):
            for k in fc.keyframe_points:
                k.interpolation = "LINEAR"
    o.visible_shadow = True
    return o


def smoke_column(name, base, height=120, radius=18, frames=None, color=(0.08, 0.075, 0.07), density=0.06):
    o = dust_volume(name, (base[0], base[1], base[2] + height / 2), (radius * 2, radius * 2, height), density=density, color=color,
                    drift=(0.25, 0.0, -0.35), frames=frames)
    return o


def fire(name, loc, size=3.0, strength=40):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=size, location=loc)
    f = bpy.context.active_object; f.name = name; f.scale = (1, 1, 0.5)
    set_mat(f, emission_mat(name + "_m", (1.0, 0.42, 0.08), strength)); f.visible_shadow = False
    ld = bpy.data.lights.new(name + "_l", "POINT"); ld.energy = strength * 400; ld.color = (1.0, 0.5, 0.15); ld.shadow_soft_size = size
    lo = bpy.data.objects.new(name + "_l", ld); link_obj(lo); lo.location = loc
    return f


def skyline(rng, cx=0.0, cy=0.0, rings=(60, 520), n=140, damaged=0.35, keep_clear=None):
    """Field of towers around (cx, cy). keep_clear: list of (x, y, r) circles kept free (flight corridors)."""
    out = []
    for i in range(n):
        for _ in range(20):
            r = rng.uniform(*rings); a = rng.uniform(0, 2 * math.pi)
            x, y = cx + r * math.cos(a), cy + r * math.sin(a)
            if not keep_clear or all(math.hypot(x - kx, y - ky) > kr for (kx, ky, kr) in keep_clear):
                break
        w = rng.uniform(16, 34); h = rng.choice([rng.uniform(25, 60), rng.uniform(50, 120), rng.uniform(100, 210)])
        b = tower_block(f"Tw{i}", x - w / 2, x + w / 2, y, rng.uniform(16, 30), h, rng.choice(WALLS), 1, rng.random() * 99)
        if rng.random() < damaged:
            b.rotation_euler = (rng.uniform(-0.05, 0.05), rng.uniform(0.02, 0.09), 0)  # leaning east
        out.append(b)
    return out


def rooftop(loc=(0, 0, 0), size=(22, 18), rng=None):
    """Concrete roof of a damaged mid-rise: parapet, water tanks, AC units, a bent antenna, debris."""
    rng = rng or random.Random(3)
    M = india.mats()
    x0, y0, z0 = loc
    W, D = size
    mb = MB()
    mb.box((x0, y0, z0 - 20), (W, D, 40), 0)                       # the building itself
    for sx in (-1, 1):
        mb.box((x0 + sx * W / 2, y0, z0 + 0.55), (0.3, D, 1.1), 0)  # parapets
    mb.box((x0, y0 + D / 2, z0 + 0.55), (W, 0.3, 1.1), 0)
    mb.box((x0 + 3, y0 - D / 2, z0 + 0.55), (W - 6, 0.3, 1.1), 0)  # gap where the parapet broke away
    mb.box((x0 - 6, y0 + 4, z0 + 1.4), (3.5, 3.5, 2.8), 1)        # stair housing
    for k in range(5):
        mb.box((x0 + rng.uniform(-9, 9), y0 + rng.uniform(-7, 7), z0 + 0.35), (1.0, 0.7, 0.7), 2)   # AC units
    for k in range(3):
        mb.cyl((x0 + 6 + k * 2.2, y0 + 6, z0 + 0.95), 0.85, 1.9, 3, seg=20)                       # water tanks
    for k in range(40):
        mb.box((x0 + rng.uniform(-10, 10), y0 + rng.uniform(-8, 8), z0 + 0.06), (rng.uniform(0.1, 0.6), rng.uniform(0.1, 0.5), 0.08), 4)
    roof = mb.build("Rooftop", [india.paint_material((0.55, 0.52, 0.48), "RoofConcrete"), india.paint_material((0.72, 0.6, 0.45), "StairPaint"),
                                M["ac"], M["tank"], M["concrete"]])
    # bent antenna mast
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=7, location=(x0 + 8, y0 - 5, z0 + 3.5), rotation=(0, math.radians(18), 0))
    a = bpy.context.active_object; set_mat(a, M["metal"])
    return roof


_DUSTMAT = {}


def dust_card_material(color=(0.6, 0.53, 0.44), alpha=0.55, key="dust"):
    """Soft billowing dust sprite: animated 4D noise -> alpha, lit like a matte surface + a little self-glow."""
    if key in _DUSTMAT:
        return _DUSTMAT[key]
    m, n, l, out = new_mat("DustCard_" + key)
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise"); nz.noise_dimensions = "4D"; nz.inputs["Scale"].default_value = 3.0
    nz.inputs["Detail"].default_value = 8; nz.inputs["Roughness"].default_value = 0.6
    l.new(tc.outputs["Generated"], nz.inputs["Vector"])
    oi = n.new("ShaderNodeObjectInfo")
    w = n.new("ShaderNodeMath"); w.operation = "ADD"
    l.new(oi.outputs["Random"], w.inputs[0])
    # time input: object custom property "t" (keyed per frame) so each card boils over time
    at = n.new("ShaderNodeAttribute"); at.attribute_type = "OBJECT"; at.attribute_name = "t"
    l.new(at.outputs["Fac"], w.inputs[1]); l.new(w.outputs[0], nz.inputs["W"])
    rad = n.new("ShaderNodeTexGradient"); rad.gradient_type = "SPHERICAL"
    mp = n.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (-0.5, -0.5, 0)
    l.new(tc.outputs["Generated"], mp.inputs[0])
    sc2 = n.new("ShaderNodeVectorMath"); sc2.operation = "SCALE"; sc2.inputs["Scale"].default_value = 2.0
    l.new(mp.outputs[0], sc2.inputs[0]); l.new(sc2.outputs[0], rad.inputs[0])
    mr = n.new("ShaderNodeMapRange"); mr.inputs[1].default_value = 0.42; mr.inputs[2].default_value = 0.72
    l.new(nz.outputs["Fac"], mr.inputs[0])
    a1 = n.new("ShaderNodeMath"); a1.operation = "MULTIPLY"; l.new(mr.outputs[0], a1.inputs[0]); l.new(rad.outputs["Fac"], a1.inputs[1])
    a2 = n.new("ShaderNodeMath"); a2.operation = "MULTIPLY"; a2.inputs[1].default_value = alpha; l.new(a1.outputs[0], a2.inputs[0])
    b = n.new("ShaderNodeBsdfDiffuse"); b.inputs["Color"].default_value = (*color, 1)
    e = n.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (*color, 1); e.inputs["Strength"].default_value = 0.35
    ad = n.new("ShaderNodeAddShader"); l.new(b.outputs[0], ad.inputs[0]); l.new(e.outputs[0], ad.inputs[1])
    tr = n.new("ShaderNodeBsdfTransparent"); mix = n.new("ShaderNodeMixShader")
    l.new(a2.outputs[0], mix.inputs[0]); l.new(tr.outputs[0], mix.inputs[1]); l.new(ad.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs[0])
    _DUSTMAT[key] = m
    return m


def dust_cards(cam, frames, region, n=24, size=(20, 60), wind=(1.2, 0.0, 0.1), rng=None, color=(0.6, 0.53, 0.44), alpha=0.55, key="dust"):
    """Scatter camera-facing dust sprites in region ((x0,x1),(y0,y1),(z0,z1)); they drift with the wind and boil."""
    rng = rng or random.Random(9)
    mat = dust_card_material(color, alpha, key)
    cards = []
    (x0, x1), (y0, y1), (z0, z1) = region
    for i in range(n):
        s = rng.uniform(*size)
        bpy.ops.mesh.primitive_plane_add(size=1, location=(rng.uniform(x0, x1), rng.uniform(y0, y1), rng.uniform(z0, z1)))
        c = bpy.context.active_object; c.name = f"{key}{i}"; c.scale = (s, s * rng.uniform(0.6, 1.0), 1)
        set_mat(c, mat); c.visible_shadow = False
        tr = c.constraints.new("TRACK_TO"); tr.target = cam; tr.track_axis = "TRACK_Z"; tr.up_axis = "UP_Y"
        p0 = c.location.copy(); sp = rng.uniform(0.6, 1.4)
        for f in (frames[0], frames[-1]):
            c.location = p0 + Vector(wind) * sp * f
            c.keyframe_insert("location", frame=f)
            c["t"] = f * 0.03 * sp
            c.keyframe_insert('["t"]', frame=f)
        for fc in common.iter_fcurves(c.animation_data.action):
            for k in fc.keyframe_points:
                k.interpolation = "LINEAR"
        cards.append(c)
    return cards


def ground(z=0.0, color=(0.42, 0.4, 0.37)):
    bpy.ops.mesh.primitive_plane_add(size=6000, location=(0, 0, z))
    g = bpy.context.active_object; g.name = "Ground"
    set_mat(g, india.paint_material(color, "GroundDust"))
    return g
