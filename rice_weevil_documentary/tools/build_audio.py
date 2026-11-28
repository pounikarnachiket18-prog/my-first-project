"""Narration (Kokoro TTS, Hindi), original procedural score, sound design and mix.

Usage: python tools/build_audio.py <kokoro_model_dir>
       python tools/build_audio.py --reuse-narration   (keep narration.wav + subtitles.json as
                                                        they are; rebuild score, SFX and mix)
Outputs: assets/audio/{narration,music,sfx,mix}.wav and assets/audio/subtitles.json
Everything here is synthesised from scratch — no third-party or reference-video audio.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
DUR = 50.0
N = int(SR * DUR)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "audio")
VOICE = "hm_omega"
rng = np.random.default_rng(7)


def F(frame):  # timeline frame -> seconds
    return (frame - 1) / 30.0


def J(src):  # S1 jar source frame -> seconds on the final timeline (see tools/finish.py JAR)
    return F(float(np.interp(src, [22, 84, 180], [61, 110, 180])))


# (window start, window end, [(hindi chunk, english chunk), ...])
LINES = [
    (0.20, 6.15, [("रुकिए!", "Wait!"),
                  ("ये चावल पकाने से पहले", "Before you cook this rice,"),
                  ("जान लीजिए अंदर क्या है।", "find out what's inside.")]),
    (6.25, 13.10, [("ये है राइस वीविल, एक छोटा सा कीट,", "This is the rice weevil, a tiny insect"),
                   ("जो चावल ही नहीं, गेहूँ और दूसरे अनाज को भी", "that harms not just rice, but wheat"),
                   ("नुकसान पहुंचा सकता है।", "and other grains too.")]),
    (13.20, 21.00, [("मादा वीविल दाने में एक छोटा सा छेद बनाती है,",
                     "The female makes a tiny hole in the grain,"),
                    ("उसमें अंडा देती है", "lays an egg inside it"),
                    ("और उसे एक खास स्राव से बंद कर देती है।", "and seals it with a special secretion.")]),
    (21.30, 30.90, [("अंडे से निकलने वाला लार्वा बाहर नहीं आता।", "The larva that hatches never comes out."),
                    ("वो दाने के अंदर ही", "It stays inside the grain,"),
                    ("उसका पोषण खाते हुए बढ़ता रहता है।", "growing as it feeds on it.")]),
    (31.30, 39.90, [("इसके बाद ये प्यूपा बनता है", "Next, it becomes a pupa,"),
                    ("और धीरे-धीरे एक नया वयस्क वीविल", "and slowly a new adult weevil"),
                    ("तैयार हो जाता है।", "takes shape.")]),
    (40.10, 46.25, [("और जब ये बाहर निकलता है,", "And by the time it emerges,"),
                    ("तब तक दाना अंदर से", "the grain has been"),
                    ("काफी हद तक खोखला हो चुका होता है।", "largely hollowed out from inside.")]),
    (46.35, 49.60, [("इसलिए अनाज को सूखा और", "So keep grains dry"),
                    ("अच्छी तरह बंद डिब्बों में रखें।", "in tightly sealed containers.")]),
]
GAP = 0.10  # pause between phrases


# --------------------------------------------------------------------------- utils
def trim(x, thr=0.012):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(0.02 * 24000))
    b = min(len(x), idx[-1] + int(0.06 * 24000))
    return x[a:b]


def place(buf, x, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= buf.shape[0]:
        return
    j = min(buf.shape[0], i + x.shape[0])
    if x.ndim == 1 and buf.ndim == 2:
        x = np.stack([x, x], 1)
    buf[i:j] += gain * x[: j - i]


def env_adsr(n, a, r, sr=SR):
    e = np.ones(n)
    na, nr = int(a * sr), int(r * sr)
    if na:
        e[:na] = np.linspace(0, 1, na) ** 2
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def lp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'low')
    return signal.lfilter(b, a, x, axis=0)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x, axis=0)


def bp(x, f1, f2, order=2):
    b, a = signal.butter(order, [f1 / (SR / 2), f2 / (SR / 2)], 'band')
    return signal.lfilter(b, a, x, axis=0)


def pan(x, p):  # p in [-1, 1]
    l = np.cos((p + 1) * np.pi / 4)
    r = np.sin((p + 1) * np.pi / 4)
    return np.stack([x * l, x * r], 1)


def reverb(x, seconds=2.4, mix=0.3, seed=1, damp=4000):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], 1) * np.exp(-t * 6.9 / seconds)[:, None]
    ir = lp(ir, damp)
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True))
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    wet = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - mix) + wet * mix * 1.4


# --------------------------------------------------------------------------- narration
def narration(model_dir):
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))

    def synth(text, speed):
        s, sr = k.create(text, voice=VOICE, speed=speed, lang="hi")
        s = trim(np.asarray(s, dtype=np.float64))
        return signal.resample_poly(s, SR, sr)

    vo = np.zeros(N)
    subs = []
    report = []
    for li, (t0, t1, chunks) in enumerate(LINES):
        avail = t1 - t0
        speed = 1.0
        gaps = GAP * (len(chunks) - 1)
        for _ in range(4):
            parts = [synth(h, speed) for h, _e in chunks]
            total = sum(len(p) for p in parts) / SR + gaps
            if total <= avail or speed >= 1.3:
                break
            # speech time scales ~1/speed; pauses do not
            speed = min(1.3, speed * (total - gaps) / (avail - gaps) * 1.01)
        if total < avail * 0.78 and speed == 1.0:  # room to breathe: slow slightly
            parts = [synth(h, 0.94) for h, _e in chunks]
            total = sum(len(p) for p in parts) / SR + GAP * (len(parts) - 1)
            speed = 0.94
        t = t0
        for (h, e), p in zip(chunks, parts):
            place(vo, p, t)
            d = len(p) / SR
            subs.append(dict(start=round(t, 3), end=round(min(49.95, t + d + 0.08), 3), hi=h,
                             en=e, line=li))
            t += d + GAP
        report.append((li, round(speed, 3), round(total, 2), round(avail, 2)))
    for a, b in zip(subs, subs[1:]):  # never let two subtitle lines overlap
        a["end"] = round(min(a["end"], b["start"] - 0.02), 3)
    # broadcast-style voice chain: HPF, gentle presence, light compression, small room
    vo = hp(vo, 85)
    pres = bp(vo, 2500, 5000)
    vo = vo + 0.25 * pres
    env = np.abs(signal.hilbert(vo))
    env = lp(env, 12)
    gain = np.where(env > 0.25, (0.25 / np.maximum(env, 1e-6)) ** 0.5, 1.0)
    vo = vo * gain
    vo = vo / (np.abs(vo).max() + 1e-9) * 0.9
    vo_st = reverb(vo, seconds=0.6, mix=0.08, seed=3, damp=6000)
    return vo_st, subs, report


# --------------------------------------------------------------------------- music
NOTE = lambda m: 440.0 * 2 ** ((m - 69) / 12)  # noqa: E731
CHORDS = {  # midi notes
    "Dm": [50, 57, 62, 65], "Bb": [46, 53, 58, 62], "F": [41, 53, 57, 60], "Gm": [43, 50, 55, 58],
    "C": [48, 55, 60, 64], "A": [45, 52, 57, 61], "Dsus": [50, 57, 62, 67], "D": [50, 57, 62, 66],
}
PROG = [(0.0, "Dm"), (6.0, "Bb"), (9.5, "F"), (13.0, "Gm"), (17.0, "Dm"), (21.0, "Bb"),
        (24.5, "C"), (28.0, "Dm"), (31.0, "F"), (33.5, "C"), (36.0, "Bb"), (38.5, "A"),
        (40.0, "Dm"), (43.0, "Bb"), (45.5, "A"), (47.0, "Dsus"), (48.2, "D"), (50.0, None)]


def saw(freq, t, harmonics=14, phase=0.0):
    out = np.zeros_like(t)
    for h in range(1, harmonics + 1):
        if freq * h > 9000:
            break
        out += np.sin(2 * np.pi * freq * h * t + phase * h) / h
    return out


def music():
    t = np.arange(N) / SR
    L = np.zeros(N)
    R = np.zeros(N)
    # pads, crossfaded per chord
    for i in range(len(PROG) - 1):
        s, name = PROG[i]
        e = PROG[i + 1][0]
        a, b = int(max(0, s - 0.8) * SR), int(min(DUR, e + 1.2) * SR)
        tt = t[a:b]
        seg = np.zeros((b - a, 2))
        for m in CHORDS[name]:
            f = NOTE(m)
            for c, det in enumerate((-0.11, 0.13)):
                seg[:, c] += saw(f * (1 + det / 100 * 3), tt, phase=c * 1.3)
        env = env_adsr(b - a, 0.8, 1.2)
        seg *= env[:, None]
        L[a:b] += seg[:, 0]
        R[a:b] += seg[:, 1]
    pad = np.stack([L, R], 1)
    # slowly opening filter: darker during mystery, brighter in transformation/ending
    cut = np.interp(t, [0, 6, 13, 21, 31, 40, 47, 50], [600, 900, 1000, 1300, 2200, 1500, 3200, 2000])
    out = np.zeros_like(pad)
    blk = 2400
    zi = None
    for i in range(0, N, blk):
        b, a = signal.butter(2, cut[i] / (SR / 2), 'low')
        if zi is None:
            zi = np.zeros((2, 2))
        y0, zi[:, 0] = signal.lfilter(b, a, pad[i:i + blk, 0], zi=zi[:, 0])
        y1, zi[:, 1] = signal.lfilter(b, a, pad[i:i + blk, 1], zi=zi[:, 1])
        out[i:i + blk, 0], out[i:i + blk, 1] = y0, y1
    pad = out * 0.05
    # sub drone on D
    drone = (np.sin(2 * np.pi * NOTE(38) * t) + 0.5 * np.sin(2 * np.pi * NOTE(26) * t))
    drone *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t)
    drone *= np.interp(t, [0, 2, 46.5, 47, 49, 50], [0, 1, 1, 1.4, 0.6, 0])
    mus = pad + np.stack([drone, drone], 1) * 0.05
    # time-lapse ostinato (S4-S5): plucked arpeggio of the current chord, 8ths @ 100 bpm
    step = 60 / 100 / 2
    k = 0
    tt = 21.0
    while tt < 40.0:
        name = [c for s, c in PROG if s <= tt][-1]
        notes = CHORDS[name]
        m = notes[[1, 2, 3, 2][k % 4]] + 12
        f = NOTE(m)
        n = int(0.5 * SR)
        x = np.arange(n) / SR
        pl = (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 7)
        vel = 0.5 + 0.5 * min(1, (tt - 21) / 4)
        place(mus, pan(pl * 0.035 * vel, 0.4 * np.sin(k)), tt)
        tt += step
        k += 1
    # heartbeat in the mystery and the emergence
    for t0, t1 in ((2.0, 6.0), (40.4, 46.8)):
        bt = t0
        while bt < t1:
            for off, amp in ((0, 1.0), (0.22, 0.6)):
                n = int(0.25 * SR)
                x = np.arange(n) / SR
                th = np.sin(2 * np.pi * (55 - 25 * x / 0.25) * x) * np.exp(-x * 22)
                place(mus, th * 0.16 * amp, bt + off)
            bt += 1.0
    # crystalline shimmer for the metamorphosis
    for i in range(26):
        t0 = 31.5 + i * 0.33 + rng.uniform(-0.05, 0.05)
        f = NOTE(rng.choice([74, 77, 81, 84, 86, 89]))
        n = int(1.6 * SR)
        x = np.arange(n) / SR
        bell = sum(np.sin(2 * np.pi * f * r * x) * w for r, w in ((1, 1), (2.76, 0.35), (5.4, 0.12)))
        place(mus, pan(bell * np.exp(-x * 3.5) * 0.012, rng.uniform(-0.8, 0.8)), t0)
    # final resolve swell
    mus *= np.interp(t, [0, 1.5, 49.0, 50], [0.3, 1, 1, 0])[:, None]
    return reverb(mus, seconds=3.2, mix=0.35, seed=5)


# --------------------------------------------------------------------------- sound design
def noise(sec):
    return rng.standard_normal(int(sec * SR))


def boom(t0, g=1.0, f0=70, f1=28, sec=2.6):
    n = int(sec * SR)
    x = np.arange(n) / SR
    fr = f1 + (f0 - f1) * np.exp(-x * 4)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = np.sin(ph) * np.exp(-x * 2.2) + lp(noise(sec), 300) * 0.25 * np.exp(-x * 8)
    s += hp(noise(sec), 2000) * 0.15 * np.exp(-x * 40)
    return t0, pan(np.tanh(s * 1.5) * g, 0)


def whoosh(t_peak, g=0.5, sec=0.9, direction=1):
    n = int(sec * SR)
    x = np.linspace(0, 1, n)
    src = noise(sec)
    out = np.zeros(n)
    for i, (a, b) in enumerate(zip(range(0, n, 1200), range(1200, n + 1200, 1200))):
        fc = 300 + 3200 * (x[min(a, n - 1)] if direction > 0 else 1 - x[min(a, n - 1)])
        seg = src[a:b]
        bb, aa = signal.butter(2, [fc * 0.6 / (SR / 2), min(0.99, fc * 1.6 / (SR / 2))], 'band')
        out[a:a + len(seg)] = signal.lfilter(bb, aa, seg)
    e = np.exp(-((x - 0.65) ** 2) / 0.045)
    s = out * e * g
    p = np.linspace(-0.7, 0.7, n) * direction
    st = np.stack([s * np.cos((p + 1) * np.pi / 4), s * np.sin((p + 1) * np.pi / 4)], 1)
    return t_peak - 0.65 * sec, st


def riser(t_end, sec=2.0, g=0.25):
    n = int(sec * SR)
    x = np.arange(n) / SR
    fr = 180 * (6 ** (x / sec))
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.4 + bp(noise(sec), 800, 6000) * 0.6
    s *= (x / sec) ** 2.2 * g
    return t_end - sec, pan(s, 0)


def footsteps(t0, t1, rate=14, g=0.05, p=0.0):
    sec = t1 - t0
    out = np.zeros(int(sec * SR))
    tt = 0.0
    while tt < sec - 0.02:
        n = int(0.006 * SR)
        c = hp(noise(0.006), 2500) * np.exp(-np.arange(n) / SR * 900) * rng.uniform(0.4, 1.0)
        i = int(tt * SR)
        out[i:i + n] += c
        tt += rng.exponential(1 / rate)
    return t0, pan(out * g, p)


def crunch(t0, t1, rate=8, g=0.12, lo=1200, hi=6000):
    sec = t1 - t0
    out = np.zeros(int(sec * SR) + SR)
    tt = 0.0
    while tt < sec:
        d = rng.uniform(0.012, 0.035)
        n = int(d * SR)
        x = np.arange(n) / SR
        c = bp(noise(d), lo, hi) * np.exp(-x * rng.uniform(80, 200)) * rng.uniform(0.5, 1)
        for _ in range(rng.integers(1, 4)):  # grains crackle in clusters
            i = int((tt + rng.uniform(0, 0.03)) * SR)
            out[i:i + n] += c
        tt += 1 / rate * rng.uniform(0.7, 1.3)
    return t0, pan(out * g, rng.uniform(-0.2, 0.2))


def plop(t0, g=0.25):
    n = int(0.25 * SR)
    x = np.arange(n) / SR
    fr = 160 + 700 * np.exp(-x * 30)
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-x * 18)
    return t0, pan(s * g, 0)


def squelch(t0, sec=0.6, g=0.12):
    n = int(sec * SR)
    x = np.arange(n) / SR
    s = lp(noise(sec), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * x)) * env_adsr(n, 0.05, 0.3)
    return t0, pan(s * g, 0.1)


def crack(t0, g=0.3):
    n = int(0.12 * SR)
    x = np.arange(n) / SR
    s = hp(noise(0.12), 1500) * np.exp(-x * 60) + np.sin(2 * np.pi * 420 * x) * np.exp(-x * 40) * 0.4
    return t0, pan(s * g, 0)


def shimmer(t0, sec=2.0, g=0.05):
    n = int(sec * SR)
    x = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * x + rng.uniform(0, 6)) for f in (2093, 2637, 3136, 4186))
    s *= (0.6 + 0.4 * np.sin(2 * np.pi * 9 * x)) * env_adsr(n, 0.4, 0.8)
    return t0, pan(s * g, 0)


def slice_fx(t0, g=0.25):
    tp, w = whoosh(t0 + 0.5, g=0.35, sec=0.8, direction=-1)
    n = int(0.9 * SR)
    x = np.arange(n) / SR
    glass = sum(np.sin(2 * np.pi * f * x) for f in (1800, 2710, 4020)) * np.exp(-x * 5) * 0.06
    return [(tp, w), (t0 + 0.55, pan(glass * g * 3, 0))]


def stinger(t0, g=0.3, sec=1.6):
    """Dissonant orchestral-style hit: detuned cluster + sub, fast attack, long tail."""
    n = int(sec * SR)
    x = np.arange(n) / SR
    s = sum(saw(NOTE(m) * (1 + d), x, harmonics=10) for m, d in
            ((62, 0.0), (63, 0.003), (69, -0.002), (74, 0.004), (75, 0.0)))
    s = bp(s, 300, 5000) * np.exp(-x * 2.6) * (1 - np.exp(-x * 400))
    s += np.sin(2 * np.pi * 42 * x) * np.exp(-x * 5) * 1.6
    return t0, pan(np.tanh(s * 0.8) * g, 0)


def scan(t0, sec=0.55, g=0.12):
    """X-ray scan: a bright filtered sweep over a low electrical hum."""
    n = int(sec * SR)
    x = np.arange(n) / SR
    sweep = np.zeros(n)
    src = noise(sec)
    for a in range(0, n, 960):
        fc = 600 + 5200 * (a / n)
        bb, aa = signal.butter(2, [fc * 0.8 / (SR / 2), min(0.99, fc * 1.25 / (SR / 2))], 'band')
        sweep[a:a + 960] = signal.lfilter(bb, aa, src[a:a + 960])
    hum = sum(np.sin(2 * np.pi * f * x) / i for i, f in enumerate((100, 200, 300, 400), 1))
    s = (sweep * 1.4 + hum * 0.15) * env_adsr(n, 0.05, 0.2)
    p = np.linspace(-0.4, 0.4, n)
    return t0, np.stack([s * np.cos((p + 1) * np.pi / 4), s * np.sin((p + 1) * np.pi / 4)], 1) * g


def snap(t0, g=0.16):
    """Tiny whoosh + click for a snap zoom."""
    tp, w = whoosh(t0 + 0.12, g=g, sec=0.4)
    return [(tp, w), (t0 + 0.12, pan(hp(noise(0.02), 3000) * np.exp(-np.arange(int(0.02 * SR))
                                                                       / SR * 300) * g * 0.6, 0))]


# --------------------------------------------------------------------------- blockbuster layer
def stereo(s, p):
    """Equal-power pan with a per-sample position array p in [-1, 1]."""
    return np.stack([s * np.cos((p + 1) * np.pi / 4), s * np.sin((p + 1) * np.pi / 4)], 1)


def braam(t0, g=0.3, sec=3.4, root=36):
    """Low brass-like cluster swelling open: detuned saws through an opening low-pass."""
    n = int(sec * SR)
    x = np.arange(n) / SR
    s = sum(saw(NOTE(m) * (1 + d), x, harmonics=18) for m, d in
            ((root, 0.0), (root, 0.004), (root + 12, -0.003), (root + 19, 0.002), (root + 7, 0.0)))
    out = np.zeros(n)
    for a in range(0, n, 960):  # filter sweeps 150 Hz -> 1.6 kHz -> 300 Hz
        u = a / n
        fc = 150 + 1450 * np.sin(np.pi * min(1.0, u * 1.6)) ** 1.5 + 150 * u
        bb, aa = signal.butter(2, fc / (SR / 2), 'low')
        out[a:a + 960] = signal.lfilter(bb, aa, s[a:a + 960])
    out *= (1 - np.exp(-x * 9)) * np.exp(-x * 0.9)
    out += np.sin(2 * np.pi * NOTE(root - 12) * x) * np.exp(-x * 1.2) * (1 - np.exp(-x * 30)) * 1.2
    return t0, pan(np.tanh(out * 0.7) * g, 0)


def sub_drop(t0, g=0.4, sec=1.4, f0=62, f1=24):
    n = int(sec * SR)
    x = np.arange(n) / SR
    fr = f1 + (f0 - f1) * np.exp(-x * 3.0)
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-x * 2.0) * (1 - np.exp(-x * 200))
    return t0, pan(s * g, 0)


def shock(t0, g=0.3, sec=0.9):
    """Shockwave: pressure thump, then an air ripple that spreads wide in the stereo field."""
    n = int(sec * SR)
    x = np.arange(n) / SR
    thump = lp(noise(sec), 160) * np.exp(-x * 14) * 2.5
    ripple = bp(noise(sec), 300, 3000) * np.exp(-x * 5) * (1 - np.exp(-x * 60))
    l = thump + ripple * 0.5
    r = thump + np.roll(ripple, int(0.011 * SR)) * 0.5  # Haas offset widens it
    return t0, np.stack([l, r], 1) * g


def orbit_air(t0, t1, ang_deg, g=0.06):
    """Air rush that circles with the camera: pan follows the orbit angle (deg per second)."""
    sec = t1 - t0
    n = int(sec * SR)
    x = np.arange(n) / SR
    a = np.radians(np.interp(x, *ang_deg))
    s = bp(noise(sec), 400, 2400) * (0.55 + 0.45 * np.abs(np.cos(a))) * env_adsr(n, 0.6, 0.8)
    return t0, stereo(s * g, np.sin(a) * 0.8)


def ring_hum(t0, t1, g=0.05):
    """Scan rings: three slowly beating partials, each auto-panned at its ring's speed."""
    sec = t1 - t0
    n = int(sec * SR)
    x = np.arange(n) / SR
    env = np.interp(x, [0, 0.5, sec - 0.7, sec], [0, 1, 1, 0])
    out = np.zeros((n, 2))
    for f, rate, ph in ((NOTE(57), 0.07, 0.0), (NOTE(64) * 1.003, -0.055, 2.0),
                        (NOTE(76), 0.045, 4.0)):
        tone = np.sin(2 * np.pi * f * x) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.31 * x + ph))
        out += stereo(tone * env, np.sin(2 * np.pi * rate * x + ph) * 0.7)
    return t0, out * g


