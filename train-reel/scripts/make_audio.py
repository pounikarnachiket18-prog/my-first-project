"""Synthesises the whole soundtrack (music bed, chimes, train sounds, SFX and
robot-voice "clips") from scratch, synced to src/timeline.json.

Run:  python3 scripts/make_audio.py   ->  public/soundtrack.wav
"""
import json
import os
import wave

import numpy as np
from scipy.signal import butter, lfilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "timeline.json")))
FPS = T["fps"]
SR = 44100
N = int(T["total"] / FPS * SR) + SR
rng = np.random.default_rng(7)
SC = {s["id"]: s["from"] for s in T["scenes"]}

music = np.zeros(N)
sfx = np.zeros(N)
voice = np.zeros(N)


def g(scene, local):
    """global frame -> sample index"""
    return int((SC[scene] + local) / FPS * SR)


def add(buf, at, sig, gain=1.0):
    if at >= N:
        return
    if at < 0:
        sig = sig[-at:]
        at = 0
    end = min(N, at + len(sig))
    buf[at:end] += sig[: end - at] * gain


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def lp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = butter(order, f / (SR / 2), "high")
    return lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return lfilter(b, a, x)


def env(n, a=0.005, r=0.1):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


# ---------------------------------------------------------------- instruments
def bell(freq, dur=1.6):
    t = tt(dur)
    s = (np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t * 3)
         + 0.25 * np.sin(2 * np.pi * freq * 3.98 * t) * np.exp(-t * 6))
    return s * np.exp(-t * 2.2) * env(len(t), 0.003, 0.05)


def chime(at):
    for i, f in enumerate([659.25, 523.25, 783.99]):  # E5 C5 G5 - generic three-note chime
        add(sfx, at + int(i * 0.42 * SR), bell(f), 0.35)


def clack(intensity=1.0):
    t = tt(0.07)
    thump = np.sin(2 * np.pi * 110 * t) * np.exp(-t * 60)
    click = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 200)
    one = thump * 0.8 + click * 0.6
    out = np.zeros(int(0.17 * SR))
    out[: len(one)] += one
    out[int(0.09 * SR): int(0.09 * SR) + len(one)] += one * 0.8
    return out * intensity


def rumble(dur):
    n = int(dur * SR)
    br = np.cumsum(rng.standard_normal(n))
    br = hp(br, 20)
    br = lp(br, 160)
    return br / (np.abs(br).max() + 1e-9)


