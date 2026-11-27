"""Cinematic finishing pass: the edit decision list + per-frame 2D effects.

Works on the rendered Cycles frames (540x960) and yields finished frames for tools/assemble.py,
which upscales, grades, burns in typography and encodes.

Edit (output frame k, 1..1500, 30 fps):
  1-60     cold open (S0_Hook, frames 2001-2060), real 3D motion blur + rack focus
  61-180   the sealed jar (S1 frames 22-180, speed-ramped ~1.3x with frame blending)
  181-1500 sequences 2-7 1:1, except the S6 emergence (1201-1345): ~1.16x chewing, true 3D
           slow motion (0.44x sub-frame renders) through the break-through, then catch-up;
           every scene starts and ends on its original frame, so narration timing holds
Effects are keyed to story beats only: macro zoom transitions, rack-focus transition,
X-ray scan wipe, particle transition, impact flash/shake, snap zooms on reveals, anticipation
push-ins before each life-cycle stage, floating dust with parallax and soft light shafts.
Blockbuster layer: per-scene filmic grade matched to the 3D palettes, highlight bloom with
anamorphic streaks, radial chromatic aberration (spikes on impacts) and refractive shockwaves.
Only numpy + scipy (already used by the audio tools) and ffmpeg.
"""
import json
import math
import os
import subprocess
from functools import lru_cache

import sys

import numpy as np
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from lib import edit  # noqa: E402  (shared edit decision list, pure Python)
FRAMES = os.path.join(ROOT, "renders", "frames")
W, H = 540, 960          # render resolution (50 % of 1080x1920)
N_OUT = 1500

# --------------------------------------------------------------------------- curves
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def sstep(a, b, x):
    t = clamp((x - a) / (b - a)) if b != a else float(x >= b)
    return t * t * (3 - 2 * t)


def eout(a, b, x):  # fast start, soft landing (snap zooms)
    t = clamp((x - a) / (b - a))
    return 1 - (1 - t) ** 3


def ein(a, b, x):   # accelerating (into a cut)
    t = clamp((x - a) / (b - a))
    return t ** 2.2


def pwl(x, pts):
    xs, ys = zip(*pts)
    return float(np.interp(x, xs, ys))


# --------------------------------------------------------------------------- edit
JAR = edit.JAR
source = edit.source   # output frame -> (fractional) source frame number


SCENE_OF = [(1, 60, "S0"), (61, 180, "S1"), (181, 390, "S2"), (391, 630, "S3"),
            (631, 930, "S4"), (931, 1200, "S5"), (1201, 1410, "S6"), (1411, 1500, "S7")]


def scene(k):
    for a, b, n in SCENE_OF:
        if a <= k <= b:
            return n
    return "S7"


# --------------------------------------------------------------------------- tracking
_TR = json.load(open(os.path.join(ROOT, "assets", "tracking.json")))
_TRK = {n: (np.array(sorted(int(f) for f in d)),
            np.array([d[str(f)] for f in sorted(int(f) for f in d)]) / 2.0)
        for n, d in _TR.items()}


def track(name, src_frame):
    """Tracked point in work-resolution pixels (x, y) at a source frame."""
    fs, xy = _TRK[name]
    return (float(np.interp(src_frame, fs, xy[:, 0])), float(np.interp(src_frame, fs, xy[:, 1])))


def track_k(name, k):
    return track(name, source(k))


CENTER = (W / 2, H / 2)


