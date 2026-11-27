"""S5F — 47-49 s. The cable bites, she is lifted off the roof, and the helicopter claws away."""
import math, random
from mathutils import Vector
from common import camera, key_cam_path, lerp, ease_in
import lf_common as L
from heli import Heli, key_rotors, key_beacons
import character as C
from S5A import G
FRAMES = 50
H0 = L.ROOF + Vector((2.0, -2.0, 14.0))


def hpos(f):
    t = ease_in(f / FRAMES, 2.2)
    return H0 + Vector((40 * t, 6 * t, 10 * t + 1.5 * min(1, f / 12)))


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(76)
    L.city(rng, towers=150)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    for f in frames:
        h.root.location = hpos(f) + Vector((0.2 * math.sin(f * 0.5), 0, 0.15 * math.sin(f * 0.7)))
        h.root.rotation_euler = (0.06 * math.sin(f * 0.4), 0.12 * min(1, f / 20), 0)
        h.root.keyframe_insert("location", frame=f); h.root.keyframe_insert("rotation_euler", frame=f)
        h.set_cable(f, 12.4, swing=(0.0, -0.25 * min(1, f / 25)))
    key_rotors(h, frames); key_beacons(h, frames)
    g = C.make_girl(loc=tuple(G), heading=math.radians(160))
    import bpy
    for f in frames:
        bpy.context.scene.frame_set(f)
        bpy.context.view_layer.update()
        end = h.cable.matrix_world @ Vector((0, 0, -1.0))
        foot = end - Vector((0, 0, 1.25 * 0.78 + 0.35))
        lift = min(1.0, max(0.0, (f - 4) / 6))
        loc = Vector(G).lerp(foot, lift) if f < 10 else foot
        g.key(f, C.hanging(f / 24) if f >= 6 else C.reach_up(f / 24, 1.0), loc=tuple(loc))
    cam = camera(lens=24, fstop=8, dof_obj=20)
    key_cam_path(cam, frames, lambda f: G + Vector((-14, -16, 3.0)) + L.handheld(f, amp=0.08, seed=111)[0],
                 lambda f: (G + Vector((0, 0, 4))).lerp(hpos(f), 0.45), roll_fn=lambda f: math.radians(-5))
    L.finish(cam, frames, rng, dust_region=((G.x - 40, G.x + 60), (G.y - 40, G.y + 40), (G.z, G.z + 30)), n=36, wind=(1.8, 0.3, 0.2))