def train_pass(scene, positions_fn, f0, f1, gain_fn):
    """positions_fn(frame)->px travelled. Add rumble shaped by speed + clacks every 140px."""
    frames = np.arange(f0, f1)
    pos = np.array([positions_fn(f) for f in frames])
    speed = np.abs(np.gradient(pos))
    sp_s = np.interp(np.arange((f1 - f0) * SR // FPS) / SR * FPS, np.arange(len(speed)), speed)
    r = rumble(len(sp_s) / SR) * np.clip(sp_s / 30, 0, 1) ** 0.7
    gains = np.array([gain_fn(f) for f in frames])
    gs = np.interp(np.arange(len(r)) / SR * FPS, np.arange(len(gains)), gains)
    add(sfx, g(scene, f0), r * gs, 0.55)
    nxt = 140
    for k, f in enumerate(frames):
        if pos[k] - pos[0] >= nxt:
            nxt += 140
            add(sfx, g(scene, f), clack(min(1, speed[k] / 25 + 0.3)), 0.35 * gain_fn(f))


def whoosh(dur=0.5, up=True):
    t = tt(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(n)
    steps = 16
    seg = len(t) // steps
    for i in range(steps):
        fr = (i / steps) if up else 1 - i / steps
        c = 300 + 3500 * fr
        piece = bp(n, c * 0.7, min(c * 1.4, 20000))[i * seg:(i + 1) * seg]
        out[i * seg:(i + 1) * seg] = piece
    return out * np.sin(np.pi * np.linspace(0, 1, len(t))) ** 2


def pop(freq=900, dur=0.08):
    t = tt(dur)
    f = freq * (1 + 1.5 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40)


def tick():
    t = tt(0.03)
    return hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 250)


def boom():
    t = tt(1.2)
    f = 55 + 80 * np.exp(-t * 8)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5)
    s += lp(rng.standard_normal(len(t)), 800) * np.exp(-t * 12) * 0.5
    return s


def flap():
    t = tt(0.06)
    return bp(rng.standard_normal(len(t)), 800, 4000) * np.exp(-t * 90)


def horn(dur=1.1):
    t = tt(dur)
    s = np.zeros_like(t)
    for f in (311.1, 392.0, 466.2):
        ph = 2 * np.pi * f * t
        s += np.sign(np.sin(ph)) * 0.3 + np.sin(ph)
    return lp(s, 1600) * env(len(t), 0.06, 0.35) * 0.25


def error_beep():
    t = tt(0.12)
    return np.sign(np.sin(2 * np.pi * 220 * t)) * env(len(t), 0.003, 0.04) * 0.4


# ------------------------------------------------------------ robot "voice"
VOWELS = [(800, 1200, 2500), (300, 2300, 3000), (350, 800, 2400), (450, 2000, 2600), (500, 900, 2500)]


def syllable(dur, f0, vowel, glide):
    t = tt(dur)
    f = f0 * (1 + glide * t / max(dur, 1e-3))
    ph = np.cumsum(f) / SR
    src = 2 * (ph % 1) - 1  # sawtooth glottal source
    out = np.zeros_like(src)
    for k, fm in enumerate(vowel):
        out += bp(src, fm * 0.85, fm * 1.15) * (1.0, 0.6, 0.3)[k]
    burst = hp(rng.standard_normal(int(0.012 * SR)), 2500) * 0.3
    out[: len(burst)] += burst
    return out * env(len(t), 0.008, min(0.04, dur / 3))


def clip(n_frames, syl, seed):
    """One pre-recorded 'clip' = a few syllables, each clip with its OWN pitch."""
    r = np.random.default_rng(seed)
    dur = n_frames / FPS
    base = 170 + r.random() * 90
    sd = dur / syl
    out = np.zeros(int(dur * SR) + 10)
    for k in range(syl):
        s = syllable(sd * 0.92, base * (1 + 0.12 * np.sin(k * 1.7)), VOWELS[r.integers(len(VOWELS))], r.uniform(-0.15, 0.1))
        add_at = int(k * sd * SR)
        out[add_at: add_at + len(s)] += s[: len(out) - add_at]
    return out / (np.abs(out).max() + 1e-9)


# ------------------------------------------------------------------ music bed
def music_bed():
    bpm = 100
    beat = 60 / bpm
    prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]
    m = lambda n: 440 * 2 ** ((n - 69) / 12)
    bar = beat * 4
    t_total = N / SR
    i = 0
    while i * bar < t_total:
        root, chord = prog[i % 4]
        at = int(i * bar * SR)
        t = tt(bar + 0.3)
        pad = np.zeros_like(t)
        for n in chord:
            for det in (-0.08, 0.08):
                f = m(n + 12) * (1 + det / 100)
                pad += 2 * ((f * t) % 1) - 1
        pad = lp(pad, 900) * env(len(t), 0.4, 0.4) * 0.05
        add(music, at, pad)
        for b in range(4):  # bass pluck + offbeat tick
            bt = tt(beat * 0.9)
            bass = np.sin(2 * np.pi * m(root - 12) * bt) * np.exp(-bt * 5) * 0.32
            add(music, at + int(b * beat * SR), bass)
            add(music, at + int((b + 0.5) * beat * SR), tick(), 0.12)
            if b % 2 == 0:  # soft kick
                kt = tt(0.25)
                kf = 50 + 90 * np.exp(-kt * 30)
                add(music, at + int(b * beat * SR), np.sin(2 * np.pi * np.cumsum(kf) / SR) * np.exp(-kt * 14), 0.35)
        # little arpeggio sparkle
        for k, n in enumerate(chord + [chord[1] + 12]):
            at2 = at + int((k * 2 + 1) * beat / 2 * SR)
            add(music, at2, pop(m(n + 24), 0.25), 0.05)
        i += 1


