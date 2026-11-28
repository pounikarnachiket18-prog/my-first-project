"""Just KnowIt channel bug: an animated brand badge composited over every frame of the film.

The supplied logo (assets/textures/justknowit_logo.png, white brain + wordmark on brand red) is
keyed into clean alpha mattes and rebuilt as a compact pill badge at full 1080x1920 resolution,
so it stays crisp over the upscaled renders. Motion:
  - intro (frames 1-15): the pill springs open, the brain draws upward, the wordmark wipes on
  - every ~5 s and on every chapter change: a light sweep glints across the badge
  - story beats (impacts, chapter cuts): the brain pulses with a soft glow and the badge pops

Output: renders/brand/bug.mov (RGBA, qtrle, 1500 frames @ 30 fps) + a preview still.
Placed by tools/assemble.py at BUG_POS. Needs numpy + scipy (the audio venv) and ffmpeg.
"""
import math
import os
import subprocess

import numpy as np
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, "assets", "textures", "justknowit_logo.png")
OUT_DIR = os.path.join(ROOT, "renders", "brand")
OUT = os.path.join(OUT_DIR, "bug.mov")
N, FPS = 1500, 30
BUG_POS = (36, 124)                       # top-left of the canvas in the 1080x1920 frame
RED_TOP = np.array([214, 18, 32]) / 255.0  # brand red, lit from above
RED_BOT = np.array([170, 0, 14]) / 255.0
BRAIN_H, TEXT_H = 50, 21
PAD_L, GAP, PAD_R, PILL_H, M = 16, 10, 20, 72, 22
CHAPTERS = [61, 181, 391, 631, 931, 1201, 1411]      # chapter cuts (output frames)
BEATS = [1, 60, 181, 391, 631, 931, 1201, 1290, 1411]  # impacts the brain pulses on


def load_logo():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", LOGO, "-f", "rawvideo", "-pix_fmt",
                          "rgb24", "-"], capture_output=True, check=True).stdout
    side = int(round(math.sqrt(len(raw) / 3)))
    img = np.frombuffer(raw, np.uint8).reshape(side, side, 3).astype(np.float32)
    alpha = np.clip((img[..., 1] - 50) / 160.0, 0, 1)   # white art on red: green channel keys
    rows = np.where(alpha.max(1) > 0.5)[0]
    gap = np.where(np.diff(rows) > 5)[0][0]
    bands = [(rows[0], rows[gap]), (rows[gap + 1], rows[-1])]
    out = []
    for y0, y1 in bands:
        cols = np.where(alpha[y0:y1 + 1].max(0) > 0.5)[0]
        out.append(alpha[y0 - 2:y1 + 3, cols.min() - 2:cols.max() + 3])
    return out  # brain matte, wordmark matte


def resize(m, h):
    s = h / m.shape[0]
    m = ndimage.gaussian_filter(m, 0.45 / s)            # pre-filter: clean downsample
    return np.clip(ndimage.zoom(m, s, order=1), 0, 1)


def rounded_rect(w, h, r, ss=4):
    yy, xx = np.mgrid[0:h * ss, 0:w * ss].astype(np.float32) / ss
    dx = np.maximum(np.maximum(r - xx, xx - (w - r)), 0)
    dy = np.maximum(np.maximum(r - yy, yy - (h - r)), 0)
    inside = (np.sqrt(dx * dx + dy * dy) <= r).astype(np.float32)
    return inside.reshape(h, ss, w, ss).mean((1, 3))


def ease_back(t, s=1.9):
    t = min(1.0, max(0.0, t)) - 1
    return t * t * ((s + 1) * t + s) + 1


def smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


