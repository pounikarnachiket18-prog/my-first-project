"""Synthesises the jammer reel soundtrack (music bed + SFX) synced to src/jammer/timeline.json.

Run:  python3 scripts/jammer_audio.py   ->  public/jammer-audio.wav
"""
import json
import os
import wave

import numpy as np
from scipy.signal import butter, lfilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "jammer", "timeline.json")))
FPS = T["fps"]
SR = 44100
N = int(T["total"] / FPS * SR) + SR
rng = np.random.default_rng(11)
SC = {s["id"]: s["from"] for s in T["shots"]}
music = np.zeros(N)
sfx = np.zeros(N)


def g(shot, local):
    return int((SC[shot] + local) / FPS * SR)


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


def lp(x, f, o=2):
    b, a = butter(o, f / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x, f, o=2):
    b, a = butter(o, f / (SR / 2), "high")
    return lfilter(b, a, x)


def bp(x, lo, hi, o=2):
    b, a = butter(o, [lo / (SR / 2), hi / (SR / 2)], "band")
    return lfilter(b, a, x)


def env(n, a=0.005, r=0.1):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def tick():
    t = tt(0.03)
    return hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 250)


def pop(freq=900, dur=0.08):
    t = tt(dur)
    f = freq * (1 + 1.5 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40)


def bell(freq, dur=1.2):
    t = tt(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t * 4)
    return s * np.exp(-t * 3) * env(len(t), 0.003, 0.05)


def whoosh(dur=0.45, up=True):
    t = tt(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(n)
    steps = 14
    seg = len(t) // steps
    for i in range(steps):
        fr = (i / steps) if up else 1 - i / steps
        c = 300 + 3500 * fr
        out[i * seg:(i + 1) * seg] = bp(n, c * 0.7, min(c * 1.4, 20000))[i * seg:(i + 1) * seg]
    return out * np.sin(np.pi * np.linspace(0, 1, len(t))) ** 2


def boom():
    t = tt(1.1)
    f = 55 + 80 * np.exp(-t * 8)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5) + lp(rng.standard_normal(len(t)), 700) * np.exp(-t * 12) * 0.5


def err_buzz(dur=0.35):
    t = tt(dur)
    s = np.sign(np.sin(2 * np.pi * 180 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 186 * t)) * 0.5
    return lp(s, 2500) * env(len(t), 0.004, 0.06)


def ping(freq=1400):
    t = tt(0.5)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 9) * env(len(t), 0.002, 0.05)


