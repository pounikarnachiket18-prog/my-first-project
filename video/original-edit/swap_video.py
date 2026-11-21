"""Turn the attendant in the original reel into a woman by tracking his head
and compositing the drawn overlay on every frame of his shot. Writes raw RGB
frames to stdout (720x1280, 30 fps) for ffmpeg to encode."""
import subprocess, sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, sys.argv[2])
from overlay import build

SRC = sys.argv[1]
W, H, FPS = 720, 1280, 30
END = int(sys.argv[3])               # last frame (exclusive) -> cut before end card
SHOT = (250, 350)                    # frames that can contain the man
REF = 270                            # t = 9.0 s, the frame the overlay was drawn on
TPL = (280, 205, 445, 465)           # head box (x0, y0, x1, y1) in REF

dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-vf", f"scale={W}:{H}:flags=lanczos",
                        "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
frames = {}
out = sys.stdout.buffer
ov = np.asarray(build()).astype(np.float32)  # RGBA in REF coordinates
x0, y0, x1, y1 = TPL

def read():
    b = dec.stdout.read(W * H * 3)
    return None if len(b) < W * H * 3 else np.frombuffer(b, np.uint8).reshape(H, W, 3)

# 1) buffer the shot, pass everything before it straight through
i = 0
while True:
    f = read()
    if f is None or i >= END:
        break
    if i < SHOT[0]:
        out.write(f.tobytes())
    elif i < SHOT[1]:
        frames[i] = f
    else:
        break
    i += 1
tail_first = f  # first frame after the shot (already read)

# 2) track the head (scale + position) against the reference frame
tpl = cv2.cvtColor(frames[REF][y0:y1, x0:x1], cv2.COLOR_RGB2GRAY)
track, score = {}, {}
for k in sorted(frames):
    g = cv2.cvtColor(frames[k], cv2.COLOR_RGB2GRAY)
    best = (-2, 1, 0, 0)
    for s in np.arange(0.94, 1.081, 0.005):
        t = cv2.resize(tpl, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        sx0, sy0 = max(0, x0 - 60), max(0, y0 - 60)
        area = g[sy0:min(H, y1 + 90), sx0:min(W, x1 + 90)]
        r = cv2.matchTemplate(area, t, cv2.TM_CCOEFF_NORMED)
        _, mv, _, ml = cv2.minMaxLoc(r)
        if mv > best[0]:
            best = (mv, s, ml[0] + sx0, ml[1] + sy0)
    score[k] = best[0]
    track[k] = best[1:]

clean = [k for k in sorted(frames) if score[k] > 0.80]
c0, c1 = clean[0], clean[-1]
# hold the transform through the crossfades, smooth the clean part
ks = sorted(frames)
arr = np.array([track[min(max(k, c0), c1)] for k in ks], dtype=float)
sm = arr.copy()
for j in range(len(ks)):
    lo, hi = max(0, j - 3), min(len(ks), j + 4)
    sm[j] = arr[lo:hi].mean(0)

# 3) visibility of the man during crossfades: least-squares blend factor
def alpha(k):
    if c0 <= k <= c1:
        return 1.0
    M = frames[c0 if k < c0 else c1].astype(float)
    L = (frames[SHOT[0]] if k < c0 else tail_first).astype(float)
    F = frames[k].astype(float)
    sl = np.s_[y0:y1, x0:x1]
    d = (M - L)[sl]
    a = ((F - L)[sl] * d).sum() / max((d * d).sum(), 1e-6)
    return float(np.clip(a, 0, 1))

log = []
for j, k in enumerate(ks):
    s, tx, ty = sm[j]
    a = alpha(k)
    f = frames[k]
    if a > 0.01:
        # map overlay (REF coords) -> frame: p' = s*(p - (x0,y0)) + (tx,ty)
        Mx = np.float32([[s, 0, tx - s * x0], [0, s, ty - s * y0]])
        warped = cv2.warpAffine(ov, Mx, (W, H), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        al = warped[..., 3:4] / 255.0 * a
        f = (f.astype(np.float32) * (1 - al) + warped[..., :3] * al).clip(0, 255).astype(np.uint8)
    log.append(f"{k} score={score[k]:.2f} s={s:.3f} tx={tx:.1f} ty={ty:.1f} alpha={a:.2f}")
    out.write(f.tobytes())

# 4) pass through the rest up to the cut
i = SHOT[1]
f = tail_first
while f is not None and i < END:
    out.write(f.tobytes())
    i += 1
    f = read()
dec.kill()
open(sys.argv[4], "w").write("\n".join(log))
