"""C3 — WIDE: buildings shear eastward, facades shred (17.0–20.0 s). Elevated crane shot, slow motion."""
import math, random
from mathutils import Vector
from common import reset, camera, key_cam_path, ease_in_out, lerp
from city import build_street, fling, debris_piece, fog_all
import C1

FRAMES = 94


def sim(f):
    return 0.05 + f / 30 * 0.085  # continuous slow motion (~12x)


def shear(b, frames, amount, tau=0.22):
    me = b.data
    if not me.shape_keys:
        b.shape_key_add(name="Basis")
    sk = b.shape_key_add(name="shear")
    h = max(v.co.z for v in me.vertices) or 1
    for i, v in enumerate(me.vertices):
        z = v.co.z
        sk.data[i].co.x = v.co.x + amount * h * (z / h) ** 1.6
        sk.data[i].co.z = z - 0.08 * amount * h * (z / h) ** 2
    for f in frames:
        sk.value = min(1.0, (1 - math.exp(-sim(f) / tau)) * 1.15)
        sk.keyframe_insert("value", frame=f)


def build():
    reset(motion_blur=True)
    C1.setup_light()
    rng = random.Random(9)
    objs = build_street(x_min=-220, x_max=420)
    frames = range(0, FRAMES + 1)
    # subdivide facades vertically so they can bend
    import bpy
    for b in objs["buildings"]:
        if b.location.x > 400:
            continue
        bpy.context.view_layer.objects.active = b
        md = b.modifiers.new("sub", "SUBDIVIDE") if False else None
        me = b.data
        import bmesh
        bm = bmesh.new(); bm.from_mesh(me)
        edges = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1]
        bmesh.ops.subdivide_edges(bm, edges=edges, cuts=12, use_grid_fill=True)
        bm.to_mesh(me); bm.free()
        shear(b, frames, rng.uniform(0.18, 0.42), tau=rng.uniform(0.18, 0.3))
    cars, people = C1.populate(rng)

    # nothing may fly through the lens: drop south-side props west of the camera
    def gone(o):
        for ch in list(o.children):
            bpy.data.objects.remove(ch, do_unlink=True)
        bpy.data.objects.remove(o, do_unlink=True)
    for t, crowns in list(objs["trees"]):
        if t.location.y < 0:
            for c in crowns:
                bpy.data.objects.remove(c, do_unlink=True)
            gone(t); objs["trees"].remove((t, crowns))
    for lp in list(objs["lamps"]):
        if lp.location.y < 0:
            gone(lp); objs["lamps"].remove(lp)
    for aw in list(objs["debris"]):
        if aw.location.y < 0 and aw.location.x < 20:
            bpy.data.objects.remove(aw, do_unlink=True); objs["debris"].remove(aw)
    keep = []
    for d, c in cars:
        if c.location.y < 0 and c.location.x < 12:
            gone(c)
        else:
            keep.append((d, c))
    cars = keep
    keep = []
    for p in people:
        if p.location.y < 0 and p.location.x < 12:
            gone(p)
        else:
            keep.append(p)
    people = keep
    for _, c in cars:
        fling(c, frames, sim, rng, lift=(0.5, 6), spin=(0.5, 4), ramp=0.1)
    for p in people:
        fling(p, frames, sim, rng, lift=(0.5, 5), spin=(3, 12), ramp=0.08)
    for i in range(320):
        side = rng.choice([1, -1])
        x = rng.uniform(-80, 200)
        d = debris_piece(f"F{i}", (x, side * rng.uniform(9.3, 9.9), rng.uniform(4, 60)), rng, kind=rng.choice(["chunk", "chunk", "plank"]))
        fling(d, frames, sim, rng, lift=(0.0, 4), spin=(3, 16), ramp=0.06, start_delay=rng.uniform(0.0, 0.12))
    for t, crowns in objs["trees"]:
        fling(t, frames, sim, rng, lift=(0, 3), spin=(1, 5), ramp=0.08, start_delay=0.03)
    for lp in objs["lamps"]:
        fling(lp, frames, sim, rng, lift=(0, 2), spin=(1, 4), ramp=0.08, start_delay=0.05)
    for aw in objs["debris"]:
        fling(aw, frames, sim, rng, lift=(1, 6), spin=(2, 10), ramp=0.06)
    fog_all((0.72, 0.58, 0.45), 0.0075, 1.15)
    cam = camera(lens=15, fstop=8, dof_obj=30)
    key_cam_path(cam, frames,
                 lambda f: (lerp(-6, 2, ease_in_out(f / FRAMES)), -7.6, lerp(1.2, 3.2, ease_in_out(f / FRAMES))),
                 lambda f: (lerp(14, 20, f / FRAMES), 9.7, lerp(30, 34, f / FRAMES)),
                 roll_fn=lambda f: math.radians(lerp(-4, -1, f / FRAMES)))