# --------------------------------------------------------------------------- per-frame plan
def zoom_plan(k):
    """Returns (zoom, fixed point px, radial blur strength)."""
    # cold open: pull into the cut, the jar then lands out of a zoom ("macro zoom")
    if 50 <= k <= 60:
        z = 1 + 0.14 * ein(50, 60, k)
        return z, track_k("hook", k), 0.11 * ein(50, 60, k)
    if 61 <= k <= 72:
        return 1 + 0.5 * (1 - eout(61, 72, k)), (W * 0.5, H * 0.47), 0.13 * (1 - eout(61, 68, k))
    if 154 <= k <= 180:  # first weevil over the rim: punch in, then zoom through into S2
        z = 1 + 0.12 * eout(154, 160, k) + 0.45 * ein(172, 180, k)
        return z, track_k("hero1", k), 0.12 * ein(172, 180, k)
    if 181 <= k <= 192:
        return 1 + 0.4 * (1 - eout(181, 192, k)), (W * 0.5, H * 0.55), 0.11 * (1 - eout(181, 188, k))
    # S2: snap zoom onto the rostrum when it is first named on screen
    if 298 <= k <= 358:
        z = 1 + 0.30 * eout(298, 305, k) * (1 - sstep(338, 358, k))
        return z, track_k("rostrum", k), 0.05 * (1 - sstep(298, 303, k)) * (k < 303)
    # S3: slow macro push while she chews; snap onto the egg; release for the slice
    if 452 <= k <= 545:
        return 1 + 0.14 * sstep(452, 515, k) * (1 - sstep(520, 545, k)), track_k("drill", k), 0
    if 584 <= k <= 614:
        z = 1 + 0.18 * eout(584, 590, k) * (1 - sstep(600, 614, k))
        return z, track_k("egg", k), 0
    # S4: snap onto the hatching egg; small pulses at each moult / growth spurt
    if 644 <= k <= 696:
        z = 1 + 0.28 * eout(644, 651, k) * (1 - sstep(676, 696, k))
        return z, track_k("egg4", k), 0.04 * (1 - sstep(644, 650, k)) * (k < 650)
    for f in (700, 780, 860):
        if f <= k <= f + 18:
            return 1 + 0.07 * (1 - eout(f, f + 18, k)), track_k("larva", k), 0
    # S5: anticipation push-ins before the pupa and the adult appear, released on the reveal
    if 940 <= k <= 1008:
        return 1 + 0.12 * sstep(940, 996, k) * (1 - eout(998, 1008, k)), track_k("pupa", k), 0
    if 1056 <= k <= 1118:
        return (1 + 0.12 * sstep(1056, 1102, k) * (1 - eout(1104, 1118, k)),
                track_k("adult5", k), 0)
    # S6: push in while it chews; impact on break-through; zoom into the title hit
    if 1214 <= k <= 1302:
        return 1 + 0.10 * sstep(1214, 1286, k) * (1 - eout(1290, 1302, k)), track_k("exit", k), 0
    if 1402 <= k <= 1410:
        return 1 + 0.16 * ein(1402, 1410, k), (W * 0.5, H * 0.5), 0.09 * ein(1402, 1410, k)
    if k >= 1411:
        return 1 + 0.05 * sstep(1411, 1500, k), CENTER, 0
    return 1.0, CENTER, 0.0


def shake(k):
    """Impact shake: (dx, dy) px, decaying."""
    for f, amp in ((83, 2.5), (157, 3.0), (1290, 6.0)):
        if f <= k <= f + 12:
            d = (k - f) / 12.0
            a = amp * (1 - d) ** 2
            return a * math.sin(k * 2.7), a * math.cos(k * 3.9)
    return 0.0, 0.0


def flash(k):
    """(amount, rgb) exposure flash, synced to impacts in the soundtrack."""
    pulses = [(60, 0.28, 3, 6, (1.0, 0.9, 0.75)), (83, 0.08, 1, 5, (1.0, 0.95, 0.85)),
              (998, 0.16, 2, 10, (0.8, 0.92, 1.0)), (1104, 0.2, 2, 12, (0.85, 0.95, 1.0)),
              (1290, 0.22, 1, 9, (1.0, 0.9, 0.75)), (1411, 0.55, 1, 14, (1.0, 0.95, 0.88))]
    for f, amt, up, down, col in pulses:
        if f - up <= k <= f + down:
            if k < f:
                a = amt * (k - (f - up) + 1) / (up + 1)
            else:
                a = amt * (1 - (k - f) / (down + 1)) ** 2
            return a, col
    return 0.0, (1, 1, 1)


def defocus(k):
    """Rack-focus transition S2 -> S3 (sigma in work px)."""
    if 382 <= k <= 390:
        return 9.0 * sstep(382, 390, k)
    if 391 <= k <= 403:
        return 9.0 * (1 - sstep(391, 403, k))
    if 1194 <= k <= 1206:  # soft focus through the particle transition
        return 3.0 * math.sin(math.pi * (k - 1194) / 12.0)
    return 0.0


DUST = {"S0": 0.9, "S1": 0.45, "S2": 0.55, "S3": 0.45, "S4": 0.3, "S5": 0.6, "S6": 0.7,
        "S7": 0.25}
BEAMS = {}  # light shafts are now real volumetrics in the Cycles renders (lib/cinema.py)

