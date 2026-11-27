"""Exports per-frame screen positions (0..1, origin top-left) of the Sun and the India marker in E2,
plus whether the marker is in daylight, for the Remotion labels:  public/earth/renders/E2/track.json"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "shots"))
import bpy
from bpy_extras.object_utils import world_to_camera_view
import E2, common

E2.build()
sc = bpy.context.scene
cam = sc.camera
mk = bpy.data.objects["Marker"]
earth = bpy.data.objects["EarthTilt"]
sun = bpy.data.objects["Sun"]
out = []
for f in range(0, E2.FRAMES + 1):
    sc.frame_set(f)
    m = world_to_camera_view(sc, cam, mk.matrix_world.translation)
    e = world_to_camera_view(sc, cam, earth.matrix_world.translation)
    s = world_to_camera_view(sc, cam, sun.matrix_world.translation)
    n = (mk.matrix_world.translation - earth.matrix_world.translation).normalized()
    to_sun = (sun.matrix_world.translation - earth.matrix_world.translation).normalized()
    out.append({"m": [round(m.x, 4), round(1 - m.y, 4)], "e": [round(e.x, 4), round(1 - e.y, 4)], "s": [round(s.x, 4), round(1 - s.y, 4)],
                "day": bool(n.dot(to_sun) > 0), "front": bool((cam.matrix_world.translation - mk.matrix_world.translation).dot(n) > 0)})
path = os.path.join(common.RENDERS, "E2", "track.json")
os.makedirs(os.path.dirname(path), exist_ok=True)
json.dump(out, open(path, "w"))
print("wrote", path, out[0], out[90], out[-1])
