"""
List the frames in which any branded item can be seen: the T-shirt print, the ID cards, the detector's logo plate
and anything else in the brand colour. After a branding change only those frames need rendering again.

    python brand_frames.py --blend build/reel.blend --out build/brand_frames.txt
"""
import argparse, sys
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ap = argparse.ArgumentParser()
ap.add_argument("--blend", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--only-mats", default="", help="comma list: only these materials count (no T-shirt check)")
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
bpy.ops.wm.open_mainfile(filepath=args.blend)
scn = bpy.context.scene
markers = sorted([m for m in scn.timeline_markers if m.camera], key=lambda m: m.frame)
PASS = ("ghost", "glass", "field", "xray", "x-ray", "eddy", "pulse", "line", "arrow", "wave")


def cam_at(f):
    c = markers[0].camera
    for m in markers:
        if m.frame <= f:
            c = m.camera
    return c


def passable(ob):
    if ob.type == "CURVE":
        return True
    names = [s.material.name.lower() for s in ob.material_slots if s.material]
    return any(p in n for n in names for p in PASS) or ob.name.lower().startswith(("field", "eddy", "pillar"))


torso = bpy.data.objects["Torso"]
# points on the front of the shirt, found by casting at the evaluated mesh in the torso's own space
ev = torso.evaluated_get(bpy.context.evaluated_depsgraph_get())
local = []
pts = [(x, z) for x in (-0.12, -0.06, 0.0, 0.06, 0.12) for z in (1.18, 1.25, 1.32, 1.39)]
pts += [(0.0, 1.44), (0.0, 1.47), (-0.1, 1.37)]   # where the placket and the old chest badge were
for x, z in pts:
    if True:
        hit, co, no, _ = ev.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        if hit:
            local.append((co, no))
assert local, "no shirt-front points found"

# other branded objects: sample a grid over every face of their evaluated meshes
BRAND_MATS = set(args.only_mats.split(",")) if args.only_mats else {"IDCard", "Brand", "BrandPlate", "PlateArt"}
dg0 = bpy.context.evaluated_depsgraph_get()
others = []
for ob in scn.objects:
    if ob.type != "MESH" or not any(s.material and s.material.name in BRAND_MATS for s in ob.material_slots):
        continue
    me = ob.evaluated_get(dg0).to_mesh()
    pts = []
    for poly in me.polygons:
        vs = [me.vertices[i].co for i in poly.vertices]
        c = poly.center
        pts.append(c.copy())
        pts += [c.lerp(v, k) for v in vs for k in (0.5, 0.95)]
    others.append((ob, pts[:: max(1, len(pts) // 60)]))
    ob.evaluated_get(dg0).to_mesh_clear()
print("branded objects:", ", ".join(o.name for o, _ in others))
def visible(ob, p, cpos, dg, n=None):
    if n is not None and n.dot((cpos - p).normalized()) < -0.05:
        return False
    s = world_to_camera_view(scn, cam, p)
    if not (-0.02 <= s.x <= 1.02 and -0.02 <= s.y <= 1.02 and s.z > 0):
        return False
    o = cpos.copy(); d = (p - cpos); dist = d.length; d.normalize()
    for _ in range(8):
        hit, loc, _, _, hob, _ = scn.ray_cast(dg, o, d, distance=dist + 0.01)
        if not hit or hob.name == ob.name or (loc - p).length < 0.004:
            return True
        if not passable(hob):
            return False
        dist -= (loc - o).length; o = loc + d * 1e-3
    return False


seen = []
for f in range(scn.frame_start, scn.frame_end + 1):
    scn.frame_set(f)
    cam = cam_at(f); scn.camera = cam
    dg = bpy.context.evaluated_depsgraph_get()
    cpos = cam.matrix_world.translation
    mw = torso.matrix_world; nm = mw.to_3x3()
    vis = not args.only_mats and any(visible(torso, mw @ co, cpos, dg, (nm @ no).normalized()) for co, no in local)
    if not vis:
        for ob, pts in others:
            if ob.hide_render or not ob.visible_get():
                continue
            mw = ob.matrix_world
            if any(visible(ob, mw @ p, cpos, dg) for p in pts):
                vis = True; break
    if vis:
        seen.append(f)
# two frames of margin either side for motion blur
seen = sorted({g for f in seen for g in range(f - 2, f + 3) if scn.frame_start <= g <= scn.frame_end})
open(args.out, "w").write(",".join(map(str, seen)))
runs, a = [], None
for i, f in enumerate(seen):
    if a is None: a = f
    if i + 1 == len(seen) or seen[i + 1] != f + 1:
        runs.append(f"{a}-{f}"); a = None
print(f"{len(seen)} of {scn.frame_end - scn.frame_start + 1} frames show branding: {' '.join(runs)}")
