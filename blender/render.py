"""
Render frames from the scene built by build_scene.py.

    python render.py --blend scene.blend --out frames/ [--frames 0,120,500] [--range 0:1614]
                     [--pct 100] [--samples 24]

Already-rendered frames are skipped, so an interrupted render can be resumed.
"""
import bpy, argparse, os, sys, time

ap = argparse.ArgumentParser()
ap.add_argument("--blend", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--frames", default="")
ap.add_argument("--range", default="")
ap.add_argument("--step", type=int, default=1)
ap.add_argument("--pct", type=int, default=100)
ap.add_argument("--samples", type=int, default=0)
ap.add_argument("--threads", type=int, default=0)
args, _ = ap.parse_known_args(sys.argv[1:])

bpy.ops.wm.open_mainfile(filepath=os.path.abspath(args.blend))
scn = bpy.context.scene
scn.render.resolution_percentage = args.pct
if args.samples:
    scn.cycles.samples = args.samples
scn.cycles.device = "CPU"
scn.render.threads_mode = "FIXED" if args.threads else "AUTO"
if args.threads:
    scn.render.threads = args.threads
scn.render.use_persistent_data = True

if args.frames:
    frames = [int(f) for f in args.frames.split(",")]
else:
    a, b = (args.range or f"{scn.frame_start}:{scn.frame_end + 1}").split(":")
    frames = list(range(int(a), int(b), args.step))

# camera for a frame = camera of the last marker at or before it
markers = sorted([m for m in scn.timeline_markers if m.camera], key=lambda m: m.frame)
def cam_for(f):
    c = markers[0].camera
    for m in markers:
        if m.frame <= f:
            c = m.camera
    return c

os.makedirs(args.out, exist_ok=True)
for f in frames:
    path = os.path.join(os.path.abspath(args.out), f"f_{f:04d}.png")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        continue
    t = time.time()
    scn.frame_set(f)
    scn.camera = cam_for(f)
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print(f"frame {f} {time.time() - t:.1f}s", flush=True)
