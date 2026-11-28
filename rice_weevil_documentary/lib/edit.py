"""Edit decision list shared by the Blender renderer (main.py slowmo) and the finishing pass.
Pure Python: no bpy, no numpy, so both environments can import it."""

# output frame -> S1 source frame: the sealed jar, speed-ramped ~1.3x
JAR = [(61, 22.0), (110, 84.0), (180, 180.0)]
# output frame -> S6 source frame: the emergence. Chewing plays 1:1 up to the break-through hit
# (frame 1290, where the sound and the shockwave land), the head pushing out of the grain plays
# at 0.44x (real 3D sub-frame renders, not frame blending), then a speed ramp catches up by frame
# 1375, so the scene still ends on its original frame and every narration line keeps its timing.
EMERGE = [(1201, 1201.0), (1290, 1290.0), (1326, 1306.0), (1375, 1375.0)]
SLOWMO = (1290, 1326)          # output frames rendered as true sub-frames
SLOW_PREFIX = "slow2"


def pwl(x, pts):
    if x <= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return pts[-1][1]


def source(k):
    """Output frame (1..1500) -> fractional source frame number."""
    if k <= 60:
        return 2000.0 + k
    if k <= 180:
        return pwl(k, JAR)
    if 1201 <= k <= 1375:
        return pwl(k, EMERGE)
    return float(k)
