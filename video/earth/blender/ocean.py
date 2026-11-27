"""Storm ocean (Blender FFT Ocean modifier + foam) and a giant breaking wave wall."""
import math, random
import bpy
from mathutils import Vector
from common import new_mat, link_obj, set_mat


def water_material(name="StormWater", deep=(0.004, 0.013, 0.017), shallow=(0.02, 0.09, 0.085), foam_attr="foam"):
    m, n, l, out = new_mat(name)
    lw = n.new("ShaderNodeLayerWeight"); lw.inputs[0].default_value = 0.2
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"
    l.new(lw.outputs["Facing"], col.inputs[0])
    col.inputs[6].default_value = (*shallow, 1); col.inputs[7].default_value = (*deep, 1)
    water = n.new("ShaderNodeBsdfPrincipled")
    l.new(col.outputs[2], water.inputs["Base Color"])
    water.inputs["Roughness"].default_value = 0.06
    water.inputs["Specular IOR Level"].default_value = 0.8
    water.inputs["IOR"].default_value = 1.33
    # subsurface-ish glow in wave crests (thin water lit from behind)
    water.inputs["Emission Color"].default_value = (0.02, 0.12, 0.1, 1)
    water.inputs["Emission Strength"].default_value = 0.0
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.35; nz.inputs["Detail"].default_value = 14
    nz.inputs["Roughness"].default_value = 0.62
    l.new(tc.outputs["Object"], nz.inputs[0])
    nz2 = n.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 2.2; nz2.inputs["Detail"].default_value = 6
    l.new(tc.outputs["Object"], nz2.inputs[0])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.45; bump.inputs["Distance"].default_value = 0.6
    l.new(nz.outputs["Fac"], bump.inputs["Height"])
    bump2 = n.new("ShaderNodeBump"); bump2.inputs["Strength"].default_value = 0.25; bump2.inputs["Distance"].default_value = 0.1
    l.new(nz2.outputs["Fac"], bump2.inputs["Height"]); l.new(bump.outputs[0], bump2.inputs["Normal"])
    l.new(bump2.outputs[0], water.inputs["Normal"])
    foam = n.new("ShaderNodeBsdfPrincipled")
    foam.inputs["Base Color"].default_value = (0.82, 0.85, 0.86, 1)
    foam.inputs["Roughness"].default_value = 0.6
    att = n.new("ShaderNodeAttribute"); att.attribute_name = foam_attr
    fnz = n.new("ShaderNodeTexNoise"); fnz.inputs["Scale"].default_value = 0.9; fnz.inputs["Detail"].default_value = 10
    l.new(tc.outputs["Object"], fnz.inputs[0])
    mult = n.new("ShaderNodeMath"); mult.operation = "MULTIPLY"
    l.new(att.outputs["Fac"], mult.inputs[0]); l.new(fnz.outputs["Fac"], mult.inputs[1])
    mr = n.new("ShaderNodeMapRange"); mr.inputs[1].default_value = 0.3; mr.inputs[2].default_value = 0.55
    l.new(mult.outputs[0], mr.inputs[0])
    mix = n.new("ShaderNodeMixShader")
    l.new(mr.outputs[0], mix.inputs[0]); l.new(water.outputs[0], mix.inputs[1]); l.new(foam.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs[0])
    return m


def ocean(name="Ocean", size=220, repeat=6, wave_scale=4.0, chop=1.8, wind=32.0, res=11, loc=(0, 0, 0), alignment=0.4, direction=0.0, seed=3):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    md = o.modifiers.new("ocean", "OCEAN")
    md.geometry_mode = "GENERATE"
    md.size = 1.0
    md.repeat_x = repeat
    md.repeat_y = repeat
    md.spatial_size = int(size)
    md.resolution = res
    if hasattr(md, "viewport_resolution"):
        md.viewport_resolution = 6
    md.wave_scale = wave_scale
    md.choppiness = chop
    md.wind_velocity = wind
    md.wave_alignment = alignment
    md.wave_direction = direction
    md.random_seed = seed
    md.use_normals = True
    md.use_foam = True
    md.foam_coverage = 0.3
    md.foam_layer_name = "foam"
    md.damping = 0.4
    for p in o.data.polygons:
        p.use_smooth = True
    set_mat(o, water_material())
    return o, md


def key_ocean_time(md, frames, t_fn):
    for f in frames:
        md.time = t_fn(f)
        md.keyframe_insert("time", frame=f)
    from common import linear_keys
    linear_keys(md.id_data)


