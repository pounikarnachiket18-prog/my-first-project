"""F3 — "doosri taraf freezing darkness" (42.5–44.1 s): Ladakh-like frozen night side; the hero hugs himself."""
import math
from common import reset, space_world, camera, key_cam_path, lerp, ease_in_out, area_light, set_mat
from landscape import terrain, frozen_ground
from city import fog_all
import character as C

FRAMES = 52


def build():
    reset(res=(648, 1152), samples=4, motion_blur=False)
    space_world(strength=2.4)
    for a in (area_light("SkyFill", (0, 0, 60), (0, 0, 0), size=200, power=90000, color=(0.4, 0.55, 1.0)),
              area_light("Rim", (-6, 8, 4), (0, 0, 1.2), size=4, power=1200, color=(0.55, 0.7, 1.0))):
        a.visible_camera = False
        a.visible_glossy = False
    t = terrain("Ice", size=900, subdiv=240, seed_offset=(11.3, 2.2, 5.0), strength=40, flat_radius=30)
    set_mat(t, frozen_ground())
    fog_all((0.03, 0.05, 0.1), 0.003, 1.0)
    hero = C.Person("hero", "brown", True, loc=(0, 0, 0.0), heading=math.radians(-15))
    for f in range(0, FRAMES + 1):
        hero.key(f, C.hug_cold(f / 30))
    cam = camera(lens=28, fstop=2.8, dof_obj=2.5)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(-0.6, -0.4, f / FRAMES), lerp(-2.8, -2.4, ease_in_out(f / FRAMES)), lerp(1.2, 1.3, f / FRAMES)),
                 lambda f: (0, 0, lerp(1.35, 1.4, f / FRAMES)))
