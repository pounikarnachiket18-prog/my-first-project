"""Sound design for reel 2 v2 (Tejas fires both missiles); all synthesized, no third-party audio.
usage: python3 build_mix_h2.py [voice.wav]   -> public/navy/mix_h2.wav (then loudnorm to -14 LUFS)
Event times mirror src/navy/hyper2/scenes_h2.tsx + HyperVideo2.tsx transitions and come from src/navy/hyper2/timeline.json."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(__file__); PUB = os.path.join(HERE, "..", "public", "navy")
tl = json.load(open(os.path.join(HERE, "..", "src", "navy", "hyper2", "timeline.json")))
vpath = sys.argv[1] if len(sys.argv) > 1 else os.path.join(PUB, "voice_h2.wav")
voice, SR = sf.read(vpath, dtype="float64")
if voice.ndim > 1: voice = voice.mean(1)
LOGO_AT = round(tl["lines"][-1]["t0"] * 30) - 3          # mirrors HyperVideo2.tsx
TOTAL = max(tl["frames"], LOGO_AT + 12 + 124 + 36) / 30
N = int(max(len(voice), TOTAL * SR)); voice = np.pad(voice, (0, N - len(voice)))
rng = np.random.default_rng(5); FPS = 30
fr = lambda x: round(x * FPS) / FPS
SC = {s["id"]: s for s in tl["scenes"]}
S0 = lambda s: round(SC[s]["start"] * FPS) / FPS
Ls = lambda i: fr(tl["lines"][i]["t0"]); Le = lambda i: fr(tl["lines"][i]["t1"])
W = lambda i, j: fr(tl["lines"][i]["words"][min(j, len(tl["lines"][i]["words"]) - 1)]["t0"])
def lp(x, hz): return sosfilt(butter(2, hz, "low", fs=SR, output="sos"), x)
def hp(x, hz): return sosfilt(butter(2, hz, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
def noise(n): return rng.standard_normal(n)
def env(n, a, r):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e
L_, R_ = np.zeros(N), np.zeros(N)
def add(x, t, g=1.0, pan=0.0):
    i = int(max(0, t) * SR)
    if i >= N: return
    x = x[: N - i] * g
    L_[i:i + len(x)] += x * np.sqrt(0.5 * (1 - pan)); R_[i:i + len(x)] += x * np.sqrt(0.5 * (1 + pan))
def whoosh(d, lo, hi, g=1.0):
    n = int(d * SR); x = noise(n); out = np.zeros(n); sw = np.linspace(0, 1, n)
    for i in range(0, n, 1024):
        f = lo + (hi - lo) * sw[i] ** 1.4; out[i:i + 1024] = bp(x[i:i + 1024], max(40, f * 0.7), min(f * 1.4, SR / 2 - 200))
    return out * env(n, d * 0.6, d * 0.4) * g
def rumble(d, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    return (lp(noise(n), 700) * 1.6 + 0.35 * np.sin(2 * np.pi * (70 + 40 * t / d) * t)) * np.linspace(0.4, 1, n) * env(n, 0.2, min(1.0, d * 0.4)) * g
def flyby(d, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR; c = d * 0.45
    f = 900 * (1 + 0.25 * np.tanh((c - t) * 3))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + lp(noise(n), 1600)) / (1 + ((t - c) * 2.2) ** 2) * env(n, 0.05, 0.6) * g
def sonic_boom(g=1.0):
    n = int(2.2 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for d0 in (0.0, 0.12):  # the double "N-wave" crack
        i0 = int(d0 * SR); w = int(0.012 * SR)
        x[i0:i0 + w] += np.linspace(1, -1, w); x[i0 + w:i0 + w + int(0.004 * SR)] += np.linspace(-1, 0, int(0.004 * SR))
    x = lp(x, 2500) * 3 + lp(noise(n), 200) * np.exp(-t * 2.5) * 0.8
    return x * g
def plasma(d, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = hp(noise(n), 1500) * 0.6 + bp(noise(n), 300, 900) * 0.6
    crack = np.zeros(n)
    for _ in range(int(d * 60)):
        i = rng.integers(0, n - 300); crack[i:i + 300] += hp(noise(300), 3000) * np.exp(-np.arange(300) / 50) * rng.uniform(0.2, 0.8)
    return (x + crack) * env(n, 0.3, 0.5) * g
def explosion(g=1.0):
    n = int(3.0 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (35 + 90 * np.exp(-t * 7)) * t) * np.exp(-t * 1.8) * 1.2 + lp(noise(n), 900) * np.exp(-t * 3.2) + hp(noise(n), 3000) * np.exp(-t * 14) * 0.5) * g
def clunk(g=1.0):
    n = int(0.8 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 70 * t) * np.exp(-t * 12) + sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 10) for f in (520, 830)) * 0.2) * g
def ping(g=1.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 880 * t) * np.exp(-t * 8) * g
def thump(g=1.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (50 + 60 * np.exp(-t * 20)) * t) * np.exp(-t * 9)) * g
def riser(d, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    return (whoosh(d, 200, 4000, 1.0) + np.sin(2 * np.pi * np.cumsum(200 + 600 * (t / d) ** 2) / SR) * 0.3) * np.linspace(0.2, 1, n) * g
def fire(d, g=1.0):
    n = int(d * SR); x = np.zeros(n)
    for _ in range(int(d * 25)):
        i = rng.integers(0, n - 500); x[i:i + 500] += bp(noise(500), 800, 4000) * np.exp(-np.arange(500) / 120)
    return (x + lp(noise(n), 300) * 0.4) * env(n, 0.5, 1.0) * g

def tapestop(g=1.0):
    n = int(0.55 * SR); t = np.arange(n) / SR
    f = 180 * (1 - t / 0.55) ** 2 + 30
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + lp(noise(n), 400) * 0.5) * (1 - t / 0.55) * g
def buzz(d, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sign(np.sin(2 * np.pi * 100 * t)) * 0.3 + hp(noise(n), 2500) * 0.4) * np.exp(-t * 6) * g
def tick(g=1.0):
    n = int(0.05 * SR); return hp(noise(n), 3000) * np.exp(-np.arange(n) / (0.006 * SR)) * g
def chime(d, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR; m2f = lambda m: 440 * 2 ** ((m - 69) / 12)
    return sum(np.sin(2 * np.pi * m2f(m) * t) * np.exp(-t * (1.2 + k * 0.3)) for k, m in enumerate((74, 78, 81, 86))) / 4 * env(n, 0.01, d * 0.5) * g

# ---- ambience: night sea wind
amb = (lp(noise(N), 450) * 0.6 + bp(noise(N), 900, 3000) * 0.1)
# ---- cold open: Tejas, twin launch, the race begins
rel = W(0, 5); ign = rel + 0.35
add(rumble(ign + 1.0, 0.5), 0.0); add(flyby(2.5, 0.6), 0.3, pan=-0.3)
add(clunk(0.7), rel); add(clunk(0.5), rel + 0.05)
add(whoosh(1.2, 200, 3500, 0.9), ign, pan=-0.3); add(whoosh(1.0, 300, 5000, 1.0), ign + 0.05, pan=0.3)
add(rumble(3.0, 0.8), ign); add(plasma(2.5, 0.35), ign + 0.4, pan=0.3)
add(ping(0.18), W(0, 7)); add(ping(0.22), W(0, 10))
add(whoosh(1.0, 1500, 300, 0.5), Ls(1) - 0.1); add(thump(0.8), W(1, 5))
# ---- transitions (mirror TRANS in HyperVideo2.tsx)
p0 = S0("pause"); add(tapestop(1.0), p0 - 0.1); add(thump(0.9), p0)
add(riser(0.5, 0.35), S0("mach") - 0.4)
add(whoosh(0.5, 400, 3500, 0.7), S0("supersonic") - 0.25, pan=-0.4)
add(whoosh(0.5, 600, 5000, 0.8), S0("hypersonic") - 0.25)
add(buzz(0.4, 0.4), S0("radar") - 0.05); add(clunk(0.4), S0("radar"))
add(whoosh(0.6, 200, 1200, 0.6), S0("time") - 0.3)
add(whoosh(0.5, 400, 3500, 0.8), S0("strike") - 0.25, pan=0.4)
add(whoosh(1.0, 1200, 200, 0.4), S0("outro") - 0.4)
# ---- mach: sound waves
m0 = S0("mach")
for k in range(10): add(ping(0.12), m0 + 0.2 + k * 0.42)
# ---- supersonic: cruise + shock wave
s0 = S0("supersonic"); add(rumble(S0("hypersonic") - s0, 0.55), s0); add(flyby(2.2, 0.6), Ls(4) + 0.4, pan=-0.4)
add(sonic_boom(1.3), W(5, 9))
# ---- hypersonic: plasma sheath
h0 = S0("hypersonic"); add(plasma(S0("radar") - h0, 0.6), h0); add(rumble(S0("radar") - h0, 0.35), h0)
# ---- radar console
r0 = S0("radar")
k = 0
while r0 + 0.3 + k * 1.333 < S0("time") - 0.2:
    add(ping(0.1), r0 + 0.3 + k * 1.333); k += 1
turn = W(8, 20)
for j in range(4): add(ping(0.16), turn + j * 0.18)
# ---- travel time: ticking clock
go = W(9, 1); t = go
while t < S0("strike") - 0.3:
    add(tick(0.25), t); t += 0.25
# ---- strike
st0 = S0("strike"); add(rumble(2.0, 0.6), st0); add(plasma(1.6, 0.4), st0)
hyper_hit = Le(10) - 10 / FPS; super_hit = W(11, 1)
add(riser(max(0.5, hyper_hit - (st0 + 0.6)), 0.4), st0 + 0.6)
add(explosion(0.9), hyper_hit); add(explosion(1.3), super_hit); add(thump(1.0), super_hit)
o0 = S0("outro"); add(fire(LOGO_AT / FPS - o0 + 0.5, 0.25), o0)
# ---- logo end card
lg = LOGO_AT / FPS; add(whoosh(0.5, 300, 2500, 0.4), lg - 0.1); add(chime(3.0, 0.5), lg + 0.4)
# ---- music: tense pulse bed under the explanation + race, final swell on the logo
m2f = lambda m: 440 * 2 ** ((m - 69) / 12)
mus = np.zeros(N); bpm = 100; beat = 60 / bpm
for b in range(int((super_hit - m0) / beat)):
    tt = m0 + b * beat; n = int(0.22 * SR); t = np.arange(n) / SR
    i = int(tt * SR); seg = np.sin(2 * np.pi * (45 + 70 * np.exp(-t * 30)) * t) * np.exp(-t * 14) * 0.6
    mus[i:i + n] += seg[: max(0, min(n, N - i))]
    n2 = int(beat / 2 * SR); t2 = np.arange(n2) / SR; note = [50, 53, 57, 55][(b // 4) % 4] + 12
    seg2 = np.sin(2 * np.pi * m2f(note) * t2) * np.exp(-t2 * 9) * 0.12
    j = int((tt + beat / 2) * SR); mus[j:j + n2] += seg2[: max(0, min(n2, N - j))]
fin = int(o0 * SR); n = N - fin; t = np.arange(n) / SR
mus[fin:] += sum(np.sin(2 * np.pi * m2f(m) * t * d) for m in (50, 57, 62, 66) for d in (1, 1.003)) / 8 * np.minimum(1, t / 1.5) * np.minimum(1, (n / SR - t) / 1.0) * 0.7
# ---- freeze: the world goes quiet while "RUKO!" holds
g = np.ones(N); a, b = int(p0 * SR), int(S0("mach") * SR)
g[a:b] = 0.15; g = lp(g, 8)
L_ *= g; R_ *= g; amb = amb * g
# ---- mix
venv = np.sqrt(np.maximum(lp(voice ** 2, 6), 0)); vk = np.clip(venv / (venv.max() * 0.22), 0, 1)
duck_m, duck_s = lp(1 - 0.6 * vk, 4), lp(1 - 0.3 * vk, 6)
nm = lambda x, p: x / (np.abs(x).max() + 1e-9) * p
sL, sR = nm(L_, 0.45), nm(R_, 0.45); mus = nm(mus, 0.18); amb = nm(amb, 0.05)
L = voice * 0.92 + sL * duck_s + mus * duck_m + amb; R = voice * 0.92 + sR * duck_s + mus * duck_m + amb
fade = np.ones(N); nf = int(0.6 * SR); fade[-nf:] = np.linspace(1, 0, nf)
st = np.tanh(np.stack([L * fade, R * fade], 1) * 1.05) / np.tanh(1.05); st = st / np.abs(st).max() * 0.95
sf.write(os.path.join(PUB, "mix_h2.wav"), st.astype(np.float32), SR)
print("mix_h2 written", round(N / SR, 2), "s")
