"""Rice grains: single hero grains, cutaway grains with animated feeding cavities, grain fields."""
import math

import bpy
from mathutils import Vector, noise

from . import core
from . import materials as M

_CACHE = {}


def grain_mesh(seed=0, length=6.4, width=2.0, thick=1.6):
    """Long-grain polished rice: tapered ends, embryo notch at one end, slight bend + dents."""
    key = (seed, length, width, thick)
    if key in _CACHE:
        return _CACHE[key]
    r = core.rng(seed)
    bend = r.uniform(-0.12, 0.12)
    tw = r.uniform(0.9, 1.1)
    off = Vector((r.uniform(0, 100), r.uniform(0, 100), r.uniform(0, 100)))

    def deform(co):
        u = co.x / (length / 2)  # -1..1 along grain
        # ends more pointed than an ellipsoid
        taper = 1 - 0.18 * abs(u) ** 3
        co.y *= taper * tw
        co.z *= taper
        # embryo notch: small oblique dent at the +x end on one side
        if u > 0.7 and co.y > 0:
            d = (u - 0.7) / 0.3
            # proportional pull-in: oblique flattening that can never fold the surface
            co.y *= 1 - 0.45 * d * d
            co.x -= 0.06 * d * d * (co.y / (width / 2))
        # slight banana bend
        co.z += bend * (u * u - 0.33) * thick
        # irregular polish marks
        n = noise.noise(co * 0.9 + off)
        co += co.normalized() * n * 0.045
        return co

    obj = core.ellipsoid("grain_tmp", (length, width, thick), segs=(48, 24), subsurf=0,
                         deform=deform)
    me = obj.data
    me.name = f"GrainMesh_{seed}"
    bpy.data.objects.remove(obj)
    _CACHE[key] = me
    return me


def grain(name, mat, seed=0, loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0, coll=None, subsurf=1,
          **dims):
    me = grain_mesh(seed, **dims)
    obj = bpy.data.objects.new(name, me)
    obj.location = loc
    obj.rotation_euler = rot
    obj.scale = (scale, scale, scale)
    (coll or core.target()).objects.link(obj)
    if subsurf:
        m = obj.modifiers.new("Subsurf", 'SUBSURF')
        m.levels = m.render_levels = subsurf
    if not obj.data.materials:
        obj.data.materials.append(mat)
    # meshes are shared between hundreds of grains: bind the material per OBJECT
    obj.material_slots[0].link = 'OBJECT'
    obj.material_slots[0].material = mat
    return obj


