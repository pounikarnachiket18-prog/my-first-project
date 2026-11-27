"""S3C — 18.5-22 s. Wide aerial: the city coming apart — leaning towers, fires, smoke columns, a dust sea."""
import math, random
from common import camera, key_cam_path, lerp, ease_in_out
import lf_common as L
FRAMES = 86


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(51)
    L.city(rng, towers=170)
    cam = camera(lens=24)
    frames = list(range(0, FRAMES + 1))
    key_cam_path(cam, frames,
                 lambda f: (lerp(-160, -120, ease_in_out(f / FRAMES)), lerp(-260, -230, f / FRAMES), lerp(150, 175, ease_in_out(f / FRAMES))),
                 lambda f: (lerp(200, 230, f / FRAMES), lerp(60, 80, f / FRAMES), lerp(30, 40, f / FRAMES)), roll_fn=lambda f: math.radians(lerp(-6, -2, f / FRAMES)))
    L.finish(cam, frames, rng, fog=0.0019, dust_region=((-200, 500), (-300, 400), (0, 90)), n=60, wind=(2.5, 0, 0.1))
