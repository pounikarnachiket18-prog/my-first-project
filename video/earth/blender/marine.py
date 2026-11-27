"""Marine Drive (Mumbai) seafront: Arabian Sea to the WEST (-X), tetrapods, sea wall + promenade,
the road, and a row of pastel art-deco buildings facing the sea (+X side)."""
import math, random
import bpy
from mathutils import Vector, Matrix
from common import link_obj, set_mat, principled, emission_mat
import india
from india import MB, mats
from ocean import ocean, key_ocean_time, wave_wall

DECO = [(0.92, 0.88, 0.76), (0.88, 0.8, 0.66), (0.82, 0.86, 0.84), (0.93, 0.84, 0.78), (0.86, 0.82, 0.7)]


def tetrapod(mb, c, rz, rx, mat=0, s=1.0):
    """Four-legged concrete breakwater block."""
    legs = [Vector((0, 0, 1)), Vector((0.943, 0, -0.333)), Vector((-0.471, 0.816, -0.333)), Vector((-0.471, -0.816, -0.333))]
    R = Matrix.Rotation(rz, 3, "Z") @ Matrix.Rotation(rx, 3, "X")
    for d in legs:
        d = R @ d
        q = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
        res = __import__("bmesh").ops.create_cone(mb.bm, cap_ends=True, segments=10, radius1=0.42 * s, radius2=0.26 * s, depth=1.1 * s)
        vs = res["verts"]
        M = Matrix.Translation(Vector(c) + d * 0.55 * s) @ q
        __import__("bmesh").ops.transform(mb.bm, matrix=M, verts=vs)
        for f in {f for v in vs for f in v.link_faces}:
            f.material_index = mat
            f.smooth = True


def build(rng, wave=True, y0=-260, y1=260):
    M = mats()
    out = {}
    # sea (calm swell) — the wall of water is added separately
    o, md = ocean(size=160, repeat=6, wave_scale=1.6, chop=1.2, wind=22, res=10, alignment=0.5, direction=0.0)
    o.location = (-160 * 3 - 4, 0, -1.2)
    out["ocean"] = (o, md)
    # tetrapod band
    mb = MB()
    for y in range(y0, y1, 2):
        for k in range(2):
            tetrapod(mb, (rng.uniform(-6.5, -2.0), y + rng.uniform(-0.8, 0.8), rng.uniform(-1.0, 0.2)), rng.uniform(0, 6.28), rng.uniform(0, 6.28), 0, rng.uniform(0.9, 1.2))
    out["tetrapods"] = mb.build("Tetrapods", [principled("TetraConcrete", (0.5, 0.49, 0.46), rough=0.9)])
    # sea wall + promenade + parapet
    mb = MB()
    mb.box((-0.8, 0, -0.4), (2.0, y1 - y0, 2.6), 0)
    mb.box((4.0, 0, 0.45), (8.0, y1 - y0, 0.9), 1)                 # promenade slab (top at 0.9)
    mb.box((0.25, 0, 1.25), (0.5, y1 - y0, 0.7), 0)                 # low parapet people sit on
    out["prom"] = mb.build("Promenade", [principled("SeaWall", (0.55, 0.53, 0.5), rough=0.85), M["pavers"]])
    # road
    bpy.ops.mesh.primitive_plane_add(size=1, location=(15, 0, 0.9))
    road = bpy.context.active_object; road.scale = (14, y1 - y0, 1); set_mat(road, M["road"])
    bpy.ops.mesh.primitive_plane_add(size=3000, location=(22 + 1500, 0, 0.88))  # land only (east of the road)
    g = bpy.context.active_object; set_mat(g, M["concrete"])
    # Queen's-necklace lamp posts along the promenade
    mb = MB()
    for y in range(y0, y1, 24):
        mb.box((7.6, y, 5.0), (0.16, 0.16, 8.2), 0)
        mb.box((6.9, y, 8.9), (1.5, 0.1, 0.1), 0)
    out["lamps"] = mb.build("Lamps", [M["metal"]])
    # art-deco row, facing the sea (-X)
    out["buildings"] = []
    y = y0 + 20
    i = 0
    while y < y1 - 20:
        w = rng.uniform(16, 26)
        ob, sg, H = india.building(f"Deco{i}", 0.0, w - 1.5, 1, rng, y_face=0.0, floors=rng.randint(4, 7), paint=rng.choice(DECO))
        sg.parent = ob
        rot = Matrix.Rotation(-math.pi / 2, 4, "Z")
        ob.matrix_world = Matrix.Translation((24.0, y, 0.9)) @ rot
        out["buildings"].append(ob)
        y += w
        i += 1
    # distant towers behind (Malabar Hill skyline feel)
    mb = MB()
    for k in range(30):
        h = rng.uniform(60, 160)
        mb.box((rng.uniform(70, 240), rng.uniform(y0, 0), h / 2), (rng.uniform(14, 26), rng.uniform(14, 26), h), 0)
    out["towers"] = mb.build("Towers", [india.paint_material((0.75, 0.76, 0.78), "TowerPaint")])
    return out


def add_wave(frames, x_fn, height=70, length=1600):
    ww = wave_wall(length=length, height=height, loc=(-900, 0, -2))
    for f in frames:
        ww.location.x = x_fn(f)
        ww.keyframe_insert("location", frame=f)
    return ww
