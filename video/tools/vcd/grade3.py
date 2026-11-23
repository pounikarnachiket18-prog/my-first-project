"""v3 grade: v2 (shirt, paint-outs, night/cab grade) + new caption palette + Rajdhani livery."""
import numpy as np
from grade import rgb2hsv, hsv2rgb, band, is_ext
from grade2 import shirt_mask, recolor, paint_out_text, track_at, tracks, GATES, SHIRT, LUMA

def hband(h, lo, hi, soft):
    """hue band that may wrap through 0/360"""
    if lo <= hi: return band(h, lo, hi, soft)
    return np.maximum(band(h, lo, 360 + soft, soft), band(h, -soft, hi, soft))

# caption regions: (f0, f1, x0, x1, y0, y1, kinds)  kinds: g=gold->cyan, m=mint->lime, s=salmon->magenta, w=white->cyan tint
CAPTIONS = [
    (0, 66, 140, 440, 110, 300, 'w'),
    (66, 127, 250, 470, 200, 345, 'g'),
    (184, 256, 110, 610, 230, 525, 'msw'),
    (256, 324, 90, 630, 185, 300, 'gm'),
    (324, 411, 20, 700, 125, 440, 'gm'),
    (411, 487, 50, 650, 190, 305, 'mg'),
    (487, 671, 50, 700, 85, 440, 'gm'),
    (671, 729, 440, 690, 145, 375, 'gm'),
    (729, 805, 140, 570, 185, 415, 'gsm'),
    (729, 805, 360, 700, 470, 850, 's'),
    (805, 881, 50, 540, 105, 265, 'gs'),
    (881, 967, 120, 610, 200, 285, 's'),
    (967, 1044, 70, 650, 125, 220, 'm'),
    (1044, 1121, 90, 650, 105, 325, 'gm'),
    (1121, 1320, 15, 705, 175, 525, 'g'),
    (1121, 1320, 325, 390, 470, 538, 'g'),
]
CYAN, LIME, MAGENTA = 188.0, 88.0, 330.0

def recolor_captions(a, n):
    for (f0, f1, x0, x1, y0, y1, kinds) in CAPTIONS:
        if not (f0 <= n < f1): continue
        p = a[y0:y1, x0:x1]
        h, s, v = rgb2hsv(p)
        nh = h.copy(); ns = s.copy(); m = np.zeros_like(h)
        if 'g' in kinds:   # gold / yellow text
            mg = band(h, 32, 62, 6) * np.clip((s - 0.25) / 0.1, 0, 1) * np.clip((v - 0.42) / 0.1, 0, 1)
            nh = np.where(mg > 0, CYAN, nh); ns = np.where(mg > 0, np.clip(np.maximum(s, 0.45) * 1.6, 0, 0.88), ns); m = np.maximum(m, mg)
        if 'm' in kinds:   # mint / pale green / pale blue text & rings
            mm = band(h, 85, 212, 8) * np.clip((s - 0.1) / 0.06, 0, 1) * np.clip((v - 0.52) / 0.08, 0, 1) * (1 - m)
            nh = np.where(mm > 0, LIME, nh); ns = np.where(mm > 0, np.clip(np.maximum(s, 0.5) * 1.1, 0, 0.85), ns); m = np.maximum(m, mm)
        if 's' in kinds:   # salmon / red text, bars, rings
            ms = hband(h, 345, 22, 6) * np.clip((s - 0.28) / 0.08, 0, 1) * np.clip((v - 0.38) / 0.08, 0, 1) * (1 - m)
            nh = np.where(ms > 0, MAGENTA, nh); ns = np.where(ms > 0, np.clip(np.maximum(s, 0.55), 0, 0.85), ns); m = np.maximum(m, ms)
        rec = hsv2rgb(nh, ns, v)
        out = p * (1 - m[..., None]) + rec * m[..., None]
        if 'w' in kinds:   # white text -> icy cyan tint
            mw = np.clip((v - 0.72) / 0.1, 0, 1) * np.clip((0.2 - s) / 0.08, 0, 1)
            out = out * (1 - 0.55 * mw[..., None]) + np.array([0.62, 0.95, 1.0], np.float32) * v[..., None] * 0.55 * mw[..., None]
        a[y0:y1, x0:x1] = out
    return a

# ---------------- Rajdhani livery ----------------
FINAL_KF = [
    (1121, 360, 605, 323, 690, 424, 690), (1155, 360, 605, 322, 692, 426, 692), (1185, 360, 600, 320, 695, 430, 695),
    (1215, 360, 592, 315, 698, 435, 698), (1245, 360, 590, 312, 702, 443, 706), (1275, 360, 592, 310, 708, 450, 708),
    (1305, 360, 598, 305, 710, 455, 712), (1320, 362, 598, 305, 710, 455, 712)]