class Badge:
    def __init__(self):
        brain, text = load_logo()
        self.brain = resize(brain, BRAIN_H)
        self.text = resize(text, TEXT_H)
        bw, tw = self.brain.shape[1], self.text.shape[1]
        self.pw = PAD_L + bw + GAP + tw + PAD_R
        self.ph = PILL_H
        self.cw, self.chh = self.pw + 2 * M, self.ph + 2 * M
        self.pill = rounded_rect(self.pw, self.ph, self.ph / 2)
        inner = rounded_rect(self.pw - 3, self.ph - 3, (self.ph - 3) / 2)
        stroke = self.pill.copy()
        stroke[1:-2, 1:-2] -= inner
        self.stroke = np.clip(stroke, 0, 1)
        g = np.linspace(0, 1, self.ph)[:, None, None]
        self.red = RED_TOP * (1 - g) + RED_BOT * g
        self.gloss = np.clip(1 - np.linspace(0, 1, self.ph) / 0.45, 0, 1)[:, None] ** 2 * 0.16
        self.bx, self.by = PAD_L, (self.ph - self.brain.shape[0]) // 2
        self.tx, self.ty = PAD_L + bw + GAP, (self.ph - self.text.shape[0]) // 2 + 1
        self.yy, self.xx = np.mgrid[0:self.ph, 0:self.pw].astype(np.float32)

    def frame(self, k):
        """RGBA float frame (canvas size) for output frame k (1-based)."""
        intro = 0.35 + 0.65 * ease_back((k - 1) / 12.0)   # on screen from the very first frame
        a_master = 0.55 + 0.45 * smooth((k - 1) / 6.0)
        # brain draws upward, wordmark wipes left -> right (soft edge)
        bh = self.brain.shape[0]
        reveal_b = 0.35 + 0.65 * smooth((k - 1) / 12.0)
        my = np.clip((np.arange(bh)[::-1, None] - (1 - reveal_b) * bh) / 4.0 + 0.5, 0, 1)
        tw = self.text.shape[1]
        reveal_t = 0.3 + 0.7 * smooth((k - 3) / 14.0)
        mx = np.clip((reveal_t * (tw + 20) - np.arange(tw)[None, :]) / 8.0, 0, 1)
        art = np.zeros((self.ph, self.pw), np.float32)
        art[self.by:self.by + bh, self.bx:self.bx + self.brain.shape[1]] += self.brain * my
        art[self.ty:self.ty + self.text.shape[0], self.tx:self.tx + tw] += self.text * mx
        art = np.clip(art, 0, 1)
        # brain pulse on story beats
        pulse = 0.0
        for b in BEATS:
            if b <= k <= b + 20:
                pulse = max(pulse, math.exp(-((k - b) / 7.0) ** 2) * (1.0 if b > 1 else 0.6))
        glow = np.zeros_like(art)
        if pulse > 0.01:
            bm = np.zeros_like(art)
            bm[self.by:self.by + bh, self.bx:self.bx + self.brain.shape[1]] = self.brain * my
            glow = ndimage.gaussian_filter(bm, 5) * 1.6 * pulse
        # light sweep: diagonal glint every 150 frames and on each chapter cut
        sweep_t = None
        for c in CHAPTERS + list(range(40, N, 150)):
            if c <= k <= c + 22:
                sweep_t = (k - c) / 22.0
        sweep = np.zeros_like(art)
        if sweep_t is not None:
            pos = -60 + (self.pw + 120) * sweep_t
            d = (self.xx + 0.42 * self.yy) - pos
            sweep = np.exp(-(d / 14.0) ** 2) * 0.42 + np.exp(-(d / 40.0) ** 2) * 0.10
        # compose (straight colour, then alpha)
        rgb = self.red * (1 + 0.25 * pulse)
        rgb = rgb + self.gloss[..., None]
        rgb = rgb * (1 - art[..., None]) + art[..., None] * 1.0
        rgb = rgb + (glow + sweep)[..., None] * self.pill[..., None]
        rgb = rgb * (1 - 0.35 * self.stroke[..., None]) + 0.35 * self.stroke[..., None]
        alpha = self.pill * 0.96
        layer = np.zeros((self.chh, self.cw, 4), np.float32)
        layer[M:M + self.ph, M:M + self.pw, :3] = np.clip(rgb, 0, 1)
        layer[M:M + self.ph, M:M + self.pw, 3] = alpha
        # drop shadow
        sh = np.zeros((self.chh, self.cw), np.float32)
        sh[M + 4:M + 4 + self.ph, M:M + self.pw] = self.pill
        sh = ndimage.gaussian_filter(sh, 6) * 0.5
        a = layer[..., 3]
        out_a = a + sh * (1 - a)
        out_rgb = layer[..., :3] * (a / np.maximum(out_a, 1e-6))[..., None]
        out = np.dstack([out_rgb, out_a])
        # scale: intro spring + pop on chapter cuts
        pop = 0.0
        for c in CHAPTERS:
            if c <= k <= c + 12:
                pop = max(pop, math.sin(math.pi * (k - c) / 12.0))
        s = max(0.05, intro) * (1 + 0.07 * pop)
        if abs(s - 1) > 1e-3:
            out = self._scale(out, s)
        out[..., 3] *= a_master
        return out

    def _scale(self, img, s):
        cy, cx = self.chh / 2, M + self.ph / 2      # scale about the brain end (left)
        yy, xx = np.mgrid[0:self.chh, 0:self.cw].astype(np.float32)
        ys, xs = cy + (yy - cy) / s, cx + (xx - cx) / s
        return np.stack([ndimage.map_coordinates(img[..., c], [ys, xs], order=1, cval=0.0)
                         for c in range(4)], -1)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    b = Badge()
    w, h = b.cw, b.chh
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}",
           "-r", str(FPS), "-i", "-", "-c:v", "qtrle", "-pix_fmt", "argb", OUT]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for k in range(1, N + 1):
        f = b.frame(k)
        enc.stdin.write((np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
        if k == 200:  # preview still on dark grey
            bg = np.full((h, w, 3), 0.12, np.float32)
            comp = f[..., :3] * f[..., 3:] + bg * (1 - f[..., 3:])
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{w}x{h}", "-i", "-", os.path.join(OUT_DIR, "bug_preview.png")],
                           input=(comp * 255).astype(np.uint8).tobytes(), check=True)
    enc.stdin.close()
    if enc.wait():
        raise SystemExit("ffmpeg failed")
    print("wrote", OUT, f"{w}x{h}")


if __name__ == "__main__":
    main()
