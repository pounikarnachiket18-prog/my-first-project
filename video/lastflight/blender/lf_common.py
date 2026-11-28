"""Shared set-up for THE LAST FLIGHT shots: one consistent city, rooftop, light and dust."""
import math, random
import bpy
from mathutils import Vector
import common
from common import reset, camera, key_cam_path, lerp
from city import fog_all
import lf_world as W

ROOF = Vector((220.0, 60.0, 42.0))       # top of the girl's building (x, y, z)
CORRIDOR = [(0, 0, 45), (110, 30, 40), (220, 60, 38), (330, 90, 45)]  # kept free of towers


def setup(res=(720, 1280), samples=6, blur=True):
    sc = reset(res=res, samples=samples, motion_blur=blur)
    sc.cycles.transparent_max_bounces = 128
    sc.render.fps = 24
    return sc


def city(rng, towers=150, roof=True, sun_az=200, sun_elev=12, fog=0.0042, fires=True):
    d = W.dusk_dust_light(sun_elev=sun_elev, sun_az=sun_az)
    W.ground()
    out = {"towers": W.skyline(rng, n=towers, rings=(25, 760), cx=ROOF.x - 60, cy=ROOF.y, keep_clear=CORRIDOR + [(ROOF.x, ROOF.y, 30)])}
    if roof:
        out["roof"] = W.rooftop(tuple(ROOF), rng=rng)
    if fires:
        for k, (x, y, z) in enumerate([(320, 260, 55), (60, 240, 30), (420, -60, 70), (150, -180, 40)]):
            W.fire(f"Fire{k}", (x, y, z), size=4, strength=35)
    out["fog"] = fog
    out["sun_dir"] = d
    return out


def finish(cam, frames, rng, fog=0.0026, dust_region=None, n=36, smoke=True, wind=(1.4, 0.0, 0.08), dust_alpha=0.5):
    """Call last: fog on every material, then dust cards + smoke stacks that face this camera."""
    if W.DAY:   # daylight: thin bright haze, lighter dust, so the city and the action stay readable
        fog, dust_alpha, n, dust_col, haze = fog * 0.28, dust_alpha * 0.45, int(n * 0.6), (0.86, 0.8, 0.7), (0.78, 0.82, 0.88)
    else:
        dust_col, haze = (0.6, 0.53, 0.44), (0.64, 0.57, 0.48)
    fog_all(haze, fog, 1.0)
    if dust_region:
        W.dust_cards(cam, frames, dust_region, n=n, size=(25, 80), wind=wind, rng=rng, alpha=dust_alpha, color=dust_col)
    if smoke:
        for k, (x, y) in enumerate([(320, 260), (60, 240), (420, -60), (150, -180)]):
            reg = ((x - 10, x + 10), (y - 10, y + 10), (40, 220))
            W.dust_cards(cam, frames, reg, n=7, size=(40, 90), wind=(0.6, 0.0, 0.5), rng=rng,
                         color=(0.30, 0.26, 0.22), alpha=0.6, key=f"smoke{k}")   # pre-hazed: cards are added after the fog pass


def handheld(f, amp=0.03, rot=0.6, seed=0.0, speed=0.35):
    """Smooth pseudo-random offset (m) and roll (deg) for controlled handheld/turbulence shake."""
    def n(o):
        return (math.sin(f * speed * 1.7 + o) * 0.6 + math.sin(f * speed * 3.1 + o * 2.3) * 0.3 + math.sin(f * speed * 7.3 + o * 1.1) * 0.1)
    return Vector((n(seed) * amp, n(seed + 4) * amp, n(seed + 9) * amp)), math.radians(n(seed + 13) * rot)
