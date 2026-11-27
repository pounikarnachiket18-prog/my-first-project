"""S1A — 0-4 s. Extreme close-up: red master-warning lights reflected in Arjun's helmet visor. 85 mm, shallow DOF,
slow push-in, subtle handheld. "Control... something is wrong." """
import math, random
from mathutils import Vector
import common
from common import camera, key_cam_path, lerp, ease_in_out
import lf_common as L
import lf_world as W
from heli import Heli, key_beacons, pilot_pose
FRAMES = 98


def warn_flash(h, frames, blackout=None):
    for f in frames:
        on = (f // 5) % 2 == 0
        off = blackout and blackout[0] <= f < blackout[1]
        for w in h.warn:
            s = 1.0 if (on and not off) else 0.02
            w.scale = (0.05, 0.12 * (1 if s > 0.5 else 0.2), 0.04 * s)
            w.keyframe_insert("scale", frame=f)
        h.redfill.data.energy = 0.0 if off else (9.0 if on else 2.0)
        h.redfill.data.keyframe_insert("energy", frame=f)
        for p, e in h.mfds:
            e.inputs[1].default_value = 0.0 if off else (3.0 if (f * 7) % 11 else 1.2)
            e.inputs[1].keyframe_insert("default_value", frame=f)


def build():
    L.setup(samples=10, blur=False)
    W.dusk_dust_light(sun_elev=8, sun_az=160, sun=1.2, sky=0.35)
    h = Heli()
    frames = list(range(0, FRAMES + 1))
    for f in frames[::2]:
        h.pilot.key(f, pilot_pose(f / 24, struggle=0.25 + 0.5 * (f / FRAMES)))
    warn_flash(h, frames)
    bpy = __import__("bpy")
    vis = bpy.data.objects["pilot_visor"] if "pilot_visor" in bpy.data.objects else None
    bpy.context.view_layer.update()
    head = h.pilot.arm.matrix_world @ h.pilot.arm.pose.bones["Head"].head
    tgt = head + Vector((0.08, 0.0, 0.08))
    cam = camera(lens=85, fstop=1.6, dof_obj=0.6, clip=(0.01, 3000))

    def pos(f):
        t = ease_in_out(f / FRAMES)
        d = lerp(0.72, 0.5, t)
        off, _ = L.handheld(f, amp=0.006, seed=1)
        return tgt + Vector((d * 0.92, d * 0.38, -0.02)) + off

    key_cam_path(cam, frames, pos, lambda f: tgt + Vector((0, 0, -0.01)),
                 roll_fn=lambda f: math.radians(-4) + L.handheld(f, rot=0.6, seed=2)[1],
                 focus_fn=lambda f: (pos(f) - tgt).length - 0.04)
