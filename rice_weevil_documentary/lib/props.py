"""Kitchen props for the opening: a sealed glass storage jar of rice, its screw lid, a counter.

Units are millimetres (like the rest of the project): the jar is a typical 1 kg storage jar,
80 mm across and 95 mm tall, so a 3 mm weevil is to scale.
"""
import math

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

from . import core, grains
from . import materials as M

JAR_RO = 40.0      # outer radius
JAR_RI = 37.6      # inner radius (2.4 mm glass)
JAR_H = 95.0       # rim top
RICE_TOP = 87.4    # surface the rice settles to (feet plane for walkers on the rice)
RIM_R = (JAR_RO - JAR_RI) / 2  # rounded rim radius


def lathe(name, profile, segs=128, closed=False, subsurf=0):
    """Revolve a (r, z) polyline about Z. closed=True also joins the last point to the first."""
    bm = bmesh.new()
    rings = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        c, s = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((r * c, r * s, z)) for r, z in profile])
    n = len(profile)
    last = n if closed else n - 1
    for i in range(segs):
        ra, rb = rings[i], rings[(i + 1) % segs]
        for j in range(last):
            k = (j + 1) % n
            bm.faces.new((ra[j], rb[j], rb[k], ra[k]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return core._finish_mesh(bm, name, subsurf=subsurf)


def _arc(cx, cz, rad, a0, a1, n):
    return [(cx + rad * math.cos(a0 + (a1 - a0) * i / n), cz + rad * math.sin(a0 + (a1 - a0) * i / n))
            for i in range(n + 1)]


def glass_material(name="JarGlass"):
    mat = bpy.data.materials.new(name)
    nb = M.NB(mat)
    p = M._bsdf(nb, **{"Base Color": (0.93, 0.97, 0.96, 1), "Roughness": 0.02,
                       "Transmission Weight": 1.0, "IOR": 1.5, "Specular IOR Level": 0.5})
    # faint surface smudges so the glass reads as a real kitchen jar
    co = M._coords(nb)
    n = nb.n("ShaderNodeTexNoise", Scale=0.08, Detail=5.0, Roughness=0.6)
    nb.l(co, n.inputs["Vector"])
    r = nb.n("ShaderNodeMapRange", **{"From Min": 0.5, "From Max": 0.75, "To Min": 0.015,
                                      "To Max": 0.09})
    nb.l(n.outputs["Fac"], r.inputs["Value"])
    nb.l(r.outputs[0], p.inputs["Roughness"])
    # thin-glass shadow trick: shadow rays pass through (Cycles has no cheap caustics), so the
    # rice inside the closed jar is lit by the kitchen lights like in a real glass jar
    lp = nb.n("ShaderNodeLightPath")
    tr = nb.n("ShaderNodeBsdfTransparent", Color=(0.92, 0.95, 0.94, 1))
    mix = nb.n("ShaderNodeMixShader")
    nb.l(lp.outputs["Is Shadow Ray"], mix.inputs[0])
    nb.l(p.outputs[0], mix.inputs[1])
    nb.l(tr.outputs[0], mix.inputs[2])
    nb.output(mix.outputs[0])
    return mat


def lid_material(name="LidMetal"):
    mat = bpy.data.materials.new(name)
    nb = M.NB(mat)
    co = M._coords(nb)
    # brushed steel: radial-ish streaks + micro noise in roughness
    w = nb.n("ShaderNodeTexWave", _wave_type='RINGS', Scale=0.35, Distortion=6.0, Detail=8.0)
    nb.l(co, w.inputs["Vector"])
    r = nb.n("ShaderNodeMapRange", **{"To Min": 0.18, "To Max": 0.34})
    nb.l(w.outputs["Fac"], r.inputs["Value"])
    p = M._bsdf(nb, **{"Base Color": (0.78, 0.76, 0.72, 1), "Metallic": 1.0, "Roughness": 0.25})
    nb.l(r.outputs[0], p.inputs["Roughness"])
    nb.output(p.outputs[0])
    return mat


def counter_material(name="Counter"):
    """Dark stone kitchen counter with a soft sheen."""
    mat = bpy.data.materials.new(name)
    nb = M.NB(mat)
    co = M._coords(nb)
    n = nb.n("ShaderNodeTexNoise", Scale=0.03, Detail=10.0, Roughness=0.65)
    nb.l(co, n.inputs["Vector"])
    speck = nb.n("ShaderNodeTexNoise", Scale=0.9, Detail=2.0)
    nb.l(co, speck.inputs["Vector"])
    base = nb.mix_rgb(n.outputs["Fac"], (0.012, 0.011, 0.010, 1), (0.04, 0.036, 0.032, 1))
    sp = nb.n("ShaderNodeMapRange", **{"From Min": 0.66, "From Max": 0.7})
    nb.l(speck.outputs["Fac"], sp.inputs["Value"])
    base = nb.mix_rgb(sp.outputs[0], base, (0.16, 0.15, 0.13, 1))
    p = M._bsdf(nb, **{"Roughness": 0.32, "Specular IOR Level": 0.5})
    nb.l(base, p.inputs["Base Color"])
    nb.output(p.outputs[0])
    return mat


def counter(coll, size=900):
    me = bpy.data.meshes.new("Counter")
    s = size / 2
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    obj = bpy.data.objects.new("Counter", me)
    coll.objects.link(obj)
    me.materials.append(counter_material())
    return obj


def jar(coll):
    """Thick-walled glass jar with a rounded rim and a short screw-thread neck."""
    ro, ri, h = JAR_RO, JAR_RI, JAR_H
    prof = [(0.0, 0.0), (ro - 3.0, 0.0)]
    prof += _arc(ro - 3.0, 3.0, 3.0, -math.pi / 2, 0, 6)           # rounded heel
    prof += [(ro, h - 11.0)]
    # neck with two thread ridges just below the rim
    for z in (h - 9.0, h - 4.5):
        prof += [(ro, z - 1.0), (ro + 0.9, z - 0.3), (ro + 0.9, z + 0.3), (ro, z + 1.0)]
    prof += _arc((ro + ri) / 2, h - RIM_R, RIM_R, 0, math.pi, 8)   # rounded rim
    prof += [(ri, 7.0)]
    prof += _arc(ri - 3.0, 7.0, 3.0, 0, -math.pi / 2, 6)           # inner heel
    prof += [(0.0, 4.0)]
    obj = lathe("Jar", prof, segs=160, closed=False)
    obj.data.materials.append(glass_material())
    core.link(obj, coll)
    return obj


def lid(coll):
    """Screw cap: flat top with a slight dome, knurled skirt, rolled lip."""
    ro = JAR_RO + 2.2
    top = JAR_H + 2.5
    prof = [(0.0, top + 0.6), (ro - 6, top + 0.4)]
    prof += _arc(ro - 1.6, top - 1.6, 1.6, math.pi / 2, 0, 5)
    prof += [(ro, JAR_H - 10.0), (ro - 0.4, JAR_H - 11.0), (ro - 1.4, JAR_H - 11.0),
             (ro - 1.4, top - 1.0), (0.0, top - 1.0)]
    obj = lathe("Lid", prof, segs=144, closed=False)
    # knurling on the skirt: small vertical ribs
    for v in obj.data.vertices:
        r = math.hypot(v.co.x, v.co.y)
        if r > ro - 0.05 and JAR_H - 9.5 < v.co.z < top - 2.0:
            a = math.atan2(v.co.y, v.co.x)
            k = 1 + 0.008 * max(0.0, math.cos(a * 72))
            v.co.x *= k
            v.co.y *= k
    obj.data.materials.append(lid_material())
    core.link(obj, coll)
    return obj


def label(coll, image_path, z0=56.0, z1=81.0, phi=-math.pi / 2, segs=48):
    """Printed paper label wrapped round the front of the jar (channel branding).
    Its width follows the image aspect so the artwork is never stretched."""
    img = bpy.data.images.load(image_path, check_existing=True)
    img.pack()  # keep the artwork inside the .blend
    w_px, h_px = img.size
    r = JAR_RO + 0.12
    span = (z1 - z0) * w_px / h_px / r           # arc angle covered by the label
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    grid = []
    for i in range(segs + 1):
        a = phi - span / 2 + span * i / segs
        grid.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for z in (z0, z1)])
    for i in range(segs):
        f = bm.faces.new((grid[i][0], grid[i + 1][0], grid[i + 1][1], grid[i][1]))
        for lp, (u, v) in zip(f.loops, ((i / segs, 0), ((i + 1) / segs, 0), ((i + 1) / segs, 1),
                                        (i / segs, 1))):
            lp[uv].uv = (u, v)
    obj = core._finish_mesh(bm, "JarLabel", subsurf=0)
    mat = bpy.data.materials.new("JarLabelPrint")
    nb = M.NB(mat)
    p = M._bsdf(nb, **{"Roughness": 0.42, "Coat Weight": 0.25, "Coat Roughness": 0.12})
    tex = nb.n("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = 'Cubic'
    nb.l(tex.outputs["Color"], p.inputs["Base Color"])
    # paper fibre: a whisper of bump so the print catches the key light like a real sticker
    n = nb.n("ShaderNodeTexNoise", Scale=1.8, Detail=8.0)
    nb.l(M._coords(nb), n.inputs["Vector"])
    b = nb.n("ShaderNodeBump", Strength=0.06, Distance=0.05)
    nb.l(n.outputs["Fac"], b.inputs["Height"])
    nb.l(b.outputs["Normal"], p.inputs["Normal"])
    nb.output(p.outputs[0])
    obj.data.materials.append(mat)
    core.link(obj, coll)
    return obj


def _tangent_rot(phi, tilt, roll):
    """Rotation that lays a grain's long axis along the jar wall (tangent plane at angle phi),
    tilted by `tilt` from horizontal, with its width axis pointing at the jar centre."""
    radial = Vector((math.cos(phi), math.sin(phi), 0))
    tang = Vector((-math.sin(phi), math.cos(phi), 0))
    x = (tang * math.cos(tilt) + Vector((0, 0, 1)) * math.sin(tilt)).normalized()
    y = -radial
    z = x.cross(y).normalized()
    m = Matrix((x, y, z)).transposed()
    return (m @ Matrix.Rotation(roll, 3, 'X')).to_euler()


def rice_fill(coll, mat, seed=4, facing=-math.pi / 2, arc=math.radians(115), avoid=()):
    """Rice inside the jar, built only where the camera can see it:
    an opaque core, two layers of grains pressed against the glass on the camera side,
    and a settled surface layer at the top."""
    r = core.rng(seed)
    core_obj = lathe("RiceCore", [(0, 5.0), (JAR_RI - 2.8, 5.0), (JAR_RI - 2.8, RICE_TOP - 1.6),
                                  (0, RICE_TOP - 1.6)], segs=64, closed=False)
    core_obj.data.materials.append(M.rice_material("RiceCoreMat", aged=0.15))
    core.link(core_obj, coll)
    objs = []
    # against the glass: rows so there are no gaps, jittered so there's no pattern
    for layer, (rad, n_rows, n_per) in enumerate(((JAR_RI - 1.25, 34, 70), (JAR_RI - 2.4, 26, 52))):
        for row in range(n_rows):
            z = 6.5 + (RICE_TOP - 8.0) * (row + r.uniform(0.0, 0.8)) / n_rows
            for k in range(n_per):
                phi = facing - arc + 2 * arc * (k + r.uniform(0, 1)) / n_per
                rr = rad + r.uniform(-0.15, 0.1)
                pos = Vector((rr * math.cos(phi), rr * math.sin(phi), z))
                if layer == 0 and any((pos - Vector(c)).length < ar for c, ar in avoid):
                    continue
                rot = _tangent_rot(phi, r.uniform(-1.3, 1.3), r.uniform(-0.5, 0.5))
                g = grains.grain(f"JarRice{layer}_{row}_{k}", mat, seed=r.randrange(12),
                                 loc=(rr * math.cos(phi), rr * math.sin(phi), z), rot=rot,
                                 scale=r.uniform(0.94, 1.06), coll=coll, subsurf=0)
                objs.append(g)
    # settled top surface (two layers), kept clear of the glass
    for layer in range(2):
        for i in range(520):
            a = r.uniform(0, 2 * math.pi)
            d = (JAR_RI - 3.4) * math.sqrt(r.random())
            z = RICE_TOP - 0.9 - 0.8 * layer + r.uniform(-0.15, 0.15)
            g = grains.grain(f"JarTop{layer}_{i}", mat, seed=r.randrange(12),
                             loc=(d * math.cos(a), d * math.sin(a), z),
                             rot=(r.uniform(-0.3, 0.3), r.uniform(-0.25, 0.25),
                                  r.uniform(0, 2 * math.pi)),
                             scale=r.uniform(0.95, 1.05), coll=coll, subsurf=0)
            objs.append(g)
    # ring of grains lying along the glass at the surface, closing the edge gap
    for i in range(110):
        phi = 2 * math.pi * (i + r.uniform(0, 0.6)) / 110
        rr = JAR_RI - 1.3
        g = grains.grain(f"JarEdge_{i}", mat, seed=r.randrange(12),
                         loc=(rr * math.cos(phi), rr * math.sin(phi), RICE_TOP - 1.0),
                         rot=_tangent_rot(phi, r.uniform(-0.25, 0.25), r.uniform(-0.4, 0.4)),
                         coll=coll, subsurf=0)
        objs.append(g)
    return core_obj, objs


# ------------------------------------------------------------------ walking over the jar
def rim_profile(start_u, step=0.05):
    """Surface path (u = distance from the jar axis, z) for a walker that crosses the rice,
    climbs the inner glass wall, goes over the rounded rim and down the outside.
    Returns a list of (u, z, climb_angle) sampled every `step` mm of arc length."""
    pts = []
    fil = 1.6  # concave fillet where the rice meets the glass

    def seg_line(p0, p1):
        d = (Vector(p1) - Vector(p0))
        n = max(1, int(d.length / step))
        a = math.atan2(d.y, d.x)
        for i in range(n):
            q = Vector(p0) + d * (i / n)
            pts.append((q.x, q.y, a))

    def seg_arc(cx, cz, rad, a0, a1, convex):
        n = max(2, int(abs(a1 - a0) * rad / step))
        for i in range(n):
            a = a0 + (a1 - a0) * i / n
            u, z = cx + rad * math.cos(a), cz + rad * math.sin(a)
            # tangent direction of travel
            da = 1 if a1 > a0 else -1
            tx, tz = -math.sin(a) * da, math.cos(a) * da
            pts.append((u, z, math.atan2(tz, tx)))

    ri, ro, top = JAR_RI, JAR_RO, JAR_H
    seg_line((start_u, RICE_TOP), (ri - fil, RICE_TOP))
    seg_arc(ri - fil, RICE_TOP + fil, fil, -math.pi / 2, 0, False)
    seg_line((ri, RICE_TOP + fil), (ri, top - RIM_R))
    seg_arc((ri + ro) / 2, top - RIM_R, RIM_R, math.pi, 0, True)
    seg_line((ro, top - RIM_R), (ro, top - 4.0))
    # skirt the first thread ridge
    seg_line((ro, top - 4.0), (ro + 0.9, top - 4.6))
    seg_line((ro + 0.9, top - 4.6), (ro + 0.9, top - 20))
    return pts


def path_on_profile(prof, f_start, f_end, phi, speed, ease_in=10, d0=0.0):
    """Turn a rim profile into an animate_weevil path along azimuth phi (radians).
    speed in mm/frame; holds still before f_start and after the profile ends or f_end."""
    rad = Vector((math.cos(phi), math.sin(phi), 0))
    yaw = phi
    n = len(prof)

    def f(fr):
        t = max(0.0, fr - f_start)
        # gentle ease-in so feet don't snap into motion
        dist = speed * (t - ease_in / 2 if t > ease_in else t * t / (2 * ease_in))
        walking = 1.0 if f_start <= fr <= f_end else 0.0
        if fr > f_end:
            te = f_end - f_start
            dist = speed * (te - ease_in / 2)
        i = min(n - 1, int((d0 + dist) / 0.05))
        u, z, a = prof[i]
        if i >= n - 1:
            walking = 0.0
        loc = rad * u + Vector((0, 0, z))
        return (loc, yaw, walking, -a)
    return f
