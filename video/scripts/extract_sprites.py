"""Cut the user's Tripo turntable renders into RGBA sprite sequences (one image per 3 degrees of yaw).
usage: python3 extract_sprites.py <missile.mp4> <jet.mp4> <ship.mp4> <out_dir> [preview_dir]
- background plate = low percentile over all frames of all three videos (same studio template)
- alpha from colour distance to the plate; watermark/QR region removed
- floor reflection removed by finding the mirror (contact) line per frame
Writes <out_dir>/<name>/NNN.webp plus <out_dir>/sprites.json (crop box, anchor, side-view length in px)."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
from scipy.ndimage import binary_opening, label, gaussian_filter

W = H = 1080
NAMES = ["missile", "jet", "ship"]
FRONT = {"missile": 0, "jet": 90, "ship": 0}  # frame index where the nose/bow points at the camera


def read(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def main():
    paths, out = sys.argv[1:4], sys.argv[4]
    prev = sys.argv[5] if len(sys.argv) > 5 else None
    vids = [read(p) for p in paths]
    allf = np.concatenate(vids, 0)
    bg = np.empty((H, W, 3), np.float32)
    for y in range(0, H, 60):
        bg[y:y + 60] = np.percentile(allf[:, y:y + 60].astype(np.float32), 12, axis=0)
    bg = gaussian_filter(bg, (3, 3, 0))
    meta = {}
    for name, frames in zip(NAMES, vids):
        n = len(frames)
        raw, y0s = [], []
        for k in range(n):
            fr = frames[k].astype(np.float32)
            d = np.abs(fr - bg).max(2)
            a = np.clip((d - 7.0) / 16.0, 0, 1)
            a[:300] = 0  # watermark + QR code
            # contact line: the floor reflection is ~3x dimmer than the model -> strongest drop in row brightness
            on = a > 0.3
            cnt = on.sum(1)
            rowsum = (d * on).sum(1)
            R = np.where(cnt > 3, rowsum / np.maximum(cnt, 1), 0)
            rows = np.nonzero(cnt > 3)[0]
            top, bot = rows.min(), rows.max()
            h = bot - top
            best, y0 = -1e9, bot
            for c in range(top + int(h * 0.2), bot - 4):
                above = R[max(top, c - 14):c]; below = R[c:c + 14]
                wa = cnt[max(top, c - 14):c]; wb = cnt[c:c + 14]
                if wa.sum() == 0 or wb.sum() == 0: continue
                sc = (above * wa).sum() / wa.sum() - (below * wb).sum() / wb.sum()
                if sc > best: best, y0 = sc, c
            raw.append(a); y0s.append(y0)
        y0s = np.array(y0s, float)
        # the contact line moves smoothly as the model turns: robust circular smoothing, outliers pulled to the trend
        ext = np.concatenate([y0s[-12:], y0s, y0s[:12]])
        med = np.array([np.median(ext[i:i + 25]) for i in range(n)])
        y0f = np.where(np.abs(y0s - med) > 10, med, y0s)
        ext = np.concatenate([y0f[-4:], y0f, y0f[:4]])
        y0f = np.array([ext[i:i + 9].mean() for i in range(n)])
        print(name, "contact y raw", y0s.astype(int).tolist()[::10], "smoothed", y0f.astype(int).tolist()[::10])
        alphas = []
        yy = np.arange(H)[:, None]
        for k in range(n):
            a = raw[k] * np.clip((y0f[k] + 3 - yy) / 4.0, 0, 1)
            m = binary_opening(a > 0.3, iterations=1)
            lab, nl = label(m)
            if nl > 1:
                sizes = np.bincount(lab.ravel()); sizes[0] = 0
                keep = sizes > sizes.max() * 0.04
                a = a * gaussian_filter(keep[lab].astype(np.float32), 2.0).clip(0, 1)
            alphas.append(a)
        # common crop for the whole turntable so the rotation axis stays fixed
        acc = np.max(np.stack([a > 0.2 for a in alphas]), 0)
        ys, xs = np.nonzero(acc)
        pad = 12
        x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad)
        y0c, y1c = max(0, ys.min() - pad), min(H, ys.max() + pad)
        # symmetric about the turntable axis x = 540 so the anchor is the image centre in x
        half = max(540 - x0, x1 - 540); x0, x1 = 540 - half, 540 + half
        scale = min(1.0, (1000 if name == "missile" else 640) / (x1 - x0))  # missile gets close-ups: keep more pixels
        os.makedirs(os.path.join(out, name), exist_ok=True)
        side = (FRONT[name] + 30) % n  # nose pointing screen-left
        a = alphas[side]
        cols = np.nonzero((a > 0.3).any(0))[0]
        rowsS = np.nonzero((a > 0.3).any(1))[0]
        side_len_px = float(cols.max() - cols.min()) * scale
        axis_y = float((rowsS.min() + rowsS.max()) / 2 - y0c) * scale
        for k in range(n):
            fr = frames[k].astype(np.float32)
            a = alphas[k]
            # un-mix the dark studio background from soft edges
            col = np.where(a[..., None] > 0.02, (fr - bg * (1 - a[..., None])) / np.maximum(a[..., None], 0.02), 0)
            rgba = np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)[y0c:y1c, x0:x1]
            im = Image.fromarray(rgba, "RGBA")
            if scale < 1: im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
            im.save(os.path.join(out, name, f"{k:03d}.webp"), quality=86, method=5)
            if prev and k % 10 == 0:
                bgim = Image.new("RGBA", im.size, (110, 170, 220, 255)); bgim.alpha_composite(im)
                bgim.convert("RGB").save(os.path.join(prev, f"{name}_{k:03d}.png"))
        meta[name] = {"frames": n, "front": FRONT[name], "degPerFrame": 360 / n, "w": round((x1 - x0) * scale), "h": round((y1c - y0c) * scale),
                      "axisX": round(half * scale, 1), "axisY": round(axis_y, 1), "sideLenPx": round(side_len_px, 1)}
        print(name, meta[name])
    json.dump(meta, open(os.path.join(out, "sprites.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
