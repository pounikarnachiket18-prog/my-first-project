"""E1 — "Lekin maan lo tum kisi tarah bach gaye..." (28–31 s): the hero sits up among the wreckage."""
import math
from common import camera, key_cam_path, lerp, ease_in_out, smoothstep
import D4
import character as C

FRAMES = 94


def build():
    rng, st, loose = D4.wreck(seed=17, keep_clear=(0.0, 7.0))
    hero = C.Person("hero", "brown", True, loc=(0, -0.6, -0.72), heading=math.radians(-15))
    for f in range(0, FRAMES + 1, 3):
        p = C.sit_ground(math.sin(f * 0.2))
        up = smoothstep(30, 70, f)
        p["Head"] = (0, lerp(-0.45, 0.15, up), 1)
        p["Spine2"] = (0, lerp(-0.25, 0.0, up), 1)
        hero.key(f, p)
    cam = camera(lens=30, fstop=2.0, dof_obj=2.6)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(-1.4, -1.0, ease_in_out(f / FRAMES)), lerp(-4.4, -3.6, ease_in_out(f / FRAMES)), lerp(1.0, 0.9, f / FRAMES)),
                 lambda f: (0.1, -0.4, lerp(0.45, 0.55, f / FRAMES)), focus_fn=lambda f: lerp(4.0, 3.2, ease_in_out(f / FRAMES)))
