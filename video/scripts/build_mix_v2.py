"""v2 sound design: narration + layered, fully synthesized SFX + ducked music + final orchestral rise.
Event times mirror the scene logic in src/navy/v2/scenes2.tsx (all derived from the v2 timeline).
Writes public/navy/mix_v2.wav (stereo, 44.1 kHz). Loudness-normalise afterwards with ffmpeg loudnorm."""
import json, os
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(__file__)
PUB = os.path.join(HERE, "..", "public", "navy")
import sys
VER = sys.argv[1] if len(sys.argv) > 1 else "v2"  # "v2" (night, 105 s) or "v3" (day, 90 s)
tl = json.load(open(os.path.join(HERE, "..", "src", "navy", VER, "timeline.json")))
voice, SR = sf.read(os.path.join(PUB, f"voice_{VER}.wav"), dtype="float64")
N = len(voice)
rng = np.random.default_rng(11)
FPS = 30
fr = lambda x: round(x * FPS) / FPS
SC = {s["id"]: s for s in tl["scenes"]}
S0 = lambda sid: round(SC[sid]["start"] * FPS) / FPS
Ls = lambda i: fr(tl["lines"][i]["t0"])
Le = lambda i: fr(tl["lines"][i]["t1"])
W = lambda i, j: fr(tl["lines"][i]["words"][j]["t0"])
T_END = tl["duration"]


def lp(x, hz, o=2): return sosfilt(butter(o, hz, "low", fs=SR, output="sos"), x)
def hp(x, hz, o=2): return sosfilt(butter(o, hz, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
def noise(n): return rng.standard_normal(n)


def env(n, a, r, curve=2.0):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


class Bus:
    def __init__(self): self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, x, t, g=1.0, pan=0.0):
        i = int(max(0, t) * SR)
        if i >= N: return
        x = x[: N - i] * g
        self.L[i:i + len(x)] += x * np.sqrt(0.5 * (1 - pan))
        self.R[i:i + len(x)] += x * np.sqrt(0.5 * (1 + pan))
    def addst(self, l, r, t, g=1.0):
        i = int(max(0, t) * SR)
        if i >= N: return
        l, r = l[: N - i] * g, r[: N - i] * g
        self.L[i:i + len(l)] += l; self.R[i:i + len(r)] += r


# ---------------- sound sources ----------------
def whoosh(d=1.0, lo=300, hi=3000, g=1.0):
    n = int(d * SR); x = noise(n); out = np.zeros(n); sweep = np.linspace(0, 1, n)
    for i in range(0, n, 1024):
        f = lo + (hi - lo) * sweep[i] ** 1.4
        out[i:i + 1024] = bp(x[i:i + 1024], max(40, f * 0.7), min(f * 1.4, SR / 2 - 200))
    return out * env(n, d * 0.6, d * 0.4) * g


def rumble(d=3.0, g=1.0, rise=True):
    n = int(d * SR); t = np.arange(n) / SR
    x = lp(noise(n), 700) * 1.6 + hp(noise(n), 2500) * 0.2 + 0.35 * np.sin(2 * np.pi * (70 + 40 * t / d) * t)
    shape = np.linspace(0.3, 1, n) if rise else np.ones(n)
    return x * shape * env(n, 0.3, min(1.0, d * 0.4)) * g


def flyby(d=2.4, g=1.0):
    """doppler: whine falls in pitch while loudness peaks mid-way"""
    n = int(d * SR); t = np.arange(n) / SR; c = d * 0.45
    f = 900 * (1 + 0.25 * np.tanh((c - t) * 3))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    roar = lp(noise(n), 1600) + hp(noise(n), 3000) * 0.3
    amp = 1 / (1 + ((t - c) * 2.2) ** 2)
    return (tone + roar) * amp * env(n, 0.05, 0.6) * g


def spool(d=1.4, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    f = 250 + 1700 * (t / d) ** 1.3
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + lp(noise(n), 1300) * np.linspace(0.2, 1.3, n)
    return x * env(n, 0.5, 0.2) * g


def clunk(g=1.0, pitch=1.0):
    n = int(1.0 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 65 * pitch * t) * np.exp(-t * 11) * 1.3
    x += sum(np.sin(2 * np.pi * f * pitch * t) * np.exp(-t * k) for f, k in [(480, 9), (760, 12), (1230, 16)]) * 0.22
    x += hp(noise(n), 2500) * np.exp(-t * 60) * 0.7
    return x * g


def creak(d=1.4, g=1.0):
    """cable tension: rising metallic groan"""
    n = int(d * SR); t = np.arange(n) / SR
    f = 120 + 260 * (t / d)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3
    x = bp(x, 200, 2200) + bp(noise(n), 1800, 4000) * 0.15 * (1 + np.sin(2 * np.pi * 23 * t))
    return x * env(n, 0.15, 0.5) * g


def chirp(g=1.0):
    n = int(0.35 * SR); t = np.arange(n) / SR
    return (bp(noise(n), 1500, 4200) * np.exp(-t * 14) + np.sin(2 * np.pi * 55 * t) * np.exp(-t * 18)) * g


def crackle(d=1.2, g=1.0):
    n = int(d * SR); x = np.zeros(n)
    for _ in range(int(d * 90)):
        i = rng.integers(0, n - 400); x[i:i + 400] += hp(noise(400), 3000) * np.exp(-np.arange(400) / 60) * rng.uniform(0.3, 1)
    return x * env(n, 0.02, 0.3) * g


def hiss(d=1.2, g=1.0, rise=True):
    n = int(d * SR)
    return hp(noise(n), 2500) * (np.linspace(0.2, 1, n) if rise else 1) * env(n, 0.1, 0.25) * g


def steam_burst(g=1.0):
    n = int(1.6 * SR); t = np.arange(n) / SR
    return (hp(noise(n), 1200) * np.exp(-t * 2.5) + np.sin(2 * np.pi * 48 * t) * np.exp(-t * 7)) * g


def servo(d=0.6, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (220 + 160 * t / d) * t) * 0.3 + bp(noise(n), 300, 900) * 0.4) * env(n, 0.05, 0.15) * g


def splash(g=1.0):
    n = int(1.8 * SR); t = np.arange(n) / SR
    return (lp(noise(n), 2600) * np.exp(-t * 2.6) + np.sin(2 * np.pi * 52 * t) * np.exp(-t * 5)) * g


def impact(g=1.0):
    """cinematic hit: sub drop + body + air"""
    n = int(2.6 * SR); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (34 + 80 * np.exp(-t * 6)) * t) * np.exp(-t * 1.6)
    body = lp(noise(n), 400) * np.exp(-t * 7) * 0.7
    air = hp(noise(n), 3000) * np.exp(-t * 18) * 0.35
    return (sub + body + air) * g


