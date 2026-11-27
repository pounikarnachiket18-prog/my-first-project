"""C1 — "Aur agar Earth achanak..." (12.0–13.33 s): ordinary morning, hero walks across; traffic flows."""
import math
from common import camera, key_cam_path, lerp
import street_scene as S
import character as C

FRAMES = 44


def build():
    rng, st, loose = S.base(seed=5, x_min=-60, x_max=120, crowd=10, clutter_n=60)
    S.drive(loose["vehicles"], list(range(0, FRAMES + 1)))
    S.walkers(loose["people"], list(range(0, FRAMES + 1)))
    hx, hy, _ = S.HERO_POS
    hero = C.Person("hero", "brown", True, loc=(hx - 1.4, hy, 0), heading=math.pi / 2)
    for f in range(0, FRAMES + 1, 2):
        hero.key(f, C.walk(f * 0.3), loc=(hx - 1.4 + 1.4 * f / 40, hy, 0))
    cam = camera(lens=24, fstop=2.8, dof_obj=3.2)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (hx - 3.0 + 1.3 * f / 40, hy - 3.2, 0.75),
                 lambda f: (hx - 0.4 + 1.4 * f / 40, hy + 0.6, 1.35))