def time_stretch(t_hit, sec=1.3, g=0.22):
    """Slow-motion entry: a falling, smeared whoosh that bottoms out on the impact."""
    n = int(sec * SR)
    x = np.arange(n) / SR
    fr = 900 * (0.12 ** (x / sec))
    tone = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.25
    s = (bp(noise(sec), 200, 1800) + tone) * (x / sec) ** 1.6
    return t_hit - sec, pan(s * g, 0)


def sweep_shine(t0, sec, g=0.05):
    """Metallic glint riding the title light sweep, travelling left to right."""
    n = int(sec * SR)
    x = np.arange(n) / SR
    s = bp(noise(sec), 5000, 11000) * np.exp(-((x / sec - 0.5) / 0.22) ** 2)
    s += sum(np.sin(2 * np.pi * f * x) for f in (3520, 5274)) * 0.05 * np.exp(-((x / sec - 0.5) / 0.15) ** 2)
    return t0, stereo(s * g, np.linspace(-0.85, 0.85, n))


def atmosphere():
    """Low room tone + air, a slow tension pulse under the life cycle, darker in the grain."""
    t = np.arange(N) / SR
    brown = np.cumsum(rng.standard_normal(N))
    brown = hp(brown - np.convolve(brown, np.ones(4800) / 4800, mode="same"), 25)
    room = lp(brown, 220)
    room /= np.abs(room).max() + 1e-9
    air = bp(rng.standard_normal(N), 2500, 7000)
    air /= np.abs(air).max() + 1e-9
    bed = room * (0.8 + 0.2 * np.sin(2 * np.pi * 0.05 * t)) + air * 0.08
    # tension pulse (low D, 2 Hz tremolo) from the egg-laying to the break-out
    pulse = np.sin(2 * np.pi * NOTE(26) * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.0 * t)) ** 2
    pulse *= np.interp(t, [0, 13, 16, 31, 33, 38, 42.5, 43.5, 50], [0, 0, 1, 1, 1.3, 1.5, 1.6, 0, 0])
    out = np.stack([bed, np.roll(bed, 2400)], 1) * 0.25 + np.stack([pulse, pulse], 1) * 0.18
    return out * np.interp(t, [0, 0.3, 49, 50], [0, 1, 1, 0])[:, None]