def chirp(f0, f1, dur=0.18):
    t = tt(dur)
    f = np.linspace(f0, f1, len(t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.005, 0.04)


def static(dur, level_fn):
    """Radio static: band-passed noise + random crackles, shaped by level_fn(seconds)."""
    t = tt(dur)
    n = bp(rng.standard_normal(len(t)), 900, 6500) * 0.6
    crack = (rng.random(len(t)) > 0.9994) * rng.standard_normal(len(t)) * 6
    n += lp(crack, 5000)
    wob = 0.75 + 0.25 * np.sin(2 * np.pi * 7 * t) * np.sin(2 * np.pi * 0.7 * t)
    lv = np.array([level_fn(x) for x in t[:: SR // 100]])
    lv = np.interp(np.arange(len(t)), np.arange(len(lv)) * (SR // 100), lv)
    return n * wob * lv


def stamp():
    t = tt(0.5)
    thud = np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 30)) * t) * np.exp(-t * 14)
    smack = lp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 60)
    return thud + smack * 0.8


# ------------------------------------------------------------------ music bed
def music_bed():
    bpm = 104
    beat = 60 / bpm
    prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]
    m = lambda n: 440 * 2 ** ((n - 69) / 12)
    bar = beat * 4
    i = 0
    while i * bar < N / SR:
        root, chord = prog[i % 4]
        at = int(i * bar * SR)
        t = tt(bar + 0.3)
        pad = np.zeros_like(t)
        for n in chord:
            for det in (-0.08, 0.08):
                f = m(n + 12) * (1 + det / 100)
                pad += 2 * ((f * t) % 1) - 1
        add(music, at, lp(pad, 900) * env(len(t), 0.4, 0.4) * 0.05)
        for b in range(4):
            bt = tt(beat * 0.9)
            add(music, at + int(b * beat * SR), np.sin(2 * np.pi * m(root - 12) * bt) * np.exp(-bt * 5) * 0.32)
            add(music, at + int((b + 0.5) * beat * SR), tick(), 0.12)
            if b % 2 == 0:
                kt = tt(0.25)
                kf = 50 + 90 * np.exp(-kt * 30)
                add(music, at + int(b * beat * SR), np.sin(2 * np.pi * np.cumsum(kf) / SR) * np.exp(-kt * 14), 0.35)
        for k, n in enumerate(chord + [chord[1] + 12]):
            add(music, at + int((k * 2 + 1) * beat / 2 * SR), pop(m(n + 24), 0.25), 0.05)
        i += 1


music_bed()

# ---------------------------------------------------------------------- SFX
J = T
# j1: notification, bars dropping, error
add(sfx, g("j1", 4), bell(1318, 0.8), 0.25)
add(sfx, g("j1", 4) + int(0.12 * SR), bell(1760, 0.8), 0.2)
d0, d1 = J["j1"]["drop"]
for k in range(4):
    add(sfx, g("j1", d0 + k * 3.5), chirp(900 - k * 150, 700 - k * 150, 0.09), 0.25)
add(sfx, g("j1", d1), err_buzz(), 0.5)
add(sfx, g("j1", d1), whoosh(0.3, False), 0.2)
# j2: title boom
add(sfx, g("j2", 0), whoosh(0.5), 0.3)
add(sfx, g("j2", J["j2"]["title"]), boom(), 0.55)
# j3: radio pings tower <-> phone
for k in range(6):
    add(sfx, g("j3", 10 + k * 22), ping(1400 if k % 2 == 0 else 1050), 0.18)
add(sfx, g("j3", J["j3"]["chip"]), pop(1200, 0.1), 0.3)
# j4..j9: jammer static bed
on = SC["j4"] + J["j4"]["on"]
add(sfx, g("j4", J["j4"]["on"]), pop(400, 0.06), 0.6)  # switch click
add(sfx, g("j4", J["j4"]["on"]), whoosh(0.6), 0.3)
dur_static = (T["total"] - on) / FPS


def lvl(sec):
    gf = on + sec * FPS
    off = SC["j10"] + J["j10"]["off"]
    if gf < SC["j5"]:
        return min(1, sec / 0.6) * 0.55
    if gf < SC["j7"]:
        return 0.28
    if gf < SC["j10"]:
        return 0.2
    if gf < SC["j11"]:
        return 0.2 * max(0, 1 - (gf - SC["j10"]) / max(1, off - SC["j10"]))
    if gf < SC["j11"] + 12:
        return 0.16 * (gf - SC["j11"]) / 12
    if gf < SC["j9"]:
        return 0.16
    return 0.14 * max(0, 1 - (gf - SC["j9"]) / 100)


add(sfx, int(on / FPS * SR), static(dur_static, lvl), 0.5)
# j5: wave rows
for r in J["j5"]["rows"]:
    add(sfx, g("j5", r), whoosh(0.3), 0.2)
add(sfx, g("j5", J["j5"]["rows"][2] + 26), err_buzz(0.25), 0.35)
# j6: meter rise + chips
t = tt(0.8)
add(sfx, g("j6", J["j6"]["meter"]), np.sin(2 * np.pi * np.cumsum(np.linspace(300, 900, len(t))) / SR) * env(len(t), 0.02, 0.2), 0.12)
for c in J["j6"]["chips"]:
    add(sfx, g("j6", c), err_buzz(0.15), 0.3)
# j7: dome swell + badges
t = tt(1.6)
add(sfx, g("j7", J["j7"]["dome"]), lp(rng.standard_normal(len(t)), 600) * np.linspace(0, 1, len(t)) ** 2 * env(len(t), 0.01, 0.3), 0.6)
for k in range(3):
    add(sfx, g("j7", J["j7"]["marks"] + k * 5), err_buzz(0.1), 0.2)
for k in range(3):
    add(sfx, g("j7", J["j7"]["marks"] + 18 + k * 5), pop(1500, 0.08), 0.3)
# j10: jammer off, bars climb back, success
add(sfx, g("j10", J["j10"]["off"]), pop(380, 0.06), 0.6)
r0, r1 = J["j10"]["rise"]
for k in range(4):
    add(sfx, g("j10", r0 + k * (r1 - r0) / 4), chirp(600 + k * 180, 800 + k * 180, 0.09), 0.25)
add(sfx, g("j10", r1), bell(1046, 1.0), 0.3)
add(sfx, g("j10", r1) + int(0.1 * SR), bell(1568, 1.0), 0.25)
# j11: use-case cards
for p_ in J["j11"]["pills"]:
    add(sfx, g("j11", p_), whoosh(0.3), 0.2)
    add(sfx, g("j11", p_ + 8), pop(1200, 0.08), 0.3)
# j8: stamp
add(sfx, g("j8", J["j8"]["stamp"]), stamp(), 0.9)
add(sfx, g("j8", J["j8"]["sub"]), pop(900, 0.08), 0.3)
add(sfx, g("j8", J["j8"]["sub"] + 8), pop(1100, 0.08), 0.3)
# j9: outro chime
for k, fq in enumerate([784, 988, 1175]):
    add(sfx, g("j9", J["j9"]["brand"]) + int(k * 0.14 * SR), bell(fq, 1.4), 0.28)
# shot transitions
for s in T["shots"][1:]:
    add(sfx, int((s["from"] - 5) / FPS * SR), whoosh(0.4), 0.1)

# ------------------------------------------------------------------ mixdown
mix = music * 0.85 + sfx
end = int(T["total"] / FPS * SR)
mix = mix[:end]
fade = int(0.8 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= np.abs(mix).max() / 0.89
stereo = np.stack([mix, mix], axis=1)
out = os.path.join(ROOT, "public", "jammer-audio.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print("wrote", out, f"{len(mix) / SR:.1f}s")
