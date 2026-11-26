"""Asset sanity render: weevil + grain + egg/larva/pupa. Usage: python test_assets.py out.png [pct] [samples] [view]"""
import math
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

from lib import core, creatures, grains, rigs  # noqa: E402
from lib import materials as M  # noqa: E402

out = sys.argv[1]
pct = int(sys.argv[2]) if len(sys.argv) > 2 else 50
samples = int(sys.argv[3]) if len(sys.argv) > 3 else 32
view = sys.argv[4] if len(sys.argv) > 4 else "side"

scn = core.new_scene("Test", 1, 1, samples=samples)
coll = core.new_collection(scn, "TestColl")
core.TARGET = coll
rigs.world_gradient(scn)
rigs.ground(coll, z=0, color=(0.03, 0.025, 0.02))
rice = M.rice_material("Rice")
g = grains.grain("Hero", rice, seed=3, loc=(0.5, 2.4, 0.78), rot=(0, 0, 0.2), coll=coll)
rig = creatures.build_weevil("W", coll=coll)
creatures.animate_weevil(rig, 1, 1, lambda f: (Vector((0, 0, 0)), 0.3, 0.6))
egg, _ = creatures.build_egg(coll=coll)
egg.location = (-3.2, -1.5, 0.16)
lv, _ = creatures.build_larva(coll=coll)
lv.location = (-2.0, 2.5, 1.0)
pu, _, _ = creatures.build_pupa(coll=coll)
pu.location = (-4.5, 1.5, 0.45)
cam, tgt, foc = rigs.camera("Cam", coll, lens=60, fstop=11)
if view == "side":
    cam.location = (4.0, -6.5, 2.6)
    tgt.location = (0.1, 0.0, 0.5)
elif view == "wide":
    cam.location = (2.0, -16, 7)
    tgt.location = (-1.5, 1.0, 0.5)
else:
    cam.location = (0.2, -0.2, 14)
    tgt.location = (-0.6, 0.6, 0.0)
foc.location = (0.3, 0, 0.6)
scn.camera = cam
rigs.three_point(coll, (0, 0, 0.6), dist=12, key=900, fill=150, rim=1600)
scn.render.resolution_percentage = pct
scn.render.use_motion_blur = False
scn.render.filepath = out
t = time.time()
bpy.ops.render.render(write_still=True, scene=scn.name)
print("RENDER_SECONDS", round(time.time() - t, 1))
