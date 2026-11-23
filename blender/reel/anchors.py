"""
Export the on-screen position of every label anchor (empties named LBL_*) for each frame, using the same
camera-per-marker rule as ../render.py. post.py draws the label pills and leader lines from this file.

    python anchors.py --blend build/reel.blend --out build/anchors.json
"""
import bpy, argparse, json, os, sys
from bpy_extras.object_utils import world_to_camera_view

ap = argparse.ArgumentParser()
ap.add_argument("--blend", required=True)
ap.add_argument("--out", required=True)
args, _ = ap.parse_known_args(sys.argv[1:])

bpy.ops.wm.open_mainfile(filepath=os.path.abspath(args.blend))
scn = bpy.context.scene
markers = sorted([m for m in scn.timeline_markers if m.camera], key=lambda m: m.frame)


def cam_for(f):
    c = markers[0].camera
    for m in markers:
        if m.frame <= f:
            c = m.camera
    return c


anchors = [o for o in scn.objects if o.name.startswith("LBL_")]
out = {}
for f in range(scn.frame_start, scn.frame_end + 1):
    scn.frame_set(f)
    cam = cam_for(f)
    row = {}
    for a in anchors:
        co = world_to_camera_view(scn, cam, a.matrix_world.translation)
        if co.z > 0:
            row[a.name[4:]] = [round(co.x, 4), round(1 - co.y, 4)]   # 0..1, origin top-left
    out[f] = row
json.dump(out, open(args.out, "w"))
print("anchors ->", args.out, len(out), "frames")
