"""S4C — 28-29.5 s. Close-up: Arjun's gloved hand fighting the cyclic, the stick shuddering."""
import math, random
import bpy
from mathutils import Vector
from common import camera, key_cam_path
import lf_common as L
import lf_world as W
from heli import Heli, pilot_pose
import character as C
FRAMES = 38


def build():
    L.setup(samples=8, blur=True)
    W.dusk_dust_light(sun_elev=10, sun_az=200, sun=1.6, sky=0.5)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    p = h.pilot
    for f in frames:
        p.pose(pilot_pose(f / 24, struggle=1.0))
        C.grip_fingers(p, "Right", 1.0)
        for pb in p.arm.pose.bones:
            pb.keyframe_insert("rotation_quaternion", frame=f)
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    hand = p.arm.matrix_world @ p.arm.pose.bones["RightHand"].head
    for f in frames:  # the whole airframe shudders
        h.root.location = L.handheld(f, amp=0.012, seed=31, speed=1.2)[0]
        h.root.keyframe_insert("location", frame=f)
    from common import area_light
    key = area_light("WindowKey", hand + Vector((0.6, -1.4, 0.6)), hand, size=1.2, power=220, color=(1.0, 0.85, 0.7))
    rim = area_light("WarnRim", hand + Vector((0.5, 0.4, 0.35)), hand, size=0.3, power=40, color=(1.0, 0.1, 0.04))
    cam = camera(lens=70, fstop=4.0, dof_obj=0.75, clip=(0.01, 3000))
    key_cam_path(cam, frames, lambda f: hand + Vector((0.45, 0.55, 0.2)) + L.handheld(f, amp=0.01, seed=32)[0],
                 lambda f: hand + Vector((0.02, 0, -0.02)), roll_fn=lambda f: math.radians(-10) + L.handheld(f, rot=1.5, seed=33)[1],
                 focus_fn=lambda f: 0.74)