def thump(g=1.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (50 + 60 * np.exp(-t * 20)) * t) * np.exp(-t * 9) + lp(noise(n), 900) * np.exp(-t * 30) * 0.4) * g


def ratchet(g=1.0, k=3):
    out = np.zeros(int(0.5 * SR))
    for i in range(k):
        n = int(0.05 * SR); tt = np.arange(n) / SR
        c = (np.sin(2 * np.pi * 2400 * tt) * 0.5 + hp(noise(n), 4000)) * np.exp(-tt * 140)
        out[int(i * 0.11 * SR):int(i * 0.11 * SR) + n] += c
    return out * g


def ring(d=1.5, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2093 * t) + 0.5 * np.sin(2 * np.pi * 3136 * t)) * np.exp(-t * 2.2) * 0.2 * g


m2f = lambda m: 440 * 2 ** ((m - 69) / 12)


def strings(chord, d, g=1.0, open_lp=(500, 4000)):
    n = int(d * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for m in chord:
        for det in (-0.12, 0, 0.11):
            f = m2f(m) * 2 ** (det / 12)
            ph = rng.uniform(0, 2 * np.pi)
            x += 2 * ((f * t + ph / (2 * np.pi)) % 1) - 1  # saw
    x /= len(chord) * 3
    out = np.zeros(n); cut = np.linspace(open_lp[0], open_lp[1], n)
    for i in range(0, n, 2048):
        out[i:i + 2048] = lp(x[i:i + 2048], cut[i])
    vib = 1 + 0.03 * np.sin(2 * np.pi * 5 * t)
    return out * vib * env(n, d * 0.5, 0.8, 1.5) * g


def timpani(g=1.0, m=38):
    n = int(2.5 * SR); t = np.arange(n) / SR
    f = m2f(m)
    return (np.sin(2 * np.pi * f * t * (1 + 0.04 * np.exp(-t * 8))) * np.exp(-t * 2.2) + lp(noise(n), 300) * np.exp(-t * 14) * 0.5) * g


# ---------------- layers ----------------
sfx, amb, mus = Bus(), Bus(), Bus()

# ambience: ocean + wind, decorrelated L/R
for ch in (0, 1):
    x = lp(noise(N), 500) * 0.6 + bp(noise(N), 900, 3500) * 0.12
    swell = 0.7 + 0.3 * np.sin(2 * np.pi * np.arange(N) / SR / 7.0 + ch)
    (amb.L if ch == 0 else amb.R)[:] += x * swell
amb_gain = np.ones(N)

t0 = 0.0
FZ = (round(SC["cold"]["end"] * FPS) - 30) / FPS  # freeze-frame (matches Cold in scenes2.tsx)
# --- cold open
sfx.add(rumble(FZ + 0.1, 0.9), 0.0)
sfx.add(hp(whoosh(1.0, 600, 4000), 400), 0.0, 0.7, pan=-0.4)
sfx.add(whoosh(1.0, 1800, 300, 0.9), 0.85, pan=0.3)
sfx.add(flyby(2.6, 0.7), FZ - 1.6, pan=0.2)
sfx.add(impact(1.3), FZ)
sfx.add(ring(1.8, 0.6), FZ + 0.05)
silence = (FZ + 0.15, S0("hook") - 0.05)  # strategic silence after the freeze

# --- hook
h = S0("hook")
sfx.add(whoosh(0.7, 400, 2600, 0.6), h - 0.4)
sfx.add(thump(0.8), W(2, 6) - 2 / FPS)
sfx.add(spool(1.0, 0.4), W(3, 7) - 0.9)
sfx.add(rumble(2.2, 0.55), W(3, 7) - 0.2)
sfx.add(flyby(2.2, 0.6), W(3, 7) + 0.1, pan=0.4)
sfx.add(rumble(2.0, 0.35), W(3, 12) - 1.0)

# --- imagine
im = S0("imagine")
sfx.add(whoosh(0.7, 400, 2600, 0.6), im - 0.4)
sfx.add(spool(Le(5) - Ls(5) + 0.4, 0.18), Ls(5) - 0.1)
sfx.add(spool(1.2, 0.5), W(6, 3) - 1.1)
sfx.add(rumble(2.6, 0.8), W(6, 3) - 0.15)
sfx.add(flyby(2.6, 0.9), W(6, 3) + 0.2, pan=-0.5)
sfx.add(whoosh(0.8, 300, 3000, 0.6), S0("runway") - 0.5)

# --- runway + humour
r = S0("runway")
sfx.add(rumble(Ls(9) - r, 0.55), r + 4 / FPS)
sfx.add(whoosh(1.4, 500, 2200, 0.35), Ls(9) - 1.6)
sfx.add(whoosh(0.35, 2500, 600, 0.9), W(9, 3) - 0.05)
sfx.add(ratchet(0.6, 3), W(9, 5) - 0.02)
sfx.add(thump(0.5), W(9, 5))
sfx.add(whoosh(0.6, 400, 3500, 0.7), Ls(10) - 0.12)
sfx.add(thump(0.8), W(10, 5) - 2 / FPS)

# --- ski-jump
sk = S0("skijump")
sfx.add(spool(1.5, 0.7), W(11, 3) - 0.9)
sfx.add(rumble(W(13, 1) - W(11, 3) + 0.4, 0.55, rise=False), W(11, 3) + 0.4)
sfx.add(clunk(0.8), Ls(12) - 0.05)
sfx.add(creak(1.2, 0.35), Ls(12) + 0.2)
sfx.add(clunk(0.7, 1.3), W(12, 4))
rel = W(13, 1) + 6 / FPS
sfx.add(clunk(0.9, 0.8), rel - 0.1)
sfx.add(rumble(3.0, 0.95), rel - 0.05)
sfx.add(flyby(2.6, 0.9), rel + 0.4, pan=-0.6)
sfx.add(whoosh(1.4, 300, 3800, 0.6), W(14, 3) - 0.5)

# --- catapult cutaway (generic carrier) + match cut
c = S0("catapult")
sfx.add(servo(0.6, 0.6), c + 2 / FPS)
sfx.add(hiss(W(16, 6) - Ls(16) + 0.3, 0.55), Ls(16) - 0.1)
crel = W(16, 7)
sfx.add(clunk(1.0, 0.7), crel)
sfx.add(whoosh(1.0, 300, 4000, 0.9), crel)
sfx.add(rumble(2.0, 0.7), crel)
sfx.add(steam_burst(0.9), crel + 0.9)
sfx.add(thump(0.9), crel + 0.9)
cut = Ls(17) - 3 / FPS
sfx.add(whoosh(0.4, 3000, 500, 0.5), cut - 0.15)
sfx.add(rumble(2.0, 0.6), cut + 16 / FPS)
sfx.add(flyby(2.0, 0.6), cut + 0.9, pan=0.4)

# --- landing
la = S0("landing")
sfx.add(whoosh(0.7, 400, 2600, 0.5), la - 0.4)
c1 = Ls(19) - 3 / FPS
for ch, pan in ((0, -0.3), (1, 0.3)):
    sfx.add(hp(noise(int((c1 - la) * SR)), 600) * env(int((c1 - la) * SR), 0.3, 0.2) * 0.25, la, pan=pan)
sfx.add(rumble(c1 - la, 0.35, rise=False), la)
sfx.add(clunk(0.6, 1.4), W(19, 4))
sfx.add(rumble(2.0, 0.3), Ls(20))
sfx.add(servo(0.4, 0.25), W(21, 4))
catchT = W(22, 4)
sfx.add(rumble(1.6, 0.6), Ls(22) - 0.6)
sfx.add(crackle(0.5, 0.4), catchT - 0.35)
sfx.add(clunk(1.2, 0.9), catchT)
sfx.add(impact(0.6), catchT)
sfx.add(creak(2.0, 0.6), catchT + 0.05)
sfx.add(rumble(2.0, 0.45, rise=False), catchT + 0.1)

# --- twist
tw = S0("twist")
sfx.add(whoosh(0.7, 400, 2600, 0.5), tw - 0.4)
sfx.add(rumble(Ls(25) - tw + 0.5, 0.5), tw)
sfx.add(chirp(0.9), W(25, 4))
sfx.add(thump(0.9), W(25, 4))
sfx.add(spool(1.0, 0.8), W(26, 4) - 0.7)
sfx.add(rumble(Ls(29) - W(26, 4) + 0.5, 0.7, rise=False), W(26, 4) + 0.2)
sfx.add(crackle(Le(28) - Ls(28) + 0.2, 0.5), Ls(28))
for k in range(3):
    sfx.add(clunk(0.35, 1.8 + k * 0.2), W(28, 6) + k * 0.25)
sfx.add(rumble(2.8, 0.9), Ls(29) - 0.1)
sfx.add(flyby(2.6, 0.8), Ls(29) + 0.3, pan=-0.5)
sfx.add(whoosh(1.0, 2200, 300, 0.4), Ls(30) - 0.1)
sfx.add(splash(0.9), Ls(30) - 3 / FPS + 0.85)

# --- backup
b = S0("backup")
sfx.add(whoosh(0.6, 400, 2600, 0.5), b - 0.35)
sfx.add(rumble(SC["backup"]["end"] - b, 0.55, rise=False), b)
sfx.add(creak(1.8, 0.35), b + 0.3)
sfx.add(impact(0.9), W(32, 2) - 2 / FPS)

# --- finale
fi = S0("finale")
fcatch = W(34, 4)
sfx.add(rumble(fcatch - fi + 0.6, 0.5), fi)
sfx.add(clunk(1.0, 0.9), fcatch)
sfx.add(creak(1.4, 0.4), fcatch + 0.05)
sfx.add(whoosh(2.2, 300, 1800, 0.5), Ls(35) - 0.2)
sfx.add(thump(0.6), Ls(36) - 3 / FPS)

# ---------------- music ----------------
bpm = 92; beat = 60 / bpm; bar = beat * 4
chords = [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 61]]  # Dm Bb C A
mstart, mend = S0("hook"), Ls(35)
k = 0
while mstart + k * bar < mend + bar:
    tt = mstart + k * bar
    pad = strings(chords[k % 4], bar * 2, 0.5, (350, 900))
    mus.add(pad, tt)
    kick = np.sin(2 * np.pi * (48 + 70 * np.exp(-np.arange(int(0.25 * SR)) / SR * 30)) * np.arange(int(0.25 * SR)) / SR) * np.exp(-np.arange(int(0.25 * SR)) / SR * 14)
    for bb in range(4):
        mus.add(kick, tt + bb * beat, 0.55)
        n = int(beat / 4 * SR); at = np.arange(n) / SR
        for s16 in range(4):
            m = chords[k % 4][(bb * 4 + s16) % 4] + 12
            mus.add(np.sin(2 * np.pi * m2f(m) * at) * np.exp(-at * 20) * 0.10, tt + bb * beat + s16 * beat / 4, pan=0.3 if s16 % 2 else -0.3)
    k += 1