# per-scene grade, matched to the 3D lighting palettes: shadow / highlight split tone,
# saturation, filmic contrast, bloom tint, anamorphic streak tint + strength
LOOK = {
    "S0": dict(sh=(-0.012, 0.004, 0.028), hi=(0.030, 0.010, -0.025), sat=1.10, con=0.30,
               streak=(1.0, 0.55, 0.25), st=0.30),
    "S1": dict(sh=(-0.010, 0.002, 0.022), hi=(0.025, 0.012, -0.018), sat=1.05, con=0.20,
               streak=(1.0, 0.75, 0.5), st=0.18),
    "S2": dict(sh=(-0.016, 0.006, 0.030), hi=(0.035, 0.012, -0.030), sat=1.12, con=0.32,
               streak=(1.0, 0.6, 0.28), st=0.32),
    "S3": dict(sh=(-0.010, 0.004, 0.024), hi=(0.030, 0.012, -0.020), sat=1.06, con=0.28,
               streak=(1.0, 0.7, 0.4), st=0.22),
    "S4": dict(sh=(0.012, -0.004, -0.012), hi=(0.040, 0.010, -0.030), sat=1.10, con=0.26,
               streak=(1.0, 0.5, 0.2), st=0.22),
    "S5": dict(sh=(0.006, -0.008, 0.035), hi=(-0.010, 0.020, 0.035), sat=1.12, con=0.28,
               streak=(0.45, 0.8, 1.0), st=0.34),
    "S6": dict(sh=(-0.018, 0.004, 0.032), hi=(0.040, 0.016, -0.030), sat=1.12, con=0.32,
               streak=(1.0, 0.62, 0.3), st=0.30),
    "S7": dict(sh=(-0.010, 0.000, 0.020), hi=(0.035, 0.020, -0.020), sat=1.06, con=0.30,
               streak=(1.0, 0.8, 0.5), st=0.36),
}
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def grade(img, sc, k):
    lk = LOOK[sc]
    L = img @ LUMA
    # filmic S-curve (blend toward smoothstep), keeps blacks deep and highlights controlled
    img = img + lk["con"] * (img * img * (3 - 2 * img) - img)
    # saturation around luma
    img = L[..., None] + (img - L[..., None]) * lk["sat"]
    # split tone: cool shadows / warm highlights (scene specific)
    ws = ((1 - L) ** 2)[..., None]
    wh = (L ** 2)[..., None]
    img = img + ws * np.array(lk["sh"], np.float32) + wh * np.array(lk["hi"], np.float32)
    return np.clip(img, 0, 1)


def bloom(img, sc, boost=0.0):
    """Highlight bloom + horizontal anamorphic streaks from the brightest points."""
    lk = LOOK[sc]
    L = img @ LUMA
    m = np.clip((L - 0.82) / 0.18, 0, 1) ** 2
    hl = img * m[..., None]
    small = hl[::2, ::2]
    glow = ndimage.gaussian_filter(small, (6, 6, 0)) * 0.55 + \
        ndimage.gaussian_filter(small, (18, 18, 0)) * 0.35
    streak = ndimage.gaussian_filter1d(ndimage.gaussian_filter1d(small, 1.2, axis=0), 55, axis=1)
    sL = streak @ LUMA
    streak = sL[..., None] * np.array(lk["streak"], np.float32) * (lk["st"] + boost) * 9.0
    add = np.clip(glow * 0.5 + streak, 0, 1)
    add = ndimage.zoom(add, (2, 2, 1), order=1)[:H, :W]
    return 1 - (1 - img) * (1 - add)


def aberration(img, amt):
    """Radial chromatic aberration (red out, blue in), strongest at the frame edges."""
    if amt < 1e-4:
        return img
    cx, cy = W / 2, H / 2
    out = img.copy()
    for c, sgn in ((0, 1.0), (2, -1.0)):
        z = 1 + sgn * amt
        out[..., c] = ndimage.map_coordinates(img[..., c], [cy + (YY - cy) / z, cx + (XX - cx) / z],
                                              order=1, mode="nearest")
    return out


# shockwaves: (output frame, track name or fixed point, speed px/frame, amplitude px, tint)
SHOCKS = [(3, "hook", 34.0, 9.0, (1.0, 0.75, 0.45)), (1290, "exit", 30.0, 8.0, (1.0, 0.8, 0.5)),
          (1411, (W * 0.5, H * 0.21), 40.0, 7.0, (1.0, 0.92, 0.78))]


