"""S2B — 10-13 s. Match cut to an extreme-wide dawn aerial of the city as a continent-wide dust front
(the atmosphere still moving at ~1,670 km/h) rolls across it from the west."""
import math, random
from mathutils import Vector
from common import camera, key_cam_path, lerp, ease_out
import lf_common as L
FRAMES = 74


def build():
    L.setup(samples=6, blur=True)
    rng = random.Random(21)
    L.city(rng, towers=170, sun_elev=7, sun_az=185)
    cam = camera(lens=28)
    frames = list(range(0, FRAMES + 1))
    key_cam_path(cam, frames,
                 lambda f: (lerp(-560, -470, ease_out(f / FRAMES)), lerp(-620, -540, ease_out(f / FRAMES)), lerp(330, 270, ease_out(f / FRAMES))),
                 lambda f: (lerp(160, 190, f / FRAMES), lerp(80, 60, f / FRAMES), 40), roll_fn=lambda f: math.radians(-3))
    # the dust front: wall of cards sweeping east across the frame at ~6 m/frame
    L.finish(cam, frames, rng, fog=0.0011, dust_region=((-700, -100), (-500, 600), (0, 240)), n=45, wind=(6.5, 0.0, 0.3), dust_alpha=0.6)
