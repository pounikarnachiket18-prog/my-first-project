"""S5E — 46-47 s. Slow-motion macro: her hand closes on the orange harness."""
import math, random
import bpy
from mathutils import Vector
from common import camera, key_cam_path, lerp
import lf_common as L
import lf_world as W
from heli import Heli
import character as C
from S5A import G
FRAMES = 26


def build():
    L.setup(samples=8, blur=True)
    W.dusk_dust_light(sun_elev=12, sun_az=200, sun=2.4)
    rng = random.Random(75)
    W.skyline(rng, n=60, rings=(60, 500), cx=G.x, cy=G.y)
    g = C.make_girl(loc=tuple(G), heading=math.radians(160))
    frames = list(range(0, FRAMES + 1))
    for f in frames:
        g.pose(C.reach_up(f / 24 * 0.4, 1.0))
        C.grip_fingers(g, "Right", min(1.0, max(0.0, (f - 6) / 14)))
        for pb in g.arm.pose.bones:
            pb.keyframe_insert("rotation_quaternion", frame=f)
    bpy.context.scene.frame_set(20); bpy.context.view_layer.update()
    hand = g.arm.matrix_world @ g.arm.pose.bones["RightHand"].head
    h = Heli(with_pilot=False)   # only its harness and cable appear in frame
    h.root.location = hand + Vector((0.2, 1.72, 12.3)) - Vector((0, 0, 2.4)) + Vector((0, 0, 0))
    for f in frames:
        h.root.location = hand + Vector((0.25, 1.72, 10.0)) + Vector((0, 0, 0.04 * (FRAMES - f)))
        h.root.keyframe_insert("location", frame=f)
        h.set_cable(f, 7.7 + 0.04 * (FRAMES - f), swing=(0.02 * math.sin(f * 0.3), 0.02))
    # the harness swings into her palm and her fingers close on it
    for f in frames:
        t = min(1.0, f / 12)
        h.harness.location = hand + Vector((0.0, 0.0, 0.07)) + Vector((0.18, 0.1, 0.3)) * (1 - t) ** 2
        h.harness.rotation_euler = (0.3 * (1 - t), 0.2, 1.2 + 0.4 * (1 - t))
        h.harness.keyframe_insert("location", frame=f); h.harness.keyframe_insert("rotation_euler", frame=f)
    h.harness.scale = (0.45, 0.45, 0.45)
    cam = camera(lens=60, fstop=2.8, dof_obj=1.1, clip=(0.01, 3000))
    key_cam_path(cam, frames, lambda f: hand + Vector((0.8, -0.65, -0.1)) + L.handheld(f, amp=0.006, seed=101, speed=0.15)[0],
                 lambda f: hand + Vector((0.05, 0, 0.12)), roll_fn=lambda f: math.radians(-8), focus_fn=lambda f: 1.05)
    from city import fog_all
    fog_all((0.64, 0.57, 0.48), 0.006, 1.0)
