"""Mix narration + synthesized music bed + SFX into public/navy/mix.wav.
All sounds are generated here (no third-party audio)."""
import json, os
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(__file__)
tl = json.load(open(os.path.join(HERE, "..", "src", "navy", "timeline.json")))
voice, SR = sf.read(os.path.join(HERE, "..", "public", "navy", "voice.wav"), dtype="float32")
N = len(voice)
rng = np.random.default_rng(7)
fr = lambda f: round(f) / 30.0
W = lambda i, j: fr(tl["lines"][i]["words"][j]["t0"] * 30)
Ls = lambda i: fr(tl["lines"][i]["t0"] * 30)
scene = {s["id"]: s for s in tl["scenes"]}


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def env(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) if na else 1
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def place(buf, x, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]
    buf[i: i + len(x)] += x * gain


# ---------------- music bed ----------------
bpm = 96
beat = 60 / bpm
music = np.zeros(N)
tt = np.arange(N) / SR
chords = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]]  # Am F C G
m2f = lambda m: 440 * 2 ** ((m - 69) / 12)
bar = beat * 4
pad = np.zeros(N)
for k in range(int(N / SR / bar) + 2):
    c = chords[k % 4]
    n = int(bar * 2 * SR)  # overlapping 2-bar pads
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * m2f(m) * t * d) for m in c for d in (1.0, 1.004)) / 6
    x += 0.5 * np.sin(2 * np.pi * m2f(c[0] - 24) * t)
    place(pad, x * env(n, 1.2, 1.4), k * bar)
music += lp(pad, 1400) * 0.32
# pulse: soft kick on beats, ticks on 8ths, arpeggio on 16ths
kick_n = int(0.25 * SR)
kt = np.arange(kick_n) / SR
kick = np.sin(2 * np.pi * (50 + 70 * np.exp(-kt * 30)) * kt) * np.exp(-kt * 14)
tick_n = int(0.05 * SR)
tick = hp(rng.standard_normal(tick_n), 7000) * np.exp(-np.arange(tick_n) / SR * 90)
arp_n = int(beat / 4 * SR)
at = np.arange(arp_n) / SR
for b in range(int(N / SR / beat) + 1):
    t0 = b * beat
    place(music, kick, t0, 0.55)
    place(music, tick, t0 + beat / 2, 0.06)
    c = chords[int(t0 / bar) % 4]
    for s in range(4):
        m = c[(b * 4 + s) % 3] + 12
        place(music, np.sin(2 * np.pi * m2f(m) * at) * np.exp(-at * 18) * 0.12, t0 + s * beat / 4)
# energy: quieter in intro, lift in twist
hook_end = scene["hook"]["end"]
lift = np.interp(tt, [0, hook_end - 0.3, hook_end + 0.6, scene["twist"]["start"], scene["twist"]["start"] + 1, scene["backup"]["start"], tl["duration"] - 3, tl["duration"]], [0.0, 0.0, 0.8, 0.8, 1.0, 0.85, 0.85, 0.0])
music *= lift
# duck under narration
venv = np.sqrt(np.maximum(lp(voice.astype(np.float64) ** 2, 6), 0))
duck = 1 - 0.55 * np.clip(venv / (venv.max() * 0.25), 0, 1)
music *= lp(duck, 4)
music = music / np.abs(music).max() * 0.16

# ---------------- SFX ----------------
sfx = np.zeros(N)


def whoosh(d=1.6, lo=300, hi=3000, g=1.0):
    n = int(d * SR)
    x = rng.standard_normal(n)
    sweep = np.linspace(0, 1, n)
    out = np.zeros(n)
    seg = 1024
    for i in range(0, n, seg):
        f = lo + (hi - lo) * sweep[i] ** 1.5
        out[i:i + seg] = bp(x[i:i + seg], f * 0.7, min(f * 1.4, SR / 2 - 100))
    return out * env(n, d * 0.55, d * 0.45) * g


def jet(d=2.5, g=1.0):
    n = int(d * SR)
    x = lp(rng.standard_normal(n), 900) * 1.5 + hp(rng.standard_normal(n), 3000) * 0.25
    t = np.arange(n) / SR
    x += 0.4 * np.sin(2 * np.pi * (80 + 40 * t / d) * t)
    return x * env(n, 0.25, d * 0.6) * g


