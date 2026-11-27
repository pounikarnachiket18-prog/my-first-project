"""D2 — "samundar ki massive waves" (22.3–24.3 s). Low drone skim over a violent storm sea."""
import math, random
from common import reset, gradient_world, sun_light, camera, key_cam_path, lerp, area_light
from ocean import ocean, key_ocean_time

FRAMES = 66


def build():
    reset(motion_blur=True, samples=16)
    gradient_world(top=(0.03, 0.035, 0.045), horizon=(0.42, 0.44, 0.45), strength=1.1)
    sun_light("Sun", (0.3, 0.2, -0.35), strength=1.4, color=(0.85, 0.9, 1.0), angle_deg=8)
    o, md = ocean(size=180, repeat=8, wave_scale=13, chop=1.9, wind=50, res=11, loc=(0, 0, 0), alignment=0.6, direction=0.0)
    o.scale = (180 * 8, 180 * 8, 1)  # repeat tiles cover a huge area
    o.location = (-180 * 8 / 2 + 60, -180 * 8 / 2 + 60, 0)
    md.size = 1.0 / 1.0
    o.scale = (1, 1, 1)
    key_ocean_time(md, range(0, FRAMES + 1), lambda f: 20 + f / 30 * 1.15)
    cam = camera(lens=20, fstop=5.6, dof_obj=30)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(-30, 25, f / FRAMES), 0.0 + 2 * math.sin(f * 0.05), 5.0 + 1.2 * math.sin(f * 0.13)),
                 lambda f: (200, 10, 9 + 2 * math.sin(f * 0.11)),
                 roll_fn=lambda f: math.radians(5 * math.sin(f * 0.09)))
