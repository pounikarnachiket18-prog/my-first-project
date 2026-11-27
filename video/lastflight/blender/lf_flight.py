"""The rescue helicopter's flight through the city (one continuous path used by every heli shot).
Flight clock s (seconds): 0-15 chase across the city, 15-16.5 flare, then hover over the rooftop."""
import math
from mathutils import Vector, Matrix, Euler
from lf_common import ROOF

PTS = [(-6.0, Vector((-420, -40, 88))), (0.0, Vector((-260, -30, 74))), (5.0, Vector((-120, -5, 62))), (10.0, Vector((20, 12, 56))),
       (15.0, Vector((170, 48, 60))), (17.0, Vector((ROOF.x + 2, ROOF.y - 2, ROOF.z + 14))), (40.0, Vector((ROOF.x + 2.5, ROOF.y - 2, ROOF.z + 14)))]


def _cr(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def pos(s):
    ts = [p[0] for p in PTS]
    s = max(ts[0], min(ts[-1] - 1e-6, s))
    i = max(0, max(k for k in range(len(ts) - 1) if ts[k] <= s))
    t = (s - ts[i]) / (ts[i + 1] - ts[i])
    P = [PTS[max(0, i - 1)][1], PTS[i][1], PTS[i + 1][1], PTS[min(len(PTS) - 1, i + 2)][1]]
    return _cr(*P, t)


def turb(s, amt=1.0):
    return Vector((math.sin(s * 5.1) * 0.25 + math.sin(s * 11.7) * 0.1, math.sin(s * 4.3 + 1) * 0.3, math.sin(s * 6.7 + 2) * 0.35)) * amt


def attitude(s, amt=1.0):
    """yaw from velocity, nose-down pitch with speed, roll into turns + turbulence."""
    a, b = pos(s - 0.05), pos(s + 0.05)
    v = (b - a) / 0.1
    yaw = math.atan2(v.y, v.x) if v.length > 0.5 else 0.0
    a2 = pos(s + 0.35)
    v2 = (a2 - pos(s + 0.25)) / 0.1
    yaw2 = math.atan2(v2.y, v2.x) if v2.length > 0.5 else yaw
    turn = (yaw2 - yaw + math.pi) % (2 * math.pi) - math.pi
    pitch = min(0.2, v.length * 0.006)
    roll = -turn * 1.6
    j = amt * 0.05
    return (roll + j * math.sin(s * 9.1), pitch + j * math.sin(s * 7.3 + 1), yaw + j * 0.5 * math.sin(s * 5.7 + 2))


def key_heli(h, frames, s_of_f, amt=1.0):
    for f in frames:
        s = s_of_f(f)
        h.root.location = pos(s) + turb(s, amt)
        h.root.rotation_euler = attitude(s, amt)
        h.root.keyframe_insert("location", frame=f)
        h.root.keyframe_insert("rotation_euler", frame=f)


def world(s, local, amt=1.0):
    """World position of a point given in helicopter-local coordinates at flight time s."""
    M = Matrix.Translation(pos(s) + turb(s, amt)) @ Euler(attitude(s, amt)).to_matrix().to_4x4()
    return M @ Vector(local)
