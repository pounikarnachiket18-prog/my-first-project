"""Export screen-space positions of story-relevant points from the Blender cameras.

The finishing pass uses these to pin animated callouts (rostrum, egg, larva, pupa, exit hole)
to the real 3D subjects and to aim punch-in zooms at them.

Usage (Blender Python): venv/bin/python tools/track.py
Output: assets/tracking.json  {name: {frame: [x_px, y_px, px_per_mm] in the 1080x1920 frame}}
"""
import json
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import bpy  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

from lib import grains  # noqa: E402
from lib.scenes import HERO_SEED, HX  # noqa: E402

BLEND = os.path.join(ROOT, "scenes", "rice_weevil_documentary.blend")
OUT = os.path.join(ROOT, "assets", "tracking.json")
STEP = 2  # sample every 2nd frame; consumers interpolate


def crest_top(x):
    return grains.crest_fn(grains.grain_mesh(HERO_SEED))(x)


def main():
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    top_hx, top_ex = crest_top(HX), crest_top(0.6)
    O = bpy.data.objects
    # (track name, scene, frame range, world-point function)
    jobs = [
        ("rostrum", "S2_Invader", (181, 390),
         lambda: O["S2W_head"].matrix_world @ Vector((0.80, 0, -0.42))),
        ("antenna", "S2_Invader", (181, 390),
         lambda: O["S2W_head"].matrix_world @ Vector((0.45, 0.25, 0.25))),
        ("drill", "S3_SecretEgg", (391, 630),
         lambda: O["S3_Grain"].matrix_world @ Vector((HX, 0, top_hx))),
        ("egg", "S3_SecretEgg", (560, 630),
         lambda: O["S3_Egg"].matrix_world.translation),
        ("egg4", "S4_HiddenDestruction", (631, 700),
         lambda: O["S4_Egg"].matrix_world.translation),
        ("larva", "S4_HiddenDestruction", (631, 930),
         lambda: O["S4_Larva"].matrix_world.translation),
        ("pupa", "S5_Transformation", (931, 1200),
         lambda: O["S5_Pupa_thorax"].matrix_world.translation),
        ("adult5", "S5_Transformation", (931, 1200),
         lambda: O["S5W_body"].matrix_world.translation),
        ("exit", "S6_FinalReveal", (1201, 1410),
         lambda: O["S6_Grain"].matrix_world @ Vector((0.6, 0, top_ex))),
        ("hero1", "S1_Mystery", (1, 180),
         lambda: O["S1Hero_body"].matrix_world.translation),
        ("hook", "S0_Hook", (2001, 2060),
         lambda: O["S0W_head"].matrix_world.translation),
    ]
    out = {}
    for name, sc, (a, b), fn in jobs:
        scn = bpy.data.scenes[sc]
        bpy.context.window.scene = scn
        bpy.context.view_layer.update()
        rx, ry = scn.render.resolution_x, scn.render.resolution_y
        d = {}
        frames = list(range(a, b + 1, STEP))
        if frames[-1] != b:
            frames.append(b)
        for f in frames:
            scn.frame_set(f)
            wp = fn()
            co = world_to_camera_view(scn, scn.camera, wp)
            # true scale: screen pixels per millimetre at the subject's depth
            right = scn.camera.matrix_world.to_3x3().col[0].normalized()
            c2 = world_to_camera_view(scn, scn.camera, wp + right)
            ppm = math.hypot((c2.x - co.x) * rx, (c2.y - co.y) * ry)
            d[f] = [round(co.x * rx, 1), round((1 - co.y) * ry, 1), round(ppm, 2)]
        out[name] = d
        print("tracked", name, len(d), flush=True)
    with open(OUT, "w") as fh:
        json.dump(out, fh)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
