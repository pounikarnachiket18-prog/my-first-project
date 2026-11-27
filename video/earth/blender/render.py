"""Render driver.

  /opt/bpyenv/bin/python earth/blender/render.py A1                # full shot
  /opt/bpyenv/bin/python earth/blender/render.py A1 --only 0,40,80 # test frames
  /opt/bpyenv/bin/python earth/blender/render.py A1 --pct 50       # half-res preview

Every shot lives in earth/blender/shots/<id>.py and exposes
  FRAMES = N            (frames 0..N-1, rendered to public/earth/renders/<id>/0000.jpg ...)
  def build(): ...      (builds the complete scene)
"""
import argparse, importlib, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "shots"))

import bpy  # noqa: E402
import common  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("shot")
ap.add_argument("--only", default="")
ap.add_argument("--pct", type=int, default=100)
ap.add_argument("--samples", type=int, default=0)
ap.add_argument("--step", type=int, default=1)
ap.add_argument("--out", default="")
a = ap.parse_args()

mod = importlib.import_module(a.shot)
mod.build()
sc = bpy.context.scene
sc.render.resolution_percentage = a.pct
if a.samples:
    sc.cycles.samples = a.samples
only = [int(x) for x in a.only.split(",") if x != ""] or None
name = a.out or a.shot
t = time.time()
common.render_frames(name, 0, mod.FRAMES - 1, step=a.step, only=only)
n = len(only) if only else len(range(0, mod.FRAMES, a.step))
print(f"DONE {name}: {n} frames in {time.time() - t:.1f}s ({(time.time() - t) / max(1, n):.2f}s/frame)")