def sfx():
    out = np.zeros((N, 2))
    ev = []
    # cold open: the grain bursts on frame 1, the head pushes out, focus lands on the eye
    ev += [boom(0.0, 0.85, 95, 30, 2.4), crack(0.0, 0.4)]
    ev += [crunch(0.0, 0.5, rate=34, g=0.22, lo=1500, hi=8000)]
    ev += [crunch(F(8), F(32), rate=14, g=0.13, lo=900, hi=5000)]   # chitin against the grain
    ev += [stinger(F(26), 0.32)]                                     # eye snaps into focus
    ev += [whoosh(F(60), 0.42, sec=1.0, direction=-1)]               # snap back...
    ev += [boom(F(61), 0.5, 70, 30, 1.6)]                            # ...into the jar
    # the sealed jar (sound placed on the speed-ramped timeline)
    ev += [crunch(J(28), J(50), rate=11, g=0.08, lo=2500, hi=7000)]  # lid thread grinding
    ev += [crack(J(52), 0.14), plop(J(53), 0.15)]           # seal breaks, lid comes free
    ev += [whoosh(J(72), 0.3)]                               # lid swept away
    ev += [whoosh(J(94), 0.28, direction=-1)]                # camera rises to the rim
    ev += [footsteps(J(60), F(180), rate=13, g=0.055)]       # weevils scrabbling on glass
    ev += [boom(J(148), 0.45, 80, 35, 2.0)]                  # first weevil over the rim
    ev += [whoosh(F(181), 0.4, sec=0.8)]                     # zoom-through into scene 2
    # scene transitions
    ev += [whoosh(F(391), 0.22, sec=1.1, direction=-1)]      # rack-focus transition
    ev += [whoosh(F(631) + 0.05, 0.3)]                       # match cut into the grain
    ev += [scan(F(924), 0.5, 0.16)]                          # x-ray scan wipe
    ev += [whoosh(F(1201), 0.3, direction=-1), shimmer(F(1194), 0.9, 0.04)]  # particles
    # snap zooms on reveals; anticipation risers and soft hits on each new stage
    for fr in (298, 584, 644):
        ev += snap(F(fr))
    ev += [riser(F(998), 2.0, 0.12), boom(F(998), 0.22, 90, 45, 1.2)]       # pupa
    ev += [boom(F(1104), 0.26, 90, 45, 1.2)]                                 # adult
    ev += [riser(F(1290), 2.2, 0.12)]                                        # break-out
    ev += [footsteps(F(181), F(300), rate=12, g=0.045, p=-0.2)]      # S2 walking
    ev += [footsteps(F(391), F(445), rate=13, g=0.05)]                # S3 walk
    ev += [crunch(F(455), F(522), rate=8.1, g=0.16)]                  # drilling with mandibles
    ev += [footsteps(F(522), F(556), rate=16, g=0.05, p=0.2)]         # turning around
    ev += [plop(F(588), 0.22)]                                        # egg placed
    ev += [squelch(F(590), 0.6, 0.11)]                                # gelatinous seal
    ev += [footsteps(F(606), F(630), rate=14, g=0.04)]
    ev += slice_fx(F(604))                                            # cutaway slice
    ev += [crack(F(662), 0.18)]                                       # hatching
    ev += [crunch(F(690), F(928), rate=5, g=0.06, lo=800, hi=3500)]   # larva feeding
    for fr in (700, 780, 860):                                        # growth spurts / moults
        ev += [shimmer(F(fr) - 0.3, 1.0, 0.02)]
    ev += [shimmer(F(940), 1.4, 0.03)]                                # x-ray reveal
    ev += [riser(F(1104), 2.6, 0.12)]                                 # adult forming
    ev += [shimmer(F(1070), 2.2, 0.03)]
    ev += [crunch(F(1215), F(1290), rate=9, g=0.17)]                  # chewing the exit hole
    ev += [crack(F(1288), 0.3), boom(F(1290), 0.25, 90, 40, 1.2)]     # break-through
    ev += [footsteps(F(1290), F(1410), rate=15, g=0.05)]
    ev += [riser(F(1411), 1.6, 0.18), boom(F(1411), 0.7, 60, 26, 3.2)]  # title hit
    ev += [whoosh(F(1411) + 0.15, 0.3)]
    # ---- blockbuster layer: braams on the big reveals, sub drops under impacts, shockwaves,
    # spatial movement that follows the camera, a slow-motion entry and the title sweep
    ev += [sub_drop(0.0, 0.45), shock(0.02, 0.35)]                     # grain bursts open
    ev += [sub_drop(F(61), 0.3, 1.0)]                                  # into the jar
    ev += [braam(F(183), 0.30, 3.6, root=36)]                          # the invader revealed
    ev += [orbit_air(F(181), F(330), ([0, (330 - 181) / 30], [-100, 260]), 0.07)]
    ev += [sub_drop(F(631), 0.2, 0.9)]                                 # match cut inside
    ev += [ring_hum(F(935), F(1118), 0.045)]                           # scan rings
    ev += [time_stretch(F(1290), 1.3, 0.2)]                            # slow-motion entry
    ev += [shock(F(1290), 0.45), sub_drop(F(1290), 0.42)]              # break-through
    ev += [whoosh(F(1350) + 0.4, 0.22, sec=1.6, direction=-1)]         # pull back to the plain
    ev += [braam(F(1352), 0.16, 2.6, root=31)]                         # scale reveal
    ev += [braam(F(1411), 0.36, 3.0, root=33), sub_drop(F(1411), 0.5, 1.8, 58, 22)]  # title
    ev += [sweep_shine(F(1421), 1.35, 0.06)]                           # light across the letters
    for t0, st in ev:
        place(out, st, t0)
    return reverb(out, seconds=1.4, mix=0.18, seed=9)


