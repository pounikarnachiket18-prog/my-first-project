"""THE INVISIBLE INVADER — Blender build / preview / render driver.

  python main.py build                                   # build all 7 scenes -> scenes/*.blend
  python main.py preview S3_SecretEgg 400,480,620 [pct] [samples]
  python main.py render  S3_SecretEgg [pct] [samples]    # resumable PNG sequence
  python main.py render  ALL [pct] [samples]
  python main.py render  S1_Mystery 50 16 --force --frames=22-180   # re-render part of a scene

Run with Blender's Python module (bpy 4.5) or `blender -b -P main.py -- <args>`.
"""
import os
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

import bpy  # noqa: E402

BLEND = os.path.join(ROOT, "scenes", "rice_weevil_documentary.blend")
FRAMES = os.path.join(ROOT, "renders", "frames")
PREVIEW = os.path.join(ROOT, "renders", "preview")


def args():
    a = sys.argv[1:]
    if "--" in a:
        a = a[a.index("--") + 1:]
    return a


def build():
    from lib import scenes
    t = time.time()
    default = bpy.data.scenes[0]
    for b in scenes.BUILDERS:
        s = b()
        print(f"built {s.name}: frames {s.frame_start}-{s.frame_end}, "
              f"{len(s.collection.all_objects)} objects")
    bpy.data.scenes.remove(default)
    os.makedirs(os.path.dirname(BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, compress=True)
    print(f"saved {BLEND} in {time.time() - t:.1f}s")


def load():
    bpy.ops.wm.open_mainfile(filepath=BLEND)


def activate(scn):
    """Make scn the window scene and rebuild its depsgraph, otherwise background-mode
    frame_set() does not evaluate animation for scenes that were inactive at load."""
    bpy.context.window.scene = scn
    bpy.context.view_layer.update()


def configure(scn, pct, samples):
    activate(scn)
    scn.render.resolution_percentage = pct
    scn.cycles.samples = samples
    scn.cycles.use_denoising = True
    scn.render.threads_mode = 'AUTO'


def preview(name, frames, pct=25, samples=8, tag="latest"):
    global PREVIEW
    PREVIEW = os.path.join(ROOT, "renders", "preview", tag)
    load()
    scn = bpy.data.scenes[name]
    configure(scn, pct, samples)
    os.makedirs(PREVIEW, exist_ok=True)
    for f in frames:
        scn.frame_set(f)
        scn.render.filepath = os.path.join(PREVIEW, f"{name}_{f:04d}.png")
        t = time.time()
        bpy.ops.render.render(write_still=True, scene=scn.name)
        print(f"PREVIEW {name} f{f} {time.time() - t:.1f}s", flush=True)


def render(name, pct=50, samples=16, force=False, frames=None):
    load()
    names = [s.name for s in sorted(bpy.data.scenes, key=lambda s: s.frame_start)] \
        if name == "ALL" else [name]
    os.makedirs(FRAMES, exist_ok=True)
    for n in names:
        scn = bpy.data.scenes[n]
        configure(scn, pct, samples)
        scn.render.filepath = os.path.join(FRAMES, "frame_")
        scn.render.use_overwrite = False  # resumable
        scn.render.use_placeholder = True
        t = time.time()
        lo, hi = frames or (scn.frame_start, scn.frame_end)
        for f in range(max(lo, scn.frame_start), min(hi, scn.frame_end) + 1):
            out = os.path.join(FRAMES, f"frame_{f:04d}.png")
            if not force and os.path.exists(out) and os.path.getsize(out) > 0:
                continue
            scn.frame_set(f)
            scn.render.filepath = out
            t0 = time.time()
            bpy.ops.render.render(write_still=True, scene=scn.name)
            print(f"FRAME {f} {n} {time.time() - t0:.1f}s", flush=True)
        print(f"DONE {n} in {time.time() - t:.0f}s", flush=True)


if __name__ == "__main__":
    a = args()
    cmd = a[0] if a else "build"
    if cmd == "build":
        build()
    elif cmd == "preview":
        preview(a[1], [int(x) for x in a[2].split(",")], int(a[3]) if len(a) > 3 else 25,
                int(a[4]) if len(a) > 4 else 8, a[5] if len(a) > 5 else "latest")
    elif cmd == "render":
        render(a[1], int(a[2]) if len(a) > 2 else 50, int(a[3]) if len(a) > 3 else 16,
               force="--force" in a,
               frames=next((tuple(int(v) for v in x.split("=")[1].split("-"))
                            for x in a if x.startswith("--frames=")), None))
