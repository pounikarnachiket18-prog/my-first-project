"""S6A — 49-53 s. The helicopter flies out of the ruined city toward a sun smothered in dust. Silence.
Radio: "Captain... this was only the beginning." """
import math, random
from mathutils import Vector
import bpy
from common import camera, key_cam_path, lerp, ease_in_out, uv_sphere, emission_mat, set_mat
import lf_common as L
from heli import Heli, key_rotors, key_beacons
FRAMES = 98


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(81)
    out = L.city(rng, towers=110, sun_az=8, sun_elev=9, fires=True)
    d = out["sun_dir"]
    s = uv_sphere("SunDisc", 40, 32, 16, loc=tuple(d * 2600))
    set_mat(s, emission_mat("_nofog", (1.0, 0.72, 0.42), 30)); s.visible_shadow = False
    h = Heli(with_pilot=False)
    frames = list(range(0, FRAMES + 1))
    start = L.ROOF + Vector((60, 8, 30))
    for f in frames:
        t = f / FRAMES
        h.root.location = start + Vector((lerp(0, 520, t), lerp(0, 40, t), lerp(20, 110, t)))
        h.root.rotation_euler = (0.05 * math.sin(f * 0.2), 0.14, math.radians(4))
        h.root.keyframe_insert("location", frame=f); h.root.keyframe_insert("rotation_euler", frame=f)
    key_rotors(h, frames); key_beacons(h, frames)
    h_at = lambda f: start + Vector((lerp(0, 520, f / FRAMES), lerp(0, 40, f / FRAMES), lerp(20, 110, f / FRAMES)))
    cam = camera(lens=35, fstop=8, dof_obj=200)
    key_cam_path(cam, frames, lambda f: L.ROOF + Vector((lerp(-24, -16, ease_in_out(f / FRAMES)), -6, lerp(52, 60, ease_in_out(f / FRAMES)))),
                 lambda f: h_at(f).lerp(start + Vector((900, 60, 150)), 0.35), roll_fn=lambda f: math.radians(-2))
    L.finish(cam, frames, rng, fog=0.0016, dust_region=((L.ROOF.x, L.ROOF.x + 700), (L.ROOF.y - 200, L.ROOF.y + 250), (0, 160)), n=50,
             wind=(1.2, 0, 0.1), dust_alpha=0.4)