# final orchestral rise: Ls(35) -> hit on the closing line
rise0, hit = Ls(35) - 0.3, W(37, 0) - 0.05
mus.add(strings([50, 57, 62, 66, 69], hit - rise0 + 0.2, 1.0, (300, 3500)), rise0)
mus.add(strings([38, 45, 50], hit - rise0 + 0.2, 0.8, (200, 1200)), rise0)
for i, tt in enumerate(np.linspace(rise0 + 1.0, hit - 0.25, 6)):
    mus.add(timpani(0.25 + 0.08 * i, 38), tt)
mus.add(timpani(1.2, 38), hit)
mus.add(impact(0.8), hit)
mus.add(strings([50, 57, 62, 66, 69, 74], T_END - hit, 1.2, (2500, 1200)), hit)
mus.add(strings([38, 45, 50], T_END - hit, 0.9, (900, 500)), hit)

# ---------------- mix ----------------
t = np.arange(N) / SR
vmono = voice if voice.ndim == 1 else voice.mean(1)
venv = np.sqrt(np.maximum(lp(vmono ** 2, 6), 0))
vk = np.clip(venv / (venv.max() * 0.22), 0, 1)
duck_music = lp(1 - 0.6 * vk, 4)
duck_sfx = lp(1 - 0.35 * vk, 6)
duck_amb = lp(1 - 0.4 * vk, 4)

