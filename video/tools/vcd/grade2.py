import numpy as np, json, os
from grade import rgb2hsv, band, EXT, is_ext

LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)
SHIRT = np.array([0.20, 0.47, 0.32], np.float32)   # forest green (overridable)

def box(m, r):
    """Mean filter of radius r using an integral image."""
    p = np.pad(m, r + 1, mode='edge').astype(np.float64)
    c = p.cumsum(0).cumsum(1)
    k = 2 * r + 1
    s = c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]
    return (s / (k * k))[:m.shape[0], :m.shape[1]].astype(np.float32)

def shirt_mask(a, gate=None):
    h, s, v = rgb2hsv(a)
    raw = band(h, 192, 245, 10) * np.clip((s - 0.06) / 0.04, 0, 1) * np.clip((0.62 - s) / 0.08, 0, 1) * np.clip((v - 0.40) / 0.07, 0, 1)
    if gate is not None: raw = raw * gate
    # remove specks + fill pin-holes, then feather edges
    dens = box(raw, 4)
    m = np.clip((dens - 0.30) / 0.35, 0, 1)
    m = np.maximum(m * (raw > 0.05), np.clip((box(m, 2) - 0.55) / 0.3, 0, 1))
    m = box(m, 1)
    # allow soft fringe only on bluish pixels (stops bleeding into skin / walls)
    wide = band(h, 180, 260, 15) * np.clip((s - 0.03) / 0.03, 0, 1)
    return np.clip(m * wide, 0, 1)

def recolor(a, m, color):
    L = (a @ LUMA)[..., None]
    Lc = float(color @ LUMA)
    # keep the original shading, scaled into the new colour
    rec = np.clip(color[None, None, :] * (L / Lc) * 0.92, 0, 1)
    return a * (1 - m[..., None]) + rec * m[..., None]

def diffuse_fill(img, hole, iters=80):
    """Fill hole pixels by repeated neighbour averaging (simple inpaint)."""
    out = img.copy()
    known = ~hole
    if not hole.any(): return out
    # init holes with mean of known border
    out[hole] = out[known].mean(0) if known.any() else 0.5
    for _ in range(iters):
        p = np.pad(out, ((1, 1), (1, 1), (0, 0)), mode='edge')
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        out[hole] = avg[hole]
    return out

def paint_out_text(a, x0, x1, y0, y1, thr, skew_deg=0.0, cx=None, hh=None, dil=2, iters=80):
    """Remove bright text inside a (optionally skewed) box by inpainting it."""
    H, W, _ = a.shape
    xa, xb, ya, yb = max(0, int(x0)), min(W, int(x1)), max(0, int(y0)), min(H, int(y1))
    if xb - xa < 4 or yb - ya < 4: return a
    patch = a[ya:yb, xa:xb]
    lum = patch @ LUMA
    sel = lum > thr
    if skew_deg and cx is not None:
        yy, xx = np.mgrid[ya:yb, xa:xb]
        cy = (y0 + y1) / 2 + np.tan(np.radians(skew_deg)) * (xx - cx)
        sel &= np.abs(yy - cy) < hh
    # dilate 2px
    selm = box(sel.astype(np.float32), dil) > 0.01
    a = a.copy()
    a[ya:yb, xa:xb] = diffuse_fill(patch, selm, iters)
    return a

# ---- per-shot spatial gates for ABHI's shirt: (f0, f1, x0, x1, y0, y1) ----
GATES = [
    (127, 184, 0, 720, 360, 1150),
    (256, 324, 0, 340, 450, 1150),
    (411, 487, 0, 300, 630, 1020),
    (487, 671, 60, 380, 470, 1060),
    (671, 729, 120, 520, 450, 1100),
    (805, 881, 110, 480, 470, 1060),
    (967, 1044, 80, 330, 560, 800),
    (1044, 1121, 0, 430, 560, 1280),
]
_tr = None
def tracks():
    global _tr
    if _tr is None:
        _tr = json.load(open(os.path.join(os.path.dirname(__file__), 'tracks.json')))
    return _tr

def track_at(name, n):
    t = tracks()[name]; f0 = round(t['t0'] * 30); pts = t['pts']
    i = min(max(n - f0, 0), len(pts) - 1)
    # nearest valid point
    for d in range(0, 6):
        for j in (i - d, i + d):
            if 0 <= j < len(pts) and pts[j]: 
                p = pts[j]
                # extrapolate past the end for the exiting decal
                if n - f0 > len(pts) - 1 and name == 'decalA':
                    return p[0] - 2.1 * (n - f0 - (len(pts) - 1)), p[1] + 0.3 * (n - f0 - (len(pts) - 1))
                return p[0], p[1]
    return None

def grade_v2(frame, n, wb=None, mask=None, want_mask=False):
    t = n / 30
    a = frame.astype(np.float32) / 255.0
    out = a.copy()
    g = None; m = None
    if not is_ext(t):
        g = next((G for G in GATES if G[0] <= n < G[1]), None)
        if g is not None:
            src = np.clip(a * wb[0], 0, 1) if wb is not None else a
            gate = np.zeros(a.shape[:2], np.float32); gate[g[4]:g[5], g[2]:g[3]] = 1
            m = shirt_mask(src, gate) if mask is None else mask
            rec = recolor(src, m, SHIRT)
            if wb is not None:
                rec = np.clip(rec / wb[0], 0, 1)
            out = rec
        lum = (out @ LUMA)[..., None]
        sh = np.clip(1 - lum / 0.4, 0, 1); hi = np.clip((lum - 0.5) / 0.5, 0, 1)
        out = out + hi * np.array([0.03, 0.012, -0.03]) + sh * np.array([-0.015, 0.008, 0.025])
        out = (out - 0.5) * 1.07 + 0.5
    else:
        # paint out the old channel logo on the loco side, keep "Bharatiya Rail"
        if 66 <= n < 108:
            p = track_at('decalA', n)
            if p and p[0] > -40:
                out = paint_out_text(out, p[0] - 36, p[0] + 34, p[1] - 22, p[1] + 20, 0.5, -11, p[0], 12)
        if 881 <= n < 967:
            p = track_at('decalB', n)
            if p:
                out = paint_out_text(out, p[0] - 34, p[0] + 32, p[1] - 34, p[1] + 34, 0.5, -28, p[0], 15)
        # paint out the old channel name on the end card
        if n >= 1232:
            out = paint_out_text(out, 190, 530, 196, 288, 0.19, dil=4, iters=140)
        # night split-tone (train keeps its original colours)
        lum = (out @ LUMA)[..., None]
        sh = np.clip(1 - lum / 0.35, 0, 1); hi = np.clip((lum - 0.55) / 0.45, 0, 1)
        out = out + sh * np.array([0.045, -0.004, 0.03]) * (0.4 + lum * 3) + hi * np.array([0.05, 0.025, -0.03])
        out = (out - 0.5) * 1.06 + 0.5
    lum = (out @ LUMA)[..., None]
    out = lum + (out - lum) * 1.08
    img = (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)
    if want_mask:
        return img, (m if (not is_ext(t) and g is not None) else None)
    return img
