"""Cheenti Veer reel: Hindi narration (Kokoro TTS, offline), original procedural score,
sound effects and the final mix. Everything is synthesised here; no samples.

Usage: python build_audio.py <kokoro_model_dir>
Writes: build/mix.wav, build/narration.wav and subs.js (subtitle timings for the page).
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
DUR = 20.0
N = int(SR * DUR)
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(HERE, "build")
t = np.arange(N) / SR
rng = np.random.default_rng(11)

# (start, end, voice, [(hindi, english), ...]) — windows match the animation beats
LINES = [
    (0.35, 3.30, "hm_omega", [("दादी की अंगूठी…", "Grandma's ring…"),
                              ("अलमारी के नीचे!", "rolled under the almirah!")]),
    (3.60, 6.20, "hm_omega", [("अर्जुन ने अपना जादुई कड़ा घुमाया…", "Arjun twisted his magic kada…")]),
    (6.60, 9.60, "hm_omega", [("और बन गया…", "and became…"), ("चींटी वीर!", "Cheenti Veer!")]),
    (10.00, 14.30, "hm_omega", [("चींटी की सवारी, धूल के पहाड़…", "An ant ride, mountains of dust…"),
                                ("और वो रही अंगूठी!", "and there's the ring!")]),
    (14.90, 16.90, "hf_beta", [("अरे वाह! जीते रहो बेटा!", "Oh wow! Bless you, child!")]),
    (17.30, 19.70, "hm_omega", [("छोटा कद… बड़ा दिल।", "Small in size… big in heart.")]),
]
GAP = 0.12


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, f1, f2, order=2):
    return signal.sosfilt(signal.butter(order, [f1, f2], "band", fs=SR, output="sos"), x, axis=0)


def env(t0, attack, decay):
    e = np.zeros(N)
    m = t >= t0
    u = t[m] - t0
    e[m] = np.minimum(u / max(attack, 1e-4), 1) * np.exp(-np.maximum(u - attack, 0) / decay)
    return e


def place(buf, x, t0):
    i = int(t0 * SR)
    j = min(len(buf), i + len(x))
    if j > i:
        buf[i:j] += x[: j - i]


def trim(s, thr=0.012):
    idx = np.where(np.abs(s) > thr)[0]
    return s[max(0, idx[0] - 200): idx[-1] + 800] if len(idx) else s


def reverb(x, seconds=1.2, mix=0.15, seed=1, damp=5000):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    tt = np.arange(n) / SR
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], 1) * np.exp(-tt * 6.9 / seconds)[:, None]
    ir = lp(ir, damp)
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True))
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    wet = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - mix) + wet * mix * 1.4


# ----------------------------------------------------------------------------- narration
def narration(model_dir):
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))

    def synth(text, voice, speed):
        s, sr = k.create(text, voice=voice, speed=speed, lang="hi")
        return signal.resample_poly(trim(np.asarray(s, dtype=np.float64)), SR, sr)

    vo = np.zeros(N)
    subs = []
    for li, (t0, t1, voice, chunks) in enumerate(LINES):
        avail, speed = t1 - t0, 1.0
        gaps = GAP * (len(chunks) - 1)
        for _ in range(5):
            parts = [synth(h, voice, speed) for h, _ in chunks]
            total = sum(len(p) for p in parts) / SR + gaps
            if total <= avail or speed >= 1.35:
                break
            speed = min(1.35, speed * (total - gaps) / (avail - gaps) * 1.02)
        cur = t0
        for (h, e), p in zip(chunks, parts):
            if voice == "hf_beta":       # Dadi: a touch older and warmer
                p = lp(p, 6500)
            place(vo, p, cur)
            d = len(p) / SR
            subs.append(dict(start=round(cur, 3), end=round(cur + d + 0.15, 3), hi=h, en=e))
            cur += d + GAP
        print(f"line {li}: speed {speed:.2f}, {total:.2f}s of {avail:.2f}s")
    for a, b in zip(subs, subs[1:]):
        a["end"] = round(min(a["end"], b["start"] - 0.02), 3)
    vo = hp(vo, 90)
    vo = vo + 0.22 * bp(vo, 2500, 5500)
    e = lp(np.abs(signal.hilbert(vo)), 12)
    vo = vo * np.where(e > 0.22, (0.22 / np.maximum(e, 1e-6)) ** 0.5, 1.0)
    vo = vo / (np.abs(vo).max() + 1e-9) * 0.9
    return reverb(vo, 0.5, 0.07, seed=3, damp=6000), subs


# ----------------------------------------------------------------------------- music
def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tone(f, harmonics, decay_h=0.6):
    x = np.zeros(N)
    for h in range(1, harmonics + 1):
        x += np.sin(2 * np.pi * f * h * t + h * 0.7) * decay_h ** (h - 1)
    return x


def music():
    out = np.zeros((N, 2))
    sa = 50  # D3 as Sa
    # tanpura-like drone: Pa, Sa, Sa, low Sa plucked in a cycle, rich harmonics
    drone = np.zeros(N)
    cyc = [sa - 5, sa, sa, sa - 12]
    tt = 0.0
    i = 0
    while tt < DUR:
        f = note(cyc[i % 4])
        e = env(tt, 0.02, 1.6)
        x = sum(np.sin(2 * np.pi * f * h * t + h) * (0.7 ** h) * (1 + 0.3 * np.sin(2 * np.pi * 0.3 * h * t)) for h in range(1, 9))
        drone += x * e
        tt += 0.62
        i += 1
    drone = lp(drone, 3000) * 0.05
    level = np.interp(t, [0, 3, 5.2, 6, 14.5, 17, 20], [1, 1, 0.6, 0.3, 0.8, 0.9, 1])
    out += np.stack([drone, np.roll(drone, 240)], 1) * level[:, None]

    # tabla-like groove: "dha" (low, bending) and "na" (ringing), 100 bpm, from 6.6 s to 14.5 s
    beat = 60 / 100 / 2
    pat = "D.nDn.Dn"
    for k in range(int((14.4 - 6.6) / beat)):
        t0 = 6.6 + k * beat
        c = pat[k % len(pat)]
        if c == "D":
            f = 110 * (1 + 0.6 * np.exp(-np.clip(t - t0, 0, None) * 25))
            x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t0, 0.002, 0.18) * 0.32
            x += bp(rng.standard_normal(N), 300, 1500) * env(t0, 0.001, 0.02) * 0.12
        elif c == "n":
            x = (np.sin(2 * np.pi * 620 * t) + 0.4 * np.sin(2 * np.pi * 1240 * t)) * env(t0, 0.001, 0.12) * 0.14
        else:
            continue
        out[:, 0] += x * 0.9
        out[:, 1] += x

    # bansuri-like melody (sine + breath), a small raga phrase over the ride and the ending
    phrase = [(10.0, 62, .45), (10.45, 64, .45), (10.9, 66, .45), (11.35, 69, .9), (12.3, 67, .3), (12.6, 66, .3),
              (12.9, 64, .6), (13.5, 66, .9), (17.4, 62, .5), (17.9, 66, .5), (18.4, 69, .5), (18.9, 74, 1.1)]
    fl = np.zeros(N)
    for t0, m, d in phrase:
        f = note(m)
        vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - t0 - 0.15) / 0.2, 0, 1)
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        e = np.clip((t - t0) / 0.05, 0, 1) * np.clip((t0 + d - t) / 0.12 + 1, 0, 1) * (t < t0 + d + 0.12)
        fl += (np.sin(ph) + 0.15 * np.sin(2 * ph)) * e
    fl += bp(rng.standard_normal(N), 1500, 4000) * (np.abs(fl) > 0) * 0.03
    out += reverb(fl * 0.13, 1.4, 0.3, seed=9)

    # heroic hits: title (8.3) and ending (17.2), a brassy chord and low boom
    for t0, chord in [(8.25, [50, 57, 62, 66]), (17.2, [50, 57, 62, 69])]:
        x = np.zeros(N)
        for m in chord:
            f = note(m)
            saw = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 12))
            x += saw
        e = env(t0, 0.03, 1.4)
        x = lp(x * e, 2500) * 0.06
        boom = np.sin(2 * np.pi * (45 + 60 * np.exp(-np.clip(t - t0, 0, None) * 8)) * t) * env(t0, 0.005, 0.5) * 0.5
        out += reverb(np.stack([x + boom, x + boom], 1), 1.6, 0.25, seed=4)
    return out


# ----------------------------------------------------------------------------- sound effects
def sfx():
    out = np.zeros((N, 2))
    noise = rng.standard_normal(N)

    def ping(t0, f, g, d=0.35):
        return sum(np.sin(2 * np.pi * f * r * t) * g / (i + 1) for i, r in enumerate([1, 2.76, 5.4])) * env(t0, 0.001, d)

    # ring falling: clinks and a little rolling rattle
    for t0, g in [(1.18, 0.35), (1.42, 0.2), (1.58, 0.12)]:
        x = ping(t0, 2950, g)
        out += np.stack([x * 0.8, x], 1)
    roll = bp(noise, 3000, 7000) * np.clip((t - 1.6) / 0.1, 0, 1) * np.clip((2.7 - t) / 0.3, 0, 1) * 0.05
    roll *= 0.6 + 0.4 * np.sin(2 * np.pi * 14 * t)
    out += np.stack([roll * 0.5, roll], 1)
    # kada twist: metallic click and shimmer rising into the shrink
    x = ping(4.25, 1800, 0.25, 0.2) + hp(noise, 4000) * env(4.25, 0.001, 0.02) * 0.3
    out += np.stack([x, x], 1)
    f = 600 + 2600 * np.clip((t - 4.4) / 0.8, 0, 1) ** 2
    shim = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.clip((t - 4.4) / 0.8, 0, 1) * (t < 5.25) * 0.08
    out += reverb(np.stack([shim, shim], 1), 0.8, 0.3, seed=5)
    # shrink: whoosh falling in pitch (5.2 - 6.1), pop on landing
    u = np.clip((t - 5.2) / 0.9, 0, 1) * (t < 6.1)
    sweep = np.sin(2 * np.pi * np.cumsum(1400 * (1 - u) ** 2 + 120) / SR) * np.sin(np.pi * u) * 0.12
    wh = bp(noise, 400, 3000) * np.sin(np.pi * u) * 0.18
    out += np.stack([sweep + wh, sweep + np.roll(wh, 100)], 1)
    land = lp(noise, 600) * env(6.15, 0.002, 0.08) * 0.5
    out += np.stack([land, land], 1)
    # ant footsteps (7.0 - 8.1 walking, 10.0 - 13.0 running) and a chirp
    for a, b, rate in [(7.0, 8.1, 9), (10.0, 13.0, 16)]:
        for k in range(int((b - a) * rate)):
            t0 = a + k / rate + rng.random() * 0.01
            x = hp(noise, 2500) * env(t0, 0.0005, 0.006) * 0.12
            out[:, k % 2] += x
    ch = np.sin(2 * np.pi * (2200 + 500 * np.sin(2 * np.pi * 30 * t)) * t) * env(8.0, 0.01, 0.12) * 0.07
    out += np.stack([ch, ch], 1)
    # jump on the ant
    jw = bp(noise, 800, 2500) * np.sin(np.pi * np.clip((t - 8.8) / 0.5, 0, 1)) * (t < 9.3) * 0.12
    out += np.stack([jw, jw], 1)
    # ring found: sparkle, and the heave
    for k in range(10):
        x = ping(13.0 + k * 0.05, 3000 + k * 220, 0.05, 0.4)
        out[:, k % 2] += x
    heave = lp(noise, 300) * env(13.75, 0.05, 0.3) * 0.35
    out += np.stack([heave, heave], 1)
    # grow back: rising whoosh (14.45 - 15.2)
    u = np.clip((t - 14.45) / 0.75, 0, 1) * (t < 15.2)
    sweep = np.sin(2 * np.pi * np.cumsum(150 + 1500 * u ** 2) / SR) * np.sin(np.pi * u) * 0.12
    wh = bp(noise, 500, 4000) * np.sin(np.pi * u) * 0.18
    out += np.stack([sweep + wh, sweep + wh], 1)
    # blessing bell (16.3)
    bell = ping(16.3, 1320, 0.2, 1.2)
    out += reverb(np.stack([bell, bell], 1), 1.5, 0.3, seed=7)
    return out


def main():
    os.makedirs(BUILD, exist_ok=True)
    vo, subs = narration(sys.argv[1])
    mus, fx = music(), sfx()
    # duck music under the voice
    v = lp(np.abs(vo[:, 0]), 6)
    duck = 1 - 0.55 * np.clip(v / 0.05, 0, 1)
    mix = vo * 1.0 + mus * duck[:, None] * 0.9 + fx * 0.85
    fo = np.clip((DUR - t) / 0.3, 0, 1)
    mix *= fo[:, None]
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix *= 0.89 / np.abs(mix).max()
    sf.write(os.path.join(BUILD, "mix.wav"), mix.astype(np.float32), SR, subtype="PCM_16")
    sf.write(os.path.join(BUILD, "narration.wav"), vo.astype(np.float32), SR, subtype="PCM_16")
    with open(os.path.join(HERE, "subs.js"), "w", encoding="utf-8") as f:
        f.write("window.SUBS = " + json.dumps(subs, ensure_ascii=False, indent=1) + ";\n")
    print("audio ok:", len(subs), "subtitle lines")


if __name__ == "__main__":
    main()