# strategic silence (after the freeze) + quick dip before the humour punch
gate = np.ones(N)
a, bnd = int(silence[0] * SR), int(silence[1] * SR)
gate[a:bnd] = 0.0
gate = lp(gate, 30)
dip = 1 - 0.85 * np.exp(-((t - (W(9, 3) + 0.35)) / 0.25) ** 2)

music_shape = np.interp(t, [0, mstart - 0.1, mstart + 0.8, Ls(35) - 0.5, Ls(35) + 1.5, T_END], [0, 0, 1, 1, 0.9, 0.9])


def norm(x, peak):
    return x / (np.abs(x).max() + 1e-9) * peak


sfxL, sfxR = norm(lp(sfx.L, 10000), 0.42), norm(lp(sfx.R, 10000), 0.42)
mL, mR = norm(mus.L, 0.2), norm(mus.R, 0.2)
aL, aR = norm(amb.L, 0.05), norm(amb.R, 0.05)
amb_shape = np.interp(t, [0, 3, S0("imagine"), S0("imagine") + 1, S0("runway"), T_END], [0.8, 0.8, 0.8, 1.6, 1.0, 1.0])

L_ = vmono * 0.92 + (sfxL * duck_sfx + mL * duck_music * music_shape * dip + aL * duck_amb * amb_shape) * gate
R_ = vmono * 0.92 + (sfxR * duck_sfx + mR * duck_music * music_shape * dip + aR * duck_amb * amb_shape) * gate
st = np.stack([L_, R_], 1)
st = np.tanh(st * 1.05) / np.tanh(1.05)
st = st / np.abs(st).max() * 0.95
sf.write(os.path.join(PUB, f"mix_{VER}.wav"), st.astype(np.float32), SR)
print(f"mix_{VER} written", round(N / SR, 2), "s")