music_bed()

# ducking envelope for music (in frames, global)
duck = np.ones(N)


def duck_range(f0, f1, level, fade=6):
    a, b = int(f0 / FPS * SR), int(f1 / FPS * SR)
    fd = int(fade / FPS * SR)
    curve = np.ones(N)
    curve[a:b] = level
    curve[max(0, a - fd):a] = np.linspace(1, level, a - max(0, a - fd))
    curve[b:b + fd] = np.linspace(level, 1, len(curve[b:b + fd]))
    np.minimum(duck, curve, out=duck)


H = T["hook"]
duck_range(0, 80, 0.35)  # chime + train arrival
duck_range(SC["pauses"], SC["pauses"] + 124, 0.0)  # real silence for the pauses demo
st = T["stitch"]
sched = []
tcur = SC["stitch"] + st["playStart"]
for b in st["blocks"]:
    sched.append((tcur, b))
    tcur += b["play"] + st["gap"]
duck_range(SC["stitch"] + st["playStart"] - 4, tcur + 4, 0.08)
duck_range(SC["outro"] + T["outro"]["depart"] - 4, SC["outro"] + T["outro"]["depart"] + 40, 0.5)

# ------------------------------------------------------------------- events
# Hook
chime(g("hook", H["chime"]))
add(voice, g("hook", 44), clip(30, 9, 11), 0.45)
f0h, f1h = H["trainIn"]
from math import pow
Wtr = (5 * 414 + 470) * 0.55
startX, endX = -Wtr - 300, 1050 - Wtr


def hook_pos(f):
    t = min(1, max(0, (f - f0h) / (f1h - f0h)))
    return (endX - startX) * (1 - pow(1 - t, 3))


train_pass("hook", hook_pos, 0, 90, lambda f: 1.0 if f < 70 else max(0, 1 - (f - 70) / 20))
sq = tt(0.9)
squeal = np.sin(2 * np.pi * (2900 + 60 * np.sin(2 * np.pi * 7 * sq)) * sq) * env(len(sq), 0.2, 0.4)
add(sfx, g("hook", 54), squeal, 0.04)
for w in H["words"]:
    add(sfx, g("hook", w), pop(700), 0.35)

# Title: steady passing train + slam
train_pass("title", lambda f: f * 16, 0, 120, lambda f: 0.55)
TI = T["title"]
add(sfx, g("title", TI["l3"]), boom(), 0.5)

# Pauses: phrase clip + digit clips, separated by silence
P = T["pauses"]
add(voice, g("pauses", P["label"]), clip(18, 5, 21), 0.6)
for i, d in enumerate(P["digits"]):
    add(voice, g("pauses", d), clip(6, 1, 30 + i), 0.6)
add(sfx, g("pauses", P["brackets"]), whoosh(0.35), 0.25)

# Reveal
R = T["reveal"]
add(sfx, g("reveal", R["slash"]), whoosh(0.25, False), 0.35)
add(sfx, g("reveal", R["slash"] + 6), error_beep(), 0.5)
add(sfx, g("reveal", R["computer"]), pop(500, 0.15), 0.4)
for i in range(19):
    add(sfx, g("reveal", R["tilesStart"] + i * R["tileStep"]), pop(900 + i * 40, 0.05), 0.12)

# Studio
SD = T["studio"]
for k in range(4):
    bt = tt(0.08)
    add(sfx, g("studio", SD["reel"] + 10 + k * 8), np.sin(2 * np.pi * 1000 * bt) * env(len(bt), 0.003, 0.02), 0.12)
add(voice, g("studio", 24), clip(40, 12, 77), 0.3)  # the "studio recording" in one smooth take
for k in range(5):
    add(sfx, g("studio", SD["cut"] + k * 2), tick(), 0.6)
