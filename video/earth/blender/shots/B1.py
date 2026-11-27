"""B1 — "Actually, hum sab already ek invisible speed par travel kar rahe hain..." (5–8.5 s)
Hero standing on a Mumbai zebra crossing; low-angle camera slowly orbits him; normal traffic."""
import math
from common import camera, key_cam_path, lerp, ease_in_out
import street_scene as S
import character as C

FRAMES = 109


def build():
    rng, st, loose = S.base(seed=3, x_min=-60, x_max=120, crowd=10, clutter_n=40)
    import bpy
    keep = []
    for v in loose["vehicles"]:  # the orbiting camera sits in the near lane: keep that lane clear
        if v.location.y < 0 and -45 < v.location.x < 30:
            bpy.data.objects.remove(v, do_unlink=True)
        else:
            keep.append(v)
    loose["vehicles"] = keep
    S.drive(loose["vehicles"], list(range(0, FRAMES + 1)))
    S.walkers(loose["people"], list(range(0, FRAMES + 1)))
    hero = C.Person("hero", "brown", True, loc=S.HERO_POS, heading=math.radians(-20))
    for f in range(0, FRAMES + 1, 4):
        hero.key(f, C.stand(math.sin(f * 0.08)))
    hx, hy, _ = S.HERO_POS
    cam = camera(lens=26, fstop=2.2, dof_obj=2.9)

    def pos(f):
        a = math.radians(lerp(-62, -18, ease_in_out(f / FRAMES)))
        r = lerp(3.1, 2.7, f / FRAMES)
        return (hx + math.sin(a) * r, hy - math.cos(a) * r, lerp(0.75, 0.95, f / FRAMES))

    key_cam_path(cam, range(0, FRAMES + 1), pos, lambda f: (hx + 0.1, hy, 1.45), focus_fn=lambda f: 2.9)