def final_box(n):
    """loco nose only (below the roof line, between the side edges) - no sky inside"""
    k = np.array(FINAL_KF, np.float32)
    c = [np.interp(n, k[:, 0], k[:, j]) for j in range(1, 7)]
    sp = c[4] - c[2]
    return int(c[2] - 0.30 * sp), int(c[4] + 0.19 * sp), int(c[1] + 0.24 * sp), int(c[3] + 0.8 * sp)

def livery(a, n):
    h, s, v = rgb2hsv(a)
    # loco body: saturated blue -> crimson
    m = band(h, 200, 242, 12) * np.clip((s - 0.42) / 0.12, 0, 1) * np.clip((v - 0.24) / 0.08, 0, 1)
    # darker loco front faces (only inside the tracked loco box, so the night sky is safe)
    box = None
    if 1121 <= n < 1320: box = final_box(n)
    elif 184 <= n < 256:
        p = track_at('front', n)
        if p: box = (int(p[0] - 68), int(p[0] + 30), int(p[1] + 44), int(p[1] + 150))
    if box:
        x0, x1, y0, y1 = max(0, box[0]), min(720, box[1]), max(0, box[2]), min(1280, box[3])
        gate = np.zeros_like(m); gate[y0:y1, x0:x1] = 1
        md = band(h, 200, 245, 12) * np.clip((s - 0.3) / 0.1, 0, 1) * np.clip((v - 0.1) / 0.06, 0, 1) * gate
        m = np.maximum(m, md)
    rec = hsv2rgb(np.full_like(h, 352.0), np.clip(s * 1.05, 0, 0.85), np.clip(v * 0.95, 0, 1))
    out = a * (1 - m[..., None]) + rec * m[..., None]
    # upper loco band: pale steel-blue -> warm cream
    m2 = band(h, 200, 242, 12) * np.clip((s - 0.12) / 0.05, 0, 1) * np.clip((0.5 - s) / 0.06, 0, 1) * np.clip((v - 0.46) / 0.08, 0, 1) * (1 - m)
    rec2 = hsv2rgb(np.full_like(h, 38.0), np.clip(s * 0.45, 0, 0.2), np.clip(v * 1.03, 0, 1))
    out = out * (1 - m2[..., None]) + rec2 * m2[..., None]
    # coaches: bright red -> deep Rajdhani maroon
    hh, ss, vv = rgb2hsv(out)
    mc = hband(hh, 348, 16, 6) * np.clip((ss - 0.5) / 0.1, 0, 1) * np.clip((vv - 0.12) / 0.06, 0, 1) * (1 - np.maximum(m, m2))
    rec3 = hsv2rgb(np.full_like(hh, 345.0), np.clip(ss * 0.95, 0, 0.9), vv * 0.72)
    return out * (1 - mc[..., None]) + rec3 * mc[..., None]

def grade_v3(frame, n, wb=None, mask=None):
    t = n / 30
    a = frame.astype(np.float32) / 255.0
    out = a.copy()
    if not is_ext(t):
        g = next((G for G in GATES if G[0] <= n < G[1]), None)
        if g is not None:
            src = np.clip(a * wb[0], 0, 1) if wb is not None else a
            gate = np.zeros(a.shape[:2], np.float32); gate[g[4]:g[5], g[2]:g[3]] = 1
            m = shirt_mask(src, gate) if mask is None else mask
            rec = recolor(src, m, SHIRT)
            if wb is not None: rec = np.clip(rec / wb[0], 0, 1)
            out = rec
        out = recolor_captions(out, n)
        lum = (out @ LUMA)[..., None]
        sh = np.clip(1 - lum / 0.4, 0, 1); hi = np.clip((lum - 0.5) / 0.5, 0, 1)
        out = out + hi * np.array([0.03, 0.012, -0.03]) + sh * np.array([-0.015, 0.008, 0.025])
        out = (out - 0.5) * 1.07 + 0.5
    else:
        if 66 <= n < 108:
            p = track_at('decalA', n)
            if p and p[0] > -40:
                out = paint_out_text(out, p[0] - 36, p[0] + 34, p[1] - 22, p[1] + 20, 0.5, -11, p[0], 12)
        if 881 <= n < 967:
            p = track_at('decalB', n)
            if p:
                out = paint_out_text(out, p[0] - 34, p[0] + 32, p[1] - 34, p[1] + 34, 0.5, -28, p[0], 15)
        if n >= 1232:
            out = paint_out_text(out, 190, 530, 196, 288, 0.19, dil=4, iters=140)
        out = recolor_captions(out, n)
        out = livery(out, n)
        lum = (out @ LUMA)[..., None]
        sh = np.clip(1 - lum / 0.35, 0, 1); hi = np.clip((lum - 0.55) / 0.45, 0, 1)
        out = out + sh * np.array([0.045, -0.004, 0.03]) * (0.4 + lum * 3) + hi * np.array([0.05, 0.025, -0.03])
        out = (out - 0.5) * 1.06 + 0.5
    lum = (out @ LUMA)[..., None]
    out = lum + (out - lum) * 1.08
    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)
