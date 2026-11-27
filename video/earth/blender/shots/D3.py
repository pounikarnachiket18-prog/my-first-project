"""D3 — "...duniya bhar mein unimaginable destruction!" (24.1–25.6 s): the wave towers over Marine Drive."""
import math, random
from common import reset, camera, key_cam_path, lerp, ease_in
import marine
from ocean import key_ocean_time
import D2

FRAMES = 48
OFFSET = 56  # continues D2's clock


def build():
    reset(res=(648, 1152), samples=4, motion_blur=True)
    rng = random.Random(31)
    out, md, people = D2.scene(rng)
    frames = list(range(0, FRAMES + 1))
    key_ocean_time(md, frames, lambda f: 3 + (f + OFFSET) / 30)
    marine.add_wave(frames, lambda f: D2.wave_x(f + OFFSET))
    cam = camera(lens=16, fstop=5.6, dof_obj=40)
    key_cam_path(cam, frames,
                 lambda f: (7.0, -8 + 0.04 * f, 2.6),
                 lambda f: (-16, 30, lerp(16, 50, ease_in(f / 40, 2))),
                 roll_fn=lambda f: math.radians(-3 + 2.5 * math.sin(f * 0.5) * f / FRAMES))
