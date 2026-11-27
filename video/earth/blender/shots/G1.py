"""G1 — "Toh agli baar sunrise dekho..." (44.1–46.7 s): calm morning on Marine Drive; the hero watches
the sun rise over the city (east)."""
import math, random
from common import reset, camera, key_cam_path, lerp, ease_in_out, sky_world, sun_light, uv_sphere, emission_mat, set_mat
from mathutils import Vector
import marine, character as C
from ocean import key_ocean_time
from city import fog_all

FRAMES = 81


def build():
    reset(res=(648, 1152), samples=4, motion_blur=False)
    rng = random.Random(41)
    from common import gradient_world
    sd = Vector((0.13, 0.95, 0.27)).normalized()  # low morning sun, toward the open end of the promenade
    gradient_world(top=(0.32, 0.42, 0.62), horizon=(1.0, 0.68, 0.42), strength=1.15)
    sun_light("Sun", tuple(-sd), strength=3.2, color=(1.0, 0.72, 0.45), angle_deg=1.5)
    out = marine.build(rng)
    o, md = out["ocean"]
    key_ocean_time(md, range(0, FRAMES + 1), lambda f: f / 30)
    d = sd * 2200
    s = uv_sphere("SunDisc", 30, 32, 16, loc=tuple(d))
    set_mat(s, emission_mat("_nofog", (1.0, 0.75, 0.45), 80)); s.visible_shadow = False
    fog_all((1.0, 0.72, 0.5), 0.0022, 0.9)
    hero = C.Person("hero", "brown", True, loc=(3.0, 0.0, 0.9), heading=math.atan2(sd.x, sd.y) + math.pi)  # faces the sunrise
    for f in range(0, FRAMES + 1, 4):
        hero.key(f, C.stand(math.sin(f * 0.06)))
    cam = camera(lens=30, fstop=2.8, dof_obj=2.4)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (3.0 - sd.x * lerp(2.8, 2.4, f / FRAMES) + 0.5, -sd.y * lerp(2.8, 2.4, ease_in_out(f / FRAMES)), lerp(2.2, 2.4, f / FRAMES)),
                 lambda f: (3.0 + sd.x * 60, sd.y * 60, lerp(12.0, 14.0, f / FRAMES)))