def shockwave(img, k):
    """Refractive pressure ring expanding from an impact: real UV displacement, not an overlay."""
    for k0, where, speed, amp, tint in SHOCKS:
        if k0 <= k <= k0 + 16:
            c = track_k(where, k0) if isinstance(where, str) else where
            R = speed * (k - k0 + 1)
            w = 10.0 + 1.2 * (k - k0)
            a = amp * (1 - (k - k0) / 17.0) ** 1.5
            dx, dy = XX - c[0], YY - c[1]
            r = np.sqrt(dx * dx + dy * dy) + 1e-3
            u = (r - R) / w
            d = a * u * np.exp(-u * u)                     # lens-like refraction profile
            ys, xs = YY - d * dy / r, XX - d * dx / r
            img = np.stack([ndimage.map_coordinates(img[..., ch], [ys, xs], order=1,
                                                    mode="nearest") for ch in range(3)], -1)
            front = np.exp(-u * u)[..., None] * (a / amp) * 0.10
            img = 1 - (1 - img) * (1 - front * np.array(tint, np.float32))
    return img


def ca_amount(k):
    base = 0.0018
    for f, a in ((1, 0.006), (60, 0.005), (181, 0.004), (1290, 0.007), (1411, 0.006)):
        if f <= k <= f + 10:
            return base + a * (1 - (k - f) / 11.0) ** 2
    return base


# --------------------------------------------------------------------------- image ops
@lru_cache(maxsize=24)
def load(n, prefix="frame"):
    path = os.path.join(FRAMES, f"{prefix}_{n:04d}.png")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt",
                          "rgb24", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3).astype(np.float32) / 255.0


def frame_at(s, k=None):
    """Fractional source frame: blend neighbours (reads as motion blur on speed ramps).
    Inside the slow-motion window real sub-frame renders are used instead."""
    if k is not None and edit.SLOWMO[0] <= k <= edit.SLOWMO[1] and \
            os.path.exists(os.path.join(FRAMES, f"slow_{k:04d}.png")):
        return load(k, "slow")
    a = int(math.floor(s))
    t = s - a
    if t < 1e-3:
        return load(a)
    return load(a) * (1 - t) + load(a + 1) * t


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)


def warp(img, z, p, dx=0.0, dy=0.0, order=3):
    if abs(z - 1) < 1e-4 and dx == 0 and dy == 0:
        return img
    ys = p[1] + (YY - p[1]) / z + dy
    xs = p[0] + (XX - p[0]) / z + dx
    return np.stack([ndimage.map_coordinates(img[..., c], [ys, xs], order=order, mode="nearest")
                     for c in range(3)], -1)


def zoom_blur(img, z, p, s, n=7):
    acc = np.zeros_like(img)
    for i in range(n):
        acc += warp(img, z * (1 + s * i / (n - 1)), p, order=1)
    return acc / n


# --------------------------------------------------------------------------- atmosphere
_rng = np.random.default_rng(11)
NP = 70
P_XY = _rng.uniform([0, 0], [W, H], (NP, 2))
P_D = _rng.uniform(0, 1, NP) ** 0.7               # 0 = near camera, 1 = far
P_V = np.stack([_rng.uniform(-0.25, 0.25, NP), _rng.uniform(-0.55, -0.1, NP)], 1)
P_PH = _rng.uniform(0, 6.28, NP)
_KERN = {}


def kernel(r):
    r = round(r * 2) / 2
    if r not in _KERN:
        n = int(math.ceil(r * 2.6)) + 1
        y, x = np.mgrid[-n:n + 1, -n:n + 1]
        d = np.sqrt(x * x + y * y)
        if r > 4:  # out-of-focus bokeh disc with a soft edge
            kk = np.clip((r - d) / 1.5, 0, 1) * (0.55 + 0.45 * np.clip(d / r, 0, 1))
        else:
            kk = np.exp(-(d / max(0.6, r * 0.6)) ** 2)
        _KERN[r] = kk.astype(np.float32)
    return _KERN[r]


def dust_layer(k, z, p, burst=0.0):
    out = np.zeros((H, W), np.float32)
    t = k / 30.0
    for i in range(NP):
        d = P_D[i]
        speed = 1.6 - d
        x = (P_XY[i, 0] + P_V[i, 0] * k * speed * 3 + 6 * math.sin(t * 0.7 + P_PH[i])) % W
        y = (P_XY[i, 1] + P_V[i, 1] * k * speed * 3 + 4 * math.cos(t * 0.5 + P_PH[i])) % H
        zz = 1 + (z - 1) * (1.6 - d)                  # near particles parallax more
        x, y = p[0] + (x - p[0]) * zz, p[1] + (y - p[1]) * zz
        r = (1.0 + 1.6 * d) if d > 0.35 else (5 + 14 * (0.35 - d) / 0.35)
        r *= 1 + 0.9 * burst
        a = (0.55 if d > 0.35 else 0.10) * (0.6 + 0.4 * math.sin(t * 1.3 + P_PH[i] * 3)) \
            * (1 + 1.2 * burst)
        kk = kernel(r)
        n = kk.shape[0] // 2
        xi, yi = int(x), int(y)
        x0, x1, y0, y1 = max(0, xi - n), min(W, xi + n + 1), max(0, yi - n), min(H, yi + n + 1)
        if x0 >= x1 or y0 >= y1:
            continue
        out[y0:y1, x0:x1] += a * kk[y0 - (yi - n):y1 - (yi - n), x0 - (xi - n):x1 - (xi - n)]
    return out


