"""D4 / E1 shared wreck scene — "...duniya bhar mein unimaginable destruction!" aftermath."""
import math
from common import camera, key_cam_path, lerp, ease_in_out
import street_scene as S
import character as C

FRAMES = 78


def wreck(seed=13, keep_clear=None):
    rng, st, loose = S.base(seed=seed, x_min=-60, x_max=120, crowd=0, clutter_n=220, blur=False)
    import bpy
    if keep_clear:
        keep = []
        for v in loose["vehicles"]:
            if abs(v.location.x - keep_clear[0]) < keep_clear[1] and v.location.y < 0:
                bpy.data.objects.remove(v, do_unlink=True)
            else:
                keep.append(v)
        loose["vehicles"] = keep
    for v in loose["vehicles"]:
        v.location.x += rng.uniform(-3, 3)
        v.location.y += rng.uniform(-1.5, 1.5)
        k = rng.random()
        if k < 0.35:
            v.rotation_euler = (math.pi, 0, rng.uniform(0, 6.28)); v.location.z = 1.6
        elif k < 0.7:
            v.rotation_euler = (math.pi / 2 * rng.choice([1, -1]), 0, rng.uniform(0, 6.28)); v.location.z = 0.8
        else:
            v.rotation_euler = (rng.uniform(-0.2, 0.2), rng.uniform(-0.2, 0.2), rng.uniform(0, 6.28))
    for c in loose["clutter"]:
        c.location.y = rng.uniform(-6.5, 6.5)
        if keep_clear and abs(c.location.x - keep_clear[0]) < 6 and c.location.y < 1.0:
            c.location.y += 3.5
        c.rotation_euler = (rng.uniform(0, 3.1), rng.uniform(0, 3.1), rng.uniform(0, 6.3))
    for sg in loose["signs"][::2]:
        if keep_clear and abs(sg.location.x - keep_clear[0]) < keep_clear[1]:
            continue
        sg.location.z = 0.05; sg.location.y *= 0.6
        sg.rotation_euler = (rng.uniform(-0.2, 0.2), rng.uniform(-0.2, 0.2), rng.uniform(0, 6.28))
    for trunk, crowns in loose["trees"]:
        trunk.rotation_euler = (0, rng.uniform(0.9, 1.4), 0)
        for c in crowns:
            c.hide_render = rng.random() < 0.8
    for pole in loose["poles"][::3]:
        pole.rotation_euler = (rng.uniform(-0.3, 0.3), rng.uniform(0.3, 0.6), 0)
    return rng, st, loose


def build():
    rng, st, loose = wreck()
    cam = camera(lens=20, fstop=5.6, dof_obj=14)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (-14 + 4 * ease_in_out(f / FRAMES), -3.0, lerp(1.2, 6.5, ease_in_out(f / FRAMES))),
                 lambda f: (20, 0.5, lerp(1.5, 0.8, f / FRAMES)))