def cutaway_grain(name, mat, endo_mat, seed=1, coll=None, cut_axis='Z', cavities=()):
    """A grain with its own (non-shared) mesh, a slicing cutter and optional cavity cutters.

    Returns (grain_obj, slicer, [cavity objs]). Animate slicer.location to slice open;
    animate cavity scale to hollow the grain from inside.
    """
    me = grain_mesh(seed).copy()
    me.name = name + "_mesh"
    obj = bpy.data.objects.new(name, me)
    (coll or core.target()).objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    obj.data.materials.append(endo_mat)
    ss = obj.modifiers.new("Subsurf", 'SUBSURF')
    ss.levels = ss.render_levels = 1
    cav_objs = []
    for i, (loc, size) in enumerate(cavities):
        c = core.ellipsoid(f"{name}_cavity{i}", size, loc, segs=(24, 12), subsurf=0,
                           deform=lambda co: co + co.normalized() *
                           noise.noise(co * 6.0) * 0.06)
        c.parent = obj
        c.hide_render = True
        c.display_type = 'WIRE'
        M.assign(c, endo_mat)
        if coll:
            core.link(c, coll)
        b = obj.modifiers.new(f"Cavity{i}", 'BOOLEAN')
        b.operation = 'DIFFERENCE'
        b.solver = 'EXACT'
        b.object = c
        b.material_mode = 'TRANSFER'
        cav_objs.append(c)
    me_c = bpy.data.meshes.new(name + "_slicer_mesh")
    s = 10.0
    if cut_axis == 'Y':
        verts = [(x, y, z) for x in (-s, s) for y in (0, 2 * s) for z in (-s, s)]
    else:  # slab above z = 0 (removes the top half)
        verts = [(x, y, z) for x in (-s, s) for y in (-s, s) for z in (0, 2 * s)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me_c.from_pydata(verts, [], faces)
    me_c.update()
    slicer = bpy.data.objects.new(name + "_slicer", me_c)
    (coll or core.target()).objects.link(slicer)
    slicer.parent = obj
    slicer.hide_render = True
    slicer.display_type = 'WIRE'
    slicer.location = (0, 30, 0) if cut_axis == 'Y' else (0, 0, 30)  # parked: grain intact
    M.assign(slicer, endo_mat)
    b = obj.modifiers.new("Slice", 'BOOLEAN')
    b.operation = 'DIFFERENCE'
    b.solver = 'EXACT'
    b.object = slicer
    b.material_mode = 'TRANSFER'
    return obj, slicer, cav_objs


def scatter_grains(name, mat, count, center, radius, seed=0, coll=None, z_spread=None,
                   floor=None, scale_range=(0.95, 1.08), avoid=None, mats=None):
    """Instance many grains (linked meshes). floor=z makes a heap lying on a surface."""
    r = core.rng(seed)
    objs = []
    tries = 0
    while len(objs) < count and tries < count * 20:
        tries += 1
        a = r.uniform(0, 2 * math.pi)
        d = radius * math.sqrt(r.random())
        x = center[0] + d * math.cos(a)
        y = center[1] + d * math.sin(a)
        if avoid and any((Vector((x, y)) - Vector(p[:2])).length < rr for p, rr in avoid):
            continue
        if floor is not None:
            z = floor + r.uniform(0.6, 0.9)
            rot = (r.uniform(-0.25, 0.25), r.uniform(-0.2, 0.2), r.uniform(0, 2 * math.pi))
        else:
            zs = z_spread if z_spread is not None else radius
            z = center[2] + r.uniform(-zs, zs)
            rot = (r.uniform(0, 6.3), r.uniform(0, 6.3), r.uniform(0, 6.3))
        m = (mats[r.randrange(len(mats))] if mats else mat)
        g = grain(f"{name}_{len(objs)}", m, seed=r.randrange(12), loc=(x, y, z), rot=rot,
                  scale=r.uniform(*scale_range), coll=coll, subsurf=0)
        objs.append(g)
    return objs


def heap(name, mat, count, center, radius, seed=0, coll=None, layers=3, avoid=None, mats=None):
    """Stored-rice bed: several jittered layers so there are no gaps."""
    out = []
    for L in range(layers):
        out += scatter_grains(f"{name}_L{L}", mat, count // layers, center, radius,
                              seed=seed * 10 + L, coll=coll, floor=center[2] - 0.75 * L,
                              avoid=avoid if L == 0 else None, mats=mats)
    return out


def crest_fn(mesh, y=0.0, band=0.3, scale=1.0, shrink=0.03):
    """Returns f(x)->top surface z (object space * scale) along the grain's spine."""
    xs = [i * 0.1 - 3.4 for i in range(69)]
    zs = []
    for x in xs:
        best = None
        for v in mesh.vertices:
            if abs(v.co.x - x) < 0.22 and abs(v.co.y - y) < band:
                best = v.co.z if best is None else max(best, v.co.z)
        zs.append(best if best is not None else 0.0)
    # fill gaps at the tips
    for i in range(len(zs)):
        if zs[i] == 0.0:
            zs[i] = min(z for z in zs if z != 0.0)

    def f(x):
        u = (x / scale + 3.4) / 0.1
        i = max(0, min(len(xs) - 2, int(u)))
        t = max(0.0, min(1.0, u - i))
        return (zs[i] * (1 - t) + zs[i + 1] * t - shrink) * scale
    return f
