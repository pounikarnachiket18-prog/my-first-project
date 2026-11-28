"""Render driver for THE LAST FLIGHT (24 fps). Reuses the Earth reel's Blender kit.

  /opt/bpyenv/bin/python lastflight/blender/render.py S4A                 # full shot
  /opt/bpyenv/bin/python lastflight/blender/render.py S4A --only 0,40     # test frames
"""
import argparse, importlib, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path[:0] = [HERE, os.path.join(HERE, "shots"), os.path.join(VIDEO, "earth", "blender")]
import bpy  # noqa
import common  # noqa
common.FPS = 24
common.RENDERS = os.path.join(VIDEO, "public", "lastflight", os.environ.get("LF_RENDERS", "renders_day"))  # renders/ holds the earlier dusk version

ap = argparse.ArgumentParser()
ap.add_argument("shot"); ap.add_argument("--only", default=""); ap.add_argument("--pct", type=int, default=100)
ap.add_argument("--samples", type=int, default=0); ap.add_argument("--out", default="")
a = ap.parse_args()
mod = importlib.import_module(a.shot)
mod.build()
sc = bpy.context.scene
sc.render.fps = 24
sc.render.resolution_percentage = a.pct
if a.samples:
    sc.cycles.samples = a.samples
only = [int(x) for x in a.only.split(",") if x != ""] or None
t = time.time()
common.render_frames(a.out or a.shot, 0, mod.FRAMES - 1, only=only)
n = len(only) if only else mod.FRAMES
print(f"DONE {a.out or a.shot}: {n} frames in {time.time() - t:.1f}s ({(time.time() - t) / max(1, n):.2f}s/frame)")