def spool(d=1.6, g=1.0):
    n = int(d * SR)
    t = np.arange(n) / SR
    f = 300 + 1500 * (t / d) ** 1.3
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + lp(rng.standard_normal(n), 1200) * np.linspace(0.3, 1.2, n)
    return x * env(n, 0.6, 0.4) * g


def clunk(g=1.0):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 70 * t) * np.exp(-t * 9) * 1.4
    x += sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(523, 6), (811, 8), (1290, 11)]) * 0.25
    x += hp(rng.standard_normal(n), 2000) * np.exp(-t * 40) * 0.8
    return x * g


def splash(g=1.0):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    return (lp(rng.standard_normal(n), 2500) * np.exp(-t * 3) + np.sin(2 * np.pi * 55 * t) * np.exp(-t * 6)) * g


def boom(g=1.0):
    n = int(1.8 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (40 + 60 * np.exp(-t * 8)) * t) * np.exp(-t * 2.5) + lp(rng.standard_normal(n), 300) * np.exp(-t * 6) * 0.6) * g


def blip(f=1400, g=1.0):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 45) * g


def shimmer(g=1.0):
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * m2f(m) * t) * np.exp(-t * 1.6) for m in (81, 84, 88, 93)) / 4 * env(n, 0.05, 1.2) * g


# scene transitions
for s in tl["scenes"][1:]:
    place(sfx, whoosh(0.7, 400, 2500, 0.35), s["start"] - 0.45)
# launches
launch_times = [W(5, 3) - 2 / 30, W(12, 1) + 4 / 30, Ls(28)]
for t in launch_times:
    place(sfx, jet(2.8, 0.55), t - 0.1)
    place(sfx, whoosh(1.4, 250, 3500, 0.5), t + 0.2)
place(sfx, jet(3.5, 0.3), W(7, 3))  # runway roll
# full power spool-ups
place(sfx, spool(1.4, 0.45), W(10, 3) - 0.6)
place(sfx, jet(2.6, 0.3), W(10, 3) + 0.4)
place(sfx, spool(1.2, 0.45), W(25, 4) - 0.5)
place(sfx, jet(2.4, 0.35), W(25, 4) + 0.4)
# landing approach + catch
place(sfx, jet(3.0, 0.25), Ls(21) - 0.8)
place(sfx, clunk(0.8), W(21, 4))
place(sfx, whoosh(1.8, 900, 200, 0.25), W(21, 4) + 0.05)
# twist: touchdown thump + misses
place(sfx, clunk(0.35), W(24, 4))
for k in range(3):
    place(sfx, blip(900 - k * 120, 0.35), W(27, 6) + k * 0.18)
place(sfx, splash(0.5), Ls(29) - 4 / 30 + 1.0)
# title hit + finale
place(sfx, boom(0.6), W(31, 2) - 2 / 30)
place(sfx, shimmer(0.35), Ls(35) - 0.2)
# label blips
for t in [W(7, 7), Ls(8) + 4 / 30, W(9, 4), W(11, 3), W(18, 4), W(20, 4)]:
    place(sfx, blip(1500, 0.18), t)


# live-action hook clips: their own sound, ducked a little under the narration
import subprocess
hook = np.zeros(N)
t_clip = 0.0
for name in ("hookA", "hookB"):
    path = os.path.join(HERE, "..", "public", "navy", name + ".mp4")
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
    a = np.frombuffer(raw, np.float32).astype(np.float64)
    place(hook, a * env(len(a), 0.02, 0.25), t_clip)
    t_clip += tl["hookClips"][name]
hook *= 1 - 0.45 * np.clip(venv / (venv.max() * 0.25), 0, 1)
hook = hook / (np.abs(hook).max() + 1e-9) * 0.5
place(sfx, boom(0.5), hook_end - 0.05)  # hit on the cut into the animation
sfx = lp(sfx, 9000)
sfx = sfx / (np.abs(sfx).max() + 1e-9) * 0.30

mix = voice.astype(np.float64) * 0.95 + music + sfx + hook
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / np.abs(mix).max() * 0.95
stereo = np.stack([mix, mix], 1).astype(np.float32)
sf.write(os.path.join(HERE, "..", "public", "navy", "mix.wav"), stereo, SR)
print("mix written", len(mix) / SR, "s")
