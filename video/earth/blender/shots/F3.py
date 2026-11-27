"""F3 — "doosri taraf freezing darkness" (42.5–44.1 s). The night hemisphere after months without
sunlight: frozen ground, cracked ice, starry black sky, only faint starlight/airglow."""
import math
from common import reset, space_world, camera, key_cam_path, lerp, ease_in_out, area_light
from landscape import terrain, frozen_ground
from city import fog_all

FRAMES = 54


def build():
    reset(motion_blur=True, samples=16)
    space_world(strength=2.6)  # stars visible to camera only
    # starlight + faint airglow along the horizon
    for a in (area_light("SkyFill", (0, 0, 120), (0, 0, 0), size=400, power=160000, color=(0.35, 0.5, 1.0)),
              area_light("Airglow", (300, 40, 18), (0, 0, 0), size=300, power=420000, color=(0.3, 0.6, 0.9))):
        a.visible_camera = False
        a.visible_glossy = False
    t = terrain("Ice", seed_offset=(11.3, 2.2, 5.0), strength=34)
    set_mat = __import__("common").set_mat
    set_mat(t, frozen_ground())
    fog_all((0.02, 0.04, 0.08), 0.0035, 1.0)
    cam = camera(lens=20, fstop=4.0, dof_obj=7)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(-16, -6, ease_in_out(f / FRAMES)), lerp(-2, 1.0, f / FRAMES), lerp(1.4, 1.0, f / FRAMES)),
                 lambda f: (200, lerp(10, 0, f / FRAMES), lerp(36, 30, f / FRAMES)),
                 roll_fn=lambda f: math.radians(lerp(-2, 0, f / FRAMES)))