# --------------------------------------------------------------------------- mix
def main():
    os.makedirs(OUT, exist_ok=True)
    if "--reuse-narration" in sys.argv:  # identical voice + subtitle timing as before
        vo, _sr = sf.read(os.path.join(OUT, "narration.wav"), always_2d=True)
        subs = json.load(open(os.path.join(OUT, "subtitles.json"), encoding="utf-8"))
        report = "reused narration.wav"
    else:
        vo, subs, report = narration(sys.argv[1])
    print("narration fit (line, speed, seconds, window):", report)
    mus = music()
    fx = sfx()
    atm = atmosphere()
    # duck music under the voice (smooth sidechain)
    v_env = lp(np.abs(vo[:, 0]), 6)
    v_env = np.clip(v_env / (v_env.max() + 1e-9) * 6, 0, 1)
    duck = 1.0 - 0.72 * v_env
    mus = mus * duck[:, None]
    atm = atm * (1.0 - 0.6 * v_env)[:, None]
    # slow motion (output frames 1290-1326): the world goes muffled, then snaps back on time
    tt = np.arange(N) / SR
    m = np.interp(tt, [F(1288), F(1292), F(1320), F(1330)], [0, 1, 1, 0])[:, None]
    mus = mus * (1 - m) + lp(mus, 450) * m
    atm = atm * (1 - m) + lp(atm, 300) * m * 1.3

    def norm(x, peak):
        return x / (np.abs(x).max() + 1e-9) * peak

    vo, mus, fx, atm = norm(vo, 0.9), norm(mus, 0.32), norm(fx, 0.6), norm(atm, 0.12)
    fx = fx * (1.0 - 0.55 * v_env)[:, None]
    mix = vo + mus + fx + atm
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # gentle master saturation / limiting
    mix *= np.interp(np.arange(N) / SR, [0, 0.02, 49.88, 50.0], [0, 1, 1, 0])[:, None]
    for name, x in (("narration", vo), ("music", mus), ("sfx", fx), ("atmos", atm), ("mix", mix)):
        sf.write(os.path.join(OUT, f"{name}.wav"), x.astype(np.float32), SR, subtype="PCM_24")
    with open(os.path.join(OUT, "subtitles.json"), "w", encoding="utf-8") as fh:
        json.dump(subs, fh, ensure_ascii=False, indent=1)
    print("wrote", OUT, "subs:", len(subs))


if __name__ == "__main__":
    main()
