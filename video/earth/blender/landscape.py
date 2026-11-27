"""Terrain generator + scorched-desert / frozen-ice ground materials (F2, F3)."""
import bpy
from common import new_mat, set_mat


def terrain(name, size=900, subdiv=260, scale=0.35, strength=26.0, seed_offset=(0, 0, 0), flat_radius=60):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=subdiv, y_subdivisions=subdiv, size=size)
    o = bpy.context.active_object
    o.name = name
    # big distant ridges; flatten the foreground so the camera skims real ground detail
    import math
    from mathutils import noise, Vector
    for v in o.data.vertices:
        p = Vector((v.co.x, v.co.y, 0)) * (scale / 40.0) + Vector(seed_offset)
        h = noise.fractal(p, 0.55, 2.1, 6) * strength
        ridge = (1 - abs(noise.noise(p * 0.6))) ** 3 * strength * 1.4
        r = math.hypot(v.co.x, v.co.y)
        k = min(1.0, max(0.0, (r - flat_radius) / (size * 0.35)))
        v.co.z = (h * 0.4 + ridge) * k ** 1.4 + noise.noise(p * 8) * 0.25
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def _math(n, l, op, a, b):
    m = n.new("ShaderNodeMath"); m.operation = op
    for i, v in enumerate((a, b)):
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            l.new(v, m.inputs[i])
    return m.outputs[0]


def cracked_earth(name="Scorched"):
    m, n, l, out = new_mat(name)
    tc = n.new("ShaderNodeTexCoord")
    vor = n.new("ShaderNodeTexVoronoi"); vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 1.6
    l.new(tc.outputs["Object"], vor.inputs[0])
    vor2 = n.new("ShaderNodeTexVoronoi"); vor2.feature = "DISTANCE_TO_EDGE"; vor2.inputs["Scale"].default_value = 6.0
    l.new(tc.outputs["Object"], vor2.inputs[0])
    crack = n.new("ShaderNodeMapRange"); crack.inputs[1].default_value = 0.0; crack.inputs[2].default_value = 0.045
    l.new(vor.outputs["Distance"], crack.inputs[0])
    crack2 = n.new("ShaderNodeMapRange"); crack2.inputs[1].default_value = 0.0; crack2.inputs[2].default_value = 0.03
    l.new(vor2.outputs["Distance"], crack2.inputs[0])
    c = _math(n, l, "MINIMUM", crack.outputs[0], _math(n, l, "ADD", crack2.outputs[0], 0.35))
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.08; nz.inputs["Detail"].default_value = 8
    l.new(tc.outputs["Object"], nz.inputs[0])
    base = n.new("ShaderNodeMix"); base.data_type = "RGBA"
    l.new(nz.outputs["Fac"], base.inputs[0])
    base.inputs[6].default_value = (0.62, 0.38, 0.2, 1); base.inputs[7].default_value = (0.8, 0.58, 0.36, 1)
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"
    l.new(c, col.inputs[0]); col.inputs[6].default_value = (0.05, 0.025, 0.015, 1); l.new(base.outputs[2], col.inputs[7])
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(col.outputs[2], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.92
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.9; bump.inputs["Distance"].default_value = 0.05
    l.new(c, bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def frozen_ground(name="Frozen"):
    m, n, l, out = new_mat(name)
    tc = n.new("ShaderNodeTexCoord")
    vor = n.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 0.25
    l.new(tc.outputs["Object"], vor.inputs[0])
    ice = n.new("ShaderNodeMapRange"); ice.inputs[1].default_value = 0.35; ice.inputs[2].default_value = 0.55
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.12; nz.inputs["Detail"].default_value = 10
    l.new(tc.outputs["Object"], nz.inputs[0])
    l.new(nz.outputs["Fac"], ice.inputs[0])
    cr = n.new("ShaderNodeTexVoronoi"); cr.feature = "DISTANCE_TO_EDGE"; cr.inputs["Scale"].default_value = 0.9
    l.new(tc.outputs["Object"], cr.inputs[0])
    crk = n.new("ShaderNodeMapRange"); crk.inputs[1].default_value = 0.0; crk.inputs[2].default_value = 0.02
    l.new(cr.outputs["Distance"], crk.inputs[0])
    snow = n.new("ShaderNodeBsdfPrincipled")
    snow.inputs["Base Color"].default_value = (0.78, 0.84, 0.92, 1); snow.inputs["Roughness"].default_value = 0.55
    snow.inputs["Subsurface Weight"].default_value = 0.0
    sp = n.new("ShaderNodeTexNoise"); sp.inputs["Scale"].default_value = 60; sp.inputs["Detail"].default_value = 2
    l.new(tc.outputs["Object"], sp.inputs[0])
    sbump = n.new("ShaderNodeBump"); sbump.inputs["Strength"].default_value = 0.35
    l.new(sp.outputs["Fac"], sbump.inputs["Height"]); l.new(sbump.outputs[0], snow.inputs["Normal"])
    icem = n.new("ShaderNodeBsdfPrincipled")
    icem.inputs["Base Color"].default_value = (0.08, 0.16, 0.26, 1); icem.inputs["Roughness"].default_value = 0.04
    icem.inputs["Specular IOR Level"].default_value = 0.9; icem.inputs["Coat Weight"].default_value = 1.0
    ibump = n.new("ShaderNodeBump"); ibump.inputs["Strength"].default_value = 0.6; ibump.invert = True
    l.new(crk.outputs[0], ibump.inputs["Height"]); l.new(ibump.outputs[0], icem.inputs["Normal"])
    mix = n.new("ShaderNodeMixShader")
    l.new(ice.outputs[0], mix.inputs[0]); l.new(icem.outputs[0], mix.inputs[1]); l.new(snow.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs[0])
    return m