def wave_wall(name="WaveWall", length=900, height=55, loc=(0, 0, 0)):
    """A towering breaking-wave cross-section (travelling +X), extruded along Y."""
    prof = []
    N = 60
    for i in range(N + 1):
        t = i / N  # back (t=0) -> crest -> lip
        if t < 0.72:
            u = t / 0.72
            x = -height * 2.6 * (1 - u)
            z = height * (math.sin(u * math.pi / 2) ** 1.6)
        else:
            u = (t - 0.72) / 0.28  # curling lip
            ang = u * math.pi * 0.95
            r = height * 0.32
            x = r * math.sin(ang) * 1.25
            z = height - r * (1 - math.cos(ang)) * 0.85
        prof.append((x, z))
    # close the face back down to the sea
    prof.append((height * 0.05, height * 0.25))
    prof.append((height * 0.35, 0.0))
    verts, faces = [], []
    M = 120
    for j in range(M + 1):
        y = -length / 2 + length * j / M
        for (x, z) in prof:
            verts.append((x, y, z))
    P = len(prof)
    for j in range(M):
        for i in range(P - 1):
            a = j * P + i
            faces.append((a, a + 1, a + 1 + P, a + P))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    link_obj(o)
    o.location = loc
    for p in me.polygons:
        p.use_smooth = True
    sub = o.modifiers.new("sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 1
    tex = bpy.data.textures.new(name + "_n", "CLOUDS"); tex.noise_scale = 6.0; tex.noise_depth = 4
    d = o.modifiers.new("d", "DISPLACE"); d.texture = tex; d.strength = 2.6; d.texture_coords = "GLOBAL"
    # material: water with foam toward the crest / lip
    m, n, l, out = new_mat("WaveWater")
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(tc.outputs["Object"], sep.inputs[0])
    hz = n.new("ShaderNodeMapRange"); hz.inputs[1].default_value = height * 0.55; hz.inputs[2].default_value = height * 0.98
    l.new(sep.outputs[2], hz.inputs[0])
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.08; nz.inputs["Detail"].default_value = 10
    l.new(tc.outputs["Object"], nz.inputs[0])
    streak = n.new("ShaderNodeTexWave"); streak.wave_type = "BANDS"; streak.bands_direction = "Z" if hasattr(streak, "bands_direction") else None
    streak.inputs["Scale"].default_value = 0.08; streak.inputs["Distortion"].default_value = 14; streak.inputs["Detail"].default_value = 6
    l.new(tc.outputs["Object"], streak.inputs[0])
    fm = n.new("ShaderNodeMath"); fm.operation = "MULTIPLY"
    l.new(hz.outputs[0], fm.inputs[0]); l.new(nz.outputs["Fac"], fm.inputs[1])
    fm2 = n.new("ShaderNodeMath"); fm2.operation = "ADD"
    l.new(fm.outputs[0], fm2.inputs[0])
    sm = n.new("ShaderNodeMath"); sm.operation = "MULTIPLY"; sm.inputs[1].default_value = 0.35
    l.new(streak.outputs["Fac"], sm.inputs[0]); l.new(sm.outputs[0], fm2.inputs[1])
    mr = n.new("ShaderNodeMapRange"); mr.inputs[1].default_value = 0.35; mr.inputs[2].default_value = 0.75
    l.new(fm2.outputs[0], mr.inputs[0])
    w = n.new("ShaderNodeBsdfPrincipled")
    w.inputs["Base Color"].default_value = (0.01, 0.05, 0.05, 1); w.inputs["Roughness"].default_value = 0.08
    w.inputs["Emission Color"].default_value = (0.02, 0.14, 0.12, 1)
    lw = n.new("ShaderNodeLayerWeight"); lw.inputs[0].default_value = 0.4
    em = n.new("ShaderNodeMath"); em.operation = "MULTIPLY"; em.inputs[1].default_value = 0.6
    l.new(lw.outputs["Facing"], em.inputs[0]); l.new(em.outputs[0], w.inputs["Emission Strength"])
    fo = n.new("ShaderNodeBsdfPrincipled")
    fo.inputs["Base Color"].default_value = (0.85, 0.88, 0.9, 1); fo.inputs["Roughness"].default_value = 0.7
    mix = n.new("ShaderNodeMixShader")
    l.new(mr.outputs[0], mix.inputs[0]); l.new(w.outputs[0], mix.inputs[1]); l.new(fo.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs[0])
    set_mat(o, m)
    return o


def spray(name, n_pts, region, rng, size=(0.3, 1.2)):
    """Spray / mist blobs: small white translucent spheres (cheap, motion-blurred)."""
    m, nn, l, out = new_mat(name + "_m")
    b = nn.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (0.9, 0.92, 0.94, 1); b.inputs["Roughness"].default_value = 0.8
    tr = nn.new("ShaderNodeBsdfTransparent")
    mix = nn.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.55
    l.new(b.outputs[0], mix.inputs[1]); l.new(tr.outputs[0], mix.inputs[2]); l.new(mix.outputs[0], out.inputs[0])
    obs = []
    (x0, x1), (y0, y1), (z0, z1) = region
    for i in range(n_pts):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=rng.uniform(*size),
                                              location=(rng.uniform(x0, x1), rng.uniform(y0, y1), rng.uniform(z0, z1)))
        o = bpy.context.active_object; o.name = f"{name}{i}"
        set_mat(o, m)
        obs.append(o)
    return obs
