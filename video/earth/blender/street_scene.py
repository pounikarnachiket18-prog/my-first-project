"""Variants of the Mumbai street for each shot."""
import math, random
import bpy
from mathutils import Vector
from common import reset, camera, key_cam_path, lerp, ease_in_out
import mumbai as MU
import character as C

HERO_POS = (0.0, -1.2, 0.0)


def drive(vehicles, frames, speed=8.0 / 30):
    from common import iter_fcurves
    for v in vehicles:
        x0 = v.location.x
        d = 1.0 if abs(math.cos(v.rotation_euler.z) - 1) < 0.1 else -1.0
        for f in (frames[0], frames[-1]):
            v.location.x = x0 + d * speed * f
            v.keyframe_insert("location", frame=f)
        for fc in iter_fcurves(v.animation_data.action):
            for k in fc.keyframe_points:
                k.interpolation = "LINEAR"


def walkers(people, frames, speed=1.3 / 30):
    for i, p in enumerate(people):
        x0 = p.root.location.x
        d = 1.0 if abs(p.root.rotation_euler.z - math.pi / 2) < 0.1 else -1.0
        # heading +pi/2 faces +X? character faces -Y at heading 0; heading +pi/2 -> faces +X
        for f in frames:
            if f % 2 == 0 or f == frames[-1]:
                p.key(f, C.walk(f * 0.28 + i), loc=(x0 + d * speed * f, p.root.location.y, p.root.location.z))


def base(seed=3, res=(648, 1152), samples=4, blur=False, **kw):
    reset(res=res, samples=samples, motion_blur=blur)
    rng = random.Random(seed)
    MU.setup_world()
    st, loose = MU.build(rng, **kw)
    return rng, st, loose


def clear_near(loose, x_max, y_side=-1, margin_y=(-8, -4.6)):
    """Remove loose things on the camera's footpath west of x_max (they would fly through the lens)."""
    keep = []
    for p in loose["people"]:
        if p.root.location.x < x_max and margin_y[0] < p.root.location.y < margin_y[1]:
            for o in p.meshes + [p.arm, p.root]:
                try:
                    bpy.data.objects.remove(o, do_unlink=True)
                except ReferenceError:
                    pass
        else:
            keep.append(p)
    loose["people"] = keep
    keep = []
    for c in loose["clutter"]:
        if c.location.x < x_max and margin_y[0] < c.location.y < margin_y[1]:
            bpy.data.objects.remove(c, do_unlink=True)
        else:
            keep.append(c)
    loose["clutter"] = keep
