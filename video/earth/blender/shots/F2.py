"""F2 — "Ek taraf extreme heat" (40.5–42.5 s). Sun-facing hemisphere after months of daylight:
scorched, cracked ground under a white-hot sun in a dusty sky."""
import math
from mathutils import Vector
from common import reset, sky_world, sun_light, camera, key_cam_path, lerp, ease_in_out, uv_sphere, emission_mat, set_mat
from landscape import terrain, cracked_earth
from city import fog_all

FRAMES = 64


def build():
    reset(motion_blur=True, samples=16)
    el = math.radians(22)
    sky_world(sun_elev_deg=22, sun_rot_deg=0, strength=0.22, dust=4.0, air=1.2, tint=(1.0, 0.6, 0.32))
    sun_light("Sun", (-math.cos(el), 0.0, -math.sin(el)), strength=4.2, color=(1.0, 0.8, 0.58), angle_deg=2.0)
    t = terrain("Desert", seed_offset=(3.1, 7.7, 0.0), strength=30)
    set_mat(t, cracked_earth())
    d = Vector((math.cos(el), 0.0, math.sin(el))).normalized() * 2400
    s = uv_sphere("SunDisc", 55, 32, 16, loc=tuple(d))
    set_mat(s, emission_mat("_nofog", (1.0, 0.92, 0.78), 120))
    s.visible_shadow = False
    fog_all((0.95, 0.5, 0.22), 0.0026, 0.55)
    cam = camera(lens=20, fstop=4.0, dof_obj=6)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(-20, -8, ease_in_out(f / FRAMES)), lerp(1.5, -0.5, f / FRAMES), lerp(0.55, 0.9, f / FRAMES)),
                 lambda f: (200, lerp(-6, 4, f / FRAMES), lerp(42, 58, f / FRAMES)),
                 roll_fn=lambda f: math.radians(lerp(3, 1, f / FRAMES)))
