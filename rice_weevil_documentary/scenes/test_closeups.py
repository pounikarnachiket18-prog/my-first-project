"""Close-up anatomy check renders. Usage: python test_closeups.py outdir"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import bpy
from mathutils import Vector
from lib import core, creatures, grains, rigs
from lib import materials as M
out = sys.argv[1]
scn = core.new_scene("T", 1, 1, samples=16)
coll = core.new_collection(scn, "C"); core.TARGET = coll
rigs.world_gradient(scn); rigs.ground(coll, z=0, color=(0.05, 0.045, 0.04))
rig = creatures.build_weevil("W", coll=coll)
creatures.animate_weevil(rig, 1, 1, lambda f: (Vector((0, 0, 0)), 0.0, 0.0))
lv, _ = creatures.build_larva(coll=coll); lv.location = (0, 8, 1.0)
pu, _, _ = creatures.build_pupa(coll=coll); pu.location = (0, 16, 0.5)
rigs.area_light("K", coll, (6, -8, 10), (0, 0, 0), 2500, size=8)
rigs.area_light("R", coll, (-6, 10, 5), (0, 0, 0), 2500, size=4, color=rigs.COOL)
rigs.area_light("K2", coll, (6, 0, 10), (0, 8, 0), 2500, size=8)
rigs.area_light("K3", coll, (6, 8, 10), (0, 16, 0), 2500, size=8)
cam, tgt, foc = rigs.camera("Cam", coll, lens=50, fstop=16); scn.camera = cam
scn.render.resolution_percentage = 35
views = {"w_side": ((0, -9, 1.2), (0.1, 0, 0.45)), "w_top": ((0.01, 0, 9), (0.1, 0, 0)),
         "w_34": ((5, -5.5, 3.5), (0.1, 0, 0.4)), "larva": ((3, 3, 3.5), (0, 8, 1.0)),
         "pupa": ((3, 11.5, 3.5), (-0.2, 16, 0.6))}
for k, (cl, tl) in views.items():
    cam.location = cl; tgt.location = tl; foc.location = tl
    scn.render.filepath = os.path.join(out, k + ".png")
    bpy.ops.render.render(write_still=True, scene=scn.name)
