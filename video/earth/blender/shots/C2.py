"""C2 — THE STOP (13.33–17.0 s). The ground (and the camera rig's anchor) stops; the hero, people,
taxis and autos keep the old eastward speed. The camera flies alongside the hero in slow motion,
then loses him as time ramps back to real speed."""
import math
from mathutils import Vector
from common import camera, key_cam_path, lerp
import street_scene as S
import mumbai as MU
import character as C

FRAMES = 114


def build():
    rng, st, loose = S.base(blur=True, seed=7, x_min=-60, x_max=170, crowd=12, clutter_n=150)
    sim = MU.slowmo_sim()
    import bpy
    keep = []
    for v in loose["vehicles"]:  # keep the hero's lane clear so he stays readable
        if v.location.y < 0 and -30 < v.location.x < 60:
            bpy.data.objects.remove(v, do_unlink=True)
        else:
            keep.append(v)
    loose["vehicles"] = keep
    frames = list(range(0, FRAMES + 1))
    hx, hy, _ = S.HERO_POS
    hero = C.Person("hero", "brown", True, loc=(hx, hy, 0), heading=math.pi / 2)
    track = []
    MU.fling_person(hero, frames, sim, rng, lift=(15.0, 15.0), spin=(0.4, 1.0), flail_rate=14.0, track=track)
    for v in loose["vehicles"]:
        MU.fling(v, frames, sim, rng, ramp=0.1, lift=(0.5, 6), spin=(0.5, 4))
    for p in loose["people"]:
        MU.fling_person(p, frames, sim, rng)
    for c in loose["clutter"]:
        MU.fling(c, frames, sim, rng, ramp=0.05, lift=(0.5, 9), spin=(3, 20))
    for sg in loose["signs"]:
        MU.fling(sg, frames, sim, rng, ramp=0.06, lift=(0, 2), spin=(1, 6), delay=rng.uniform(0.05, 0.14))
    for trunk, crowns in loose["trees"]:
        MU.bend_tree(trunk, crowns, frames, sim, rng, max_angle=rng.uniform(0.6, 1.0))
    cam = camera(lens=24, fstop=2.8, dof_obj=3.0)
    # camera keeps pace with the hero while slow; it can move at most 0.9 m/frame
    cx = [track[0].x]
    for f in frames[1:]:
        cx.append(min(track[f].x, cx[-1] + 0.9))

    def pos(f):
        z = track[f].z if track[f].x - cx[f] < 1 else track[min(f, 60)].z
        return (cx[f] - 1.5, hy - 2.7, 0.7 + 0.8 * min(1.0, z))

    def tgt(f):
        t = track[f]
        return (min(t.x, cx[f] + 5) + 0.3, hy + 0.4, max(1.0, min(t.z + 0.9, 3.0)))

    key_cam_path(cam, frames, pos, tgt, roll_fn=lambda f: math.radians(4 * math.sin(f * 0.11)), focus_fn=lambda f: 3.0)