_BY, _BX = np.mgrid[0:H // 4, 0:W // 4].astype(np.float32) * 4


def beams(k):
    """Soft light shafts from the upper left, slowly breathing."""
    th = math.radians(62)
    u = _BX * math.cos(th) - _BY * math.sin(th)      # across the shafts
    v = _BX * math.sin(th) + _BY * math.cos(th)      # along the shafts
    t = k / 30.0
    m = np.zeros_like(u)
    for c, w, a, sp in ((-60, 38, 1.0, 0.31), (40, 22, 0.7, 0.47), (140, 55, 0.6, 0.23),
                        (230, 18, 0.5, 0.61)):
        cc = c + 25 * math.sin(t * sp + c)
        m += a * np.exp(-((u - cc) / w) ** 2) * (0.75 + 0.25 * math.sin(t * sp * 3 + c))
    m *= np.exp(-v / 900.0)
    return ndimage.zoom(m, 4, order=1)[:H, :W]


# --------------------------------------------------------------------------- compose
def compose(k):
    sc = scene(k)
    s = source(k)
    img = frame_at(s, k)
    # X-ray scan wipe S4 -> S5: the scan line reveals the translucent grain
    if 924 <= k <= 938:
        a, b = load(min(930, k)), load(max(931, k))
        yl = H * sstep(924, 938, k)
        m = np.clip((yl - YY) / 6.0 + 0.5, 0, 1)[..., None]
        img = b * m + a * (1 - m)
        glow = np.exp(-((YY - yl) / 5.0) ** 2) + 0.35 * np.exp(-((YY - yl) / 28.0) ** 2)
        img = img + glow[..., None] * np.array([0.35, 0.85, 1.0], np.float32) * 0.9
    # particle transition S5 -> S6
    burst = 0.0
    if 1192 <= k <= 1208:
        a, b = load(min(1200, k)), load(max(1201, k))
        m = sstep(1194, 1206, k)
        img = a * (1 - m) + b * m
        burst = math.sin(math.pi * (k - 1192) / 16.0)
    z, p, zb = zoom_plan(k)
    dx, dy = shake(k)
    if dx or dy:
        z = max(z, 1.03)
    img = zoom_blur(img, z, p, zb) if zb > 0.005 else warp(img, z, p, dx, dy)
    img = shockwave(img, k)
    sg = defocus(k)
    if sg > 0.2:
        img = ndimage.gaussian_filter(img, (sg, sg, 0))
    # atmosphere
    da = DUST.get(sc, 0.4)
    if da:
        col = np.array([0.8, 0.9, 1.0] if sc == "S5" else [1.0, 0.9, 0.76], np.float32)
        img = 1 - (1 - img) * (1 - np.clip(dust_layer(k, z, p, burst) * da, 0, 1)[..., None] * col)
    ba = BEAMS.get(sc, 0.0)
    if ba:
        col = np.array([0.75, 0.88, 1.0] if sc == "S5" else [1.0, 0.86, 0.62], np.float32)
        img = 1 - (1 - img) * (1 - (beams(k) * ba)[..., None] * col)
    # blockbuster look: grade, bloom + anamorphic streaks, lens aberration
    img = grade(np.clip(img, 0, 1), sc, k)
    f, col = flash(k)
    img = bloom(img, sc, boost=0.6 * f)
    img = aberration(img, ca_amount(k))
    # readability scrim: a soft dark gradient behind the top graphics (species card, stage
    # tracker, day counter), only as strong as the frame is bright behind them
    if 232 <= k <= 330 or 590 <= k <= 1345:
        band = float((img[100:200] @ LUMA).mean())
        amt = min(0.6, max(0.0, (band - 0.28) * 1.7))
        if amt > 0.01:
            ramp = np.clip(1 - (YY[:, :1] - 60) / 260.0, 0, 1) ** 1.6
            img = img * (1 - amt * ramp[..., None])
    if f > 0:
        img = 1 - (1 - img) * (1 - f * np.array(col, np.float32))
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def compose_bytes(k):
    return compose(k).tobytes()