add(sfx, g("studio", SD["clips"]), whoosh(0.6, False), 0.3)

# Data
D = T["data"]
for s_ in D["slots"]:
    add(sfx, g("data", s_), whoosh(0.3), 0.25)
    add(sfx, g("data", s_ + 16), pop(1100, 0.06), 0.35)

# Stitch: blocks landing, then the stitched playback with REAL gaps
for i in range(len(st["blocks"])):
    add(sfx, g("stitch", st["blocksStart"] + i * st["blockStep"] + 6), pop(600 + i * 50, 0.07), 0.3)
for k, (fr, b) in enumerate(sched):
    add(voice, int(fr / FPS * SR), clip(b["play"], b["syl"], 100 + k), 0.6)

# Math
M = T["math"]
for l in M["lines"]:
    add(sfx, g("math", l), whoosh(0.25), 0.18)
c0, c1 = M["counter"]
for f in range(c0, c1, 2):
    add(sfx, g("math", f), tick(), 0.35)
add(sfx, g("math", c1), boom(), 0.7)
add(sfx, g("math", M["vs"]), whoosh(0.4), 0.2)
add(sfx, g("math", M["vs"] + 30), flap(), 0.5)

# Digits
DG = T["digits"]
add(sfx, g("digits", DG["strike"]), whoosh(0.2, False), 0.3)
add(sfx, g("digits", DG["good"] + 4), pop(1200, 0.1), 0.35)
for i in range(10):
    add(sfx, g("digits", DG["r1"] + 8 + i * 3), pop(800 + i * 60, 0.05), 0.15)
for i, dgt in enumerate("12951"):
    add(voice, g("digits", DG["r2"] + 10 + i * 8), clip(5, 1, 200 + i), 0.35)

# Pitch: smooth phrase then choppy stitched phrase with error blips at joints
PI = T["pitch"]
add(voice, g("pitch", PI["draw"]), clip(36, 10, 301), 0.35)
for k, n in enumerate([10, 4, 4, 7, 6]):
    add(voice, g("pitch", PI["draw"] + 40 + k * 8), clip(6, 1 if n < 5 else 2, 310 + k), 0.35)
for k in range(4):
    add(sfx, g("pitch", PI["joints"] + k * 3), error_beep(), 0.25)

# Lang
for c in T["lang"]["cards"]:
    for k in range(3):
        add(sfx, g("lang", c + k), flap(), 0.45)
    add(voice, g("lang", c + 3), clip(9, 3, 400 + c), 0.25)

# Stations
for k in range(18):
    add(sfx, g("stations", T["stations"]["dots"] + k * 3), pop(1400 + (k % 5) * 120, 0.04), 0.08)

# Pros
for it in T["pros"]["items"]:
    add(sfx, g("pros", it), whoosh(0.3), 0.18)
    add(sfx, g("pros", it + 8), pop(1300, 0.08), 0.3)

# Outro
O = T["outro"]
add(sfx, g("outro", O["depart"] - 2), horn(), 0.9)
dep = O["depart"]
train_pass("outro", lambda f: 0.09 * max(0, f - dep) ** 2, dep, 180, lambda f: max(0.0, 0.9 - max(0, f - 120) / 70))
for w in O["words"][2:]:
    add(sfx, g("outro", w), pop(700), 0.3)
chime(g("outro", O["chime"]))

# scene-transition whooshes
for s in T["scenes"][1:]:
    add(sfx, int((s["from"] - 6) / FPS * SR), whoosh(0.45), 0.12)

# ------------------------------------------------------------------- mixdown
mix = music * duck * 0.9 + sfx + voice * 0.9
fade = int(1.0 * SR)
end = int(T["total"] / FPS * SR)
mix = mix[:end]
mix[-fade:] *= np.linspace(1, 0, fade)
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix /= np.abs(mix).max() / 0.89
stereo = np.stack([mix, mix], axis=1)
out = os.path.join(ROOT, "public", "soundtrack.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print("wrote", out, f"{len(mix) / SR:.1f}s")
