"""D2 — "samundar ki massive waves" (22.3–24.1 s): Marine Drive. The Arabian Sea keeps its eastward
momentum and rears up into a wall of water racing toward the city."""
import math, random
from common import reset, camera, key_cam_path, lerp, ease_in_out
from look import overcast
import marine, character as C
from ocean import key_ocean_time

FRAMES = 60
IMPACT = 100  # Marine Drive clock: wave reaches the sea wall (D3 frame 40 = 25.45 s)


def wave_x(f):
    t = min(1.0, f / IMPACT)
    return lerp(-320, -12, t ** 0.9)


def scene(rng):
    overcast(sun_dir=(0.4, 0.3, -0.7), sun=1.2, sky=1.0, haze=0.0012, haze_col=(0.7, 0.73, 0.76))
    out = marine.build(rng)
    o, md = out["ocean"]
    people = []
    for k, (x, y) in enumerate([(2.5, 6), (3.5, 14), (1.8, 22), (4.5, 33), (2.2, 45), (5.5, 60)]):
        p = C.Person(rng.choice(["white_kurta", "saffron", "maroon", "green", "sky"]), rng.choice(["wheat", "brown", "dusky"]), k % 2 == 0,
                     loc=(x, y, 0.9), heading=-math.pi / 2)  # facing the sea
        p.pose(C.look_up())
        people.append(p)
    return out, md, people


def build():
    reset(res=(648, 1152), samples=4, motion_blur=True)
    rng = random.Random(31)
    out, md, people = scene(rng)
    frames = list(range(0, FRAMES + 1))
    key_ocean_time(md, frames, lambda f: 3 + f / 30)
    marine.add_wave(frames, wave_x)
    cam = camera(lens=20, fstop=5.6, dof_obj=60)
    key_cam_path(cam, frames,
                 lambda f: (lerp(5.2, 4.8, f / FRAMES), -30 + 0.05 * f, lerp(2.7, 2.9, f / FRAMES)),
                 lambda f: (-6, 60, lerp(10, 16, ease_in_out(f / FRAMES))),
                 roll_fn=lambda f: math.radians(-2))
