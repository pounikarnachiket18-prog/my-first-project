"""Procedural sound design + score + final mix for the Earth reel (no samples, no copyrighted music).

Inputs : public/earth/audio/narration.wav   (from build_narration.py)
Outputs: public/earth/audio/music.wav, sfx.wav, final_mix.wav  (48 kHz stereo, exactly 50.000 s)

Every event time below mirrors src/earth/timeline.ts (frame / 30).
Run from video/:  python3 earth/tools/build_audio.py
"""
import os, subprocess, json
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
DUR = 50.0
N = int(SR * DUR)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUD = os.path.join(ROOT, "public", "earth", "audio")
rng = np.random.default_rng(1234)

F = lambda frame: frame / 30.0  # frame -> seconds
BEAT = dict(freeze=F(80), title=F(108), b1=F(150), arcs=F(200), whip=F(255), count0=F(300), count1=F(328), city=F(360),
            stop=F(400), slow_end=F(462), realtime=F(482), c3=F(510), d1=F(600), d2=F(668), d3=F(724), hit=F(764), d4=F(766),
            calm=F(840), e2=F(930), strike=F(960), year=F(1005), f1=F(1110), day=F(1138), night=F(1184), hot=F(1215),
            cold=F(1275), end=F(1323), g2=F(1400), black=F(1484), final=F(1486))


# ------------------------------------------------------------------ primitives
def t_axis(d):
    return np.arange(int(d * SR)) / SR


def noise(d, color="white"):
    n = int(d * SR)
    w = rng.standard_normal(n)
    if color == "white":
        return w
    X = np.fft.rfft(w)
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = 1
    if color == "pink":
        X /= np.sqrt(f)
    elif color == "brown":
        X /= f
    y = np.fft.irfft(X, n)
    return y / (np.max(np.abs(y)) + 1e-9)


def bp(x, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, fc, order=4):
    return signal.sosfilt(signal.butter(order, fc, btype="low", fs=SR, output="sos"), x)


def hp(x, fc, order=4):
    return signal.sosfilt(signal.butter(order, fc, btype="high", fs=SR, output="sos"), x)


def sweep_lp(x, f0, f1, steps=64):
    """Time-varying low-pass (block-wise), for whooshes / risers / muffling."""
    out = np.zeros_like(x)
    L = len(x)
    edges = np.linspace(0, L, steps + 1).astype(int)
    zi = None
    for i in range(steps):
        fc = f0 * (f1 / f0) ** (i / max(1, steps - 1))
        sos = signal.butter(2, min(fc, SR / 2.2), btype="low", fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        seg, zi = signal.sosfilt(sos, x[edges[i]:edges[i + 1]], zi=zi)
        out[edges[i]:edges[i + 1]] = seg
    return out


def env_ad(d, a, decay, curve=4.0):
    t = t_axis(d)
    e = np.where(t < a, t / max(a, 1e-4), np.exp(-(t - a) / decay))
    return e


def reverb_ir(d=3.0, decay=1.2, bright=6000):
    t = t_axis(d)
    ir = rng.standard_normal(len(t)) * np.exp(-t / decay)
    ir = lp(ir, bright, 2)
    ir[0] = 1.0
    return ir / np.sqrt(np.sum(ir ** 2))


IR_BIG = reverb_ir(4.0, 1.4, 5000)
IR_SMALL = reverb_ir(1.2, 0.35, 7000)


def verb(x, ir, wet=0.35):
    y = signal.fftconvolve(x, ir)[: len(x)]
    return x * (1 - wet) + y * wet


class Track:
    def __init__(self):
        self.L = np.zeros(N + SR * 6)
        self.R = np.zeros(N + SR * 6)

    def add(self, x, at, gain=1.0, pan=0.0, width=0.0):
        """pan -1..1; width adds a short Haas delay for stereo size."""
        s = int(at * SR)
        if s < 0:
            x = x[-s:]
            s = 0
        n = min(len(x), len(self.L) - s)
        if n <= 0:
            return
        gl = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2) * gain
        gr = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2) * gain
        self.L[s:s + n] += x[:n] * gl
        if width > 0:
            dly = int(width * 0.018 * SR)
            xr = np.concatenate([np.zeros(dly), x])[: n]
            self.R[s:s + n] += xr * gr
        else:
            self.R[s:s + n] += x[:n] * gr

    def stereo(self):
        return np.stack([self.L[:N], self.R[:N]], axis=1)


def db(x):
    return 10 ** (x / 20)


# ------------------------------------------------------------------ sound design library
def sub_boom(d=3.0, f0=55, f1=26, decay=0.9):
    t = t_axis(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.35)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / decay)
    x += 0.4 * np.tanh(3 * np.sin(ph * 2)) * np.exp(-t / (decay * 0.4))
    return x / np.max(np.abs(x))


def crack(d=0.6, bright=9000):
    x = noise(d) * env_ad(d, 0.002, 0.06)
    return hp(lp(x, bright), 300) * 1.2


def impact(d=4.0, size=1.0, bright=6000):
    x = sub_boom(d, 60 * size ** -0.2, 24, 0.7 + 0.6 * size) * 0.9
    x[: int(0.6 * SR)] += crack(0.6, bright) * 0.6
    body = lp(noise(d, "brown"), 400) * env_ad(d, 0.005, 0.5 * size)
    x += body * 0.8
    return verb(x / np.max(np.abs(x)), IR_BIG, 0.3)


def whoosh(d=0.9, f0=300, f1=5000, peak=0.6):
    x = noise(d, "pink")
    x = sweep_lp(x, f0, f1)
    t = t_axis(d)
    e = np.where(t < d * peak, (t / (d * peak)) ** 2, np.exp(-(t - d * peak) / (d * 0.18)))
    return x * e / (np.max(np.abs(x * e)) + 1e-9)


def riser(d=2.5, f0=200, f1=4000):
    t = t_axis(d)
    x = sweep_lp(noise(d, "pink"), f0, f1) * (t / d) ** 2.2
    tone_f = 80 * (8 ** (t / d))
    tone = np.sin(2 * np.pi * np.cumsum(tone_f) / SR) * (t / d) ** 3 * 0.35
    y = x / (np.max(np.abs(x)) + 1e-9) + tone
    return y / np.max(np.abs(y))


def grind_stop(d=1.2):
    """Descending tonal screech + grinding noise: a planet-sized brake."""
    t = t_axis(d)
    f = 900 * np.exp(-t * 3.0) + 60
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.4)
    x = bp(x, 80, 3000)
    g = bp(noise(d), 200, 2500) * np.exp(-t / 0.3) * (0.5 + 0.5 * np.sin(2 * np.pi * 37 * t))
    y = x * 0.6 + g * 0.5
    return y / np.max(np.abs(y))


def wind(d, lo=150, hi=1200, gust=0.25, seed_rate=0.3):
    x = bp(noise(d, "pink"), lo, hi)
    t = t_axis(d)
    mod = 0.6 + gust * np.sin(2 * np.pi * seed_rate * t) + gust * 0.7 * np.sin(2 * np.pi * seed_rate * 2.3 * t + 1.3)
    # howl: resonant band moving
    howl = bp(noise(d), 500, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.21 * t))
    y = x * mod + howl * 0.3
    return y / np.max(np.abs(y))


def rumble(d, fc=90):
    x = lp(noise(d, "brown"), fc)
    return x / np.max(np.abs(x))


def debris_clatter(d, density=40):
    out = np.zeros(int(d * SR))
    for _ in range(int(density * d)):
        s = int(rng.uniform(0, d - 0.2) * SR)
        g = rng.uniform(0.15, 1.0)
        ln = int(rng.uniform(0.02, 0.12) * SR)
        c = rng.standard_normal(ln) * np.exp(-np.arange(ln) / (ln * 0.2))
        c = bp(c, rng.uniform(400, 1500), rng.uniform(2500, 7000), 2)
        out[s:s + ln] += c * g
    return out / (np.max(np.abs(out)) + 1e-9)


def glass(d=1.5):
    out = np.zeros(int(d * SR))
    for _ in range(120):
        s = int(rng.exponential(0.25) * SR)
        if s >= len(out) - 2000:
            continue
        f = rng.uniform(2500, 9000)
        ln = int(rng.uniform(0.02, 0.15) * SR)
        tt = np.arange(ln) / SR
        out[s:s + ln] += np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.03) * rng.uniform(0.2, 1)
    return hp(out, 1500) / (np.max(np.abs(out)) + 1e-9)


def wave_crash(d=3.0):
    t = t_axis(d)
    x = lp(noise(d, "pink"), 2500) * np.where(t < 0.25, t / 0.25, np.exp(-(t - 0.25) / 0.9))
    x += lp(noise(d, "brown"), 200) * np.exp(-t / 1.2) * 0.8
    return x / np.max(np.abs(x))


def thunder(d=4.0):
    t = t_axis(d)
    x = crack(0.3, 6000)
    body = lp(noise(d, "brown"), 300) * (np.exp(-t / 1.4)) * (1 + 0.6 * np.sin(2 * np.pi * 3 * t) * np.exp(-t / 0.8))
    y = np.concatenate([x, np.zeros(len(body) - len(x))]) * 0.4 + body
    return verb(y / np.max(np.abs(y)), IR_BIG, 0.4)


def tick(f=2400, d=0.03):
    t = t_axis(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006)


def shimmer(d=2.0, base=880):
    t = t_axis(d)
    x = sum(np.sin(2 * np.pi * base * k * t + k) * (0.6 / k) for k in (1, 1.5, 2, 3))
    x *= np.exp(-t / (d * 0.4)) * (1 - np.exp(-t / 0.05))
    return verb(x / np.max(np.abs(x)), IR_BIG, 0.5)


def crackle(d, rate=120):
    out = np.zeros(int(d * SR))
    for _ in range(int(rate * d)):
        s = int(rng.uniform(0, d - 0.01) * SR)
        ln = int(rng.uniform(0.001, 0.006) * SR)
        out[s:s + ln] += rng.standard_normal(ln) * rng.uniform(0.1, 1)
    return hp(out, 1200)


def heartbeat(d, bpm=70):
    out = np.zeros(int(d * SR))
    per = 60 / bpm
    for k in range(int(d / per) + 1):
        for off, g in ((0, 1.0), (0.28, 0.6)):
            s = int((k * per + off) * SR)
            b = sub_boom(0.4, 70, 40, 0.09) * g
            n = min(len(b), len(out) - s)
            if n > 0:
                out[s:s + n] += b[:n]
    return out


# ------------------------------------------------------------------ score (original, procedural)
def note(fr, d, kind="saw", cutoff=1200, a=0.01, r=0.3):
    t = t_axis(d)
    if kind == "saw":
        x = sum(signal.sawtooth(2 * np.pi * fr * dt * t) for dt in (0.997, 1.0, 1.004)) / 3
    elif kind == "sine":
        x = np.sin(2 * np.pi * fr * t) + 0.3 * np.sin(4 * np.pi * fr * t)
    else:
        x = signal.square(2 * np.pi * fr * t) * 0.5
    e = np.minimum(1, t / a) * np.where(t > d - r, np.maximum(0, (d - t) / r), 1)
    return lp(x, cutoff, 2) * e


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def pad(chord, d, cutoff=1500, vol=1.0):
    x = sum(note(hz(m), d, "saw", cutoff, a=d * 0.3, r=d * 0.4) for m in chord)
    return x / len(chord) * vol


def build_music():
    m = Track()
    # 0-5: space drone (D) with slow swell
    m.add(verb(pad([38, 45, 50], 5.5, 500), IR_BIG, 0.5), 0.0, 0.5, width=1)
    # 5-12: pulse ostinato in D minor, 100 bpm 8ths, building
    bpm = 100
    e8 = 60 / bpm / 2
    seq = [38, 38, 50, 38, 41, 38, 48, 38]
    t0 = BEAT["b1"]
    k = 0
    while t0 + k * e8 < BEAT["city"]:
        tt = t0 + k * e8
        prog = (tt - BEAT["b1"]) / (BEAT["city"] - BEAT["b1"])
        n = note(hz(seq[k % 8]), e8 * 0.9, "saw", 400 + 1800 * prog, a=0.005, r=0.08)
        m.add(n, tt, 0.35 + 0.25 * prog, pan=0.25 * np.sin(k), width=0.5)
        k += 1
    m.add(verb(pad([50, 53, 57], BEAT["city"] - BEAT["b1"], 900), IR_BIG, 0.4), BEAT["b1"], 0.35, width=1)
    # 12-13.3: city (light)
    m.add(pad([50, 57, 62], 1.4, 1200), BEAT["city"], 0.25, width=1)
    # 13.3-20: slow-mo dread drone then rising strings
    m.add(verb(pad([26, 38, 39], 6.8, 300), IR_BIG, 0.6), BEAT["stop"] + 0.1, 0.7, width=1)
    m.add(verb(pad([50, 53, 56, 62], 3.8, 1600), IR_BIG, 0.5), BEAT["c3"] - 0.6, 0.45, width=1)
    # 20-28: storm: driving low pulses (taiko-like) + dissonant pad
    tk = BEAT["d1"]
    while tk < BEAT["calm"] - 0.6:
        m.add(sub_boom(0.6, 90, 45, 0.15) * 0.9 + lp(noise(0.6, "brown"), 300) * env_ad(0.6, 0.002, 0.08) * 0.5, tk, 0.55, width=0.3)
        tk += 60 / 110 * (1 if (tk - BEAT["d1"]) % 2 < 1.6 else 0.5)
    m.add(verb(pad([38, 39, 45, 51], 8.0, 1100), IR_BIG, 0.5), BEAT["d1"], 0.45, width=1)
    # 28-37: calm reflective (F major-ish -> uncertain)
    m.add(verb(pad([53, 57, 60, 64], 4.5, 1400), IR_BIG, 0.6), BEAT["calm"], 0.45, width=1)
    m.add(verb(pad([50, 57, 60, 65], 4.0, 1600), IR_BIG, 0.6), BEAT["calm"] + 4.3, 0.45, width=1)
    for i, mm in enumerate([72, 69, 67, 69, 72, 74, 72, 67]):  # soft bell motif
        m.add(verb(note(hz(mm), 1.2, "sine", 6000, 0.005, 1.0), IR_BIG, 0.6), BEAT["e2"] + i * 0.75, 0.12, pan=0.4 * np.sin(i))
    # 37-44: twist: tension pulse + split warm/cold
    m.add(verb(pad([38, 44, 50], 7.2, 700), IR_BIG, 0.5), BEAT["f1"], 0.5, width=1)
    m.add(heartbeat(5.0, 72), BEAT["f1"] + 0.3, 0.35)
    # 44-49.5: sunrise swell: D major lift
    m.add(verb(pad([50, 54, 57, 62, 66], 5.6, 2200), IR_BIG, 0.6), BEAT["end"] - 0.2, 0.55, width=1)
    m.add(verb(pad([43, 50, 55, 59], 5.4, 1500), IR_BIG, 0.5), BEAT["end"], 0.35, width=1)
    return m


def build_sfx():
    s = Track()
    B = BEAT
    # space ambience 0-12
    s.add(lp(noise(12, "brown"), 120) * 0.6 + bp(noise(12, "pink"), 2000, 6000) * 0.05, 0, 0.5, width=1)
    s.add(riser(2.5), B["freeze"] - 2.5, 0.55, width=1)
    s.add(impact(5.0, 1.4, 4500), B["freeze"], 1.0, width=1)
    s.add(grind_stop(1.3), B["freeze"] - 0.02, 0.5, width=0.6)
    s.add(whoosh(0.7, 300, 6000, 0.7), B["title"] - 0.5, 0.4, pan=-0.3, width=0.6)
    s.add(impact(2.5, 0.5, 8000), B["title"], 0.35)
    s.add(whoosh(0.9, 200, 4000), B["b1"] - 0.6, 0.5, width=1)
    s.add(shimmer(2.0, 1320), B["arcs"], 0.18, width=1)
    s.add(whoosh(0.6, 400, 8000, 0.5), B["whip"] - 0.3, 0.55, pan=0.6)
    s.add(shimmer(1.6, 990), B["whip"] + 0.1, 0.18)
    # speedometer ticks accelerating + lock hit
    c0, c1 = B["count0"], B["count1"]
    tt = c0
    while tt < c1:
        p = (tt - c0) / (c1 - c0)
        s.add(tick(1800 + 1400 * p), tt, 0.25 + 0.2 * p, pan=0.2)
        tt += 0.09 * (1 - 0.75 * p)
    s.add(riser(c1 - c0, 400, 6000), c0, 0.25)
    s.add(impact(2.0, 0.4, 9000), c1, 0.45)
    # city ambience + traffic
    city_d = B["stop"] - B["city"] + 0.3
    s.add(lp(noise(city_d, "pink"), 1800) * 0.5 + bp(noise(city_d), 80, 200) * 0.5, B["city"], 0.35, width=1)
    for k, (f1, f2) in enumerate([(415, 520)]):
        hn = np.concatenate([note(f1, 0.18, "square", 2500), note(f2, 0.25, "square", 2500)])
        s.add(verb(hn, IR_SMALL, 0.4), B["city"] + 0.35, 0.12, pan=0.5)
    s.add(whoosh(0.5, 500, 9000, 0.5), B["city"] - 0.25, 0.5, width=1)
    # THE STOP
    s.add(impact(6.0, 1.8, 3500), B["stop"], 1.15, width=1)
    s.add(glass(1.6), B["stop"] + 0.02, 0.45, width=1)
    s.add(debris_clatter(1.5, 60), B["stop"], 0.35, width=1)
    slow = B["realtime"] - B["stop"]
    s.add(sweep_lp(noise(slow, "brown"), 150, 900) * np.linspace(0.5, 1, int(slow * SR)), B["stop"] + 0.1, 0.55, width=1)  # slow-mo whoomp
    # ramp to real time: wind blast + debris
    s.add(riser(B["realtime"] - B["slow_end"], 150, 3000), B["slow_end"], 0.6, width=1)
    blast_d = B["d1"] - B["realtime"] + 0.8
    s.add(wind(blast_d, 120, 1800, 0.3, 0.5), B["realtime"], 0.75, width=1)
    s.add(debris_clatter(blast_d, 30), B["realtime"], 0.35, width=1)
    s.add(rumble(blast_d, 70), B["realtime"], 0.6)
    # C3: building groan + whoosh
    s.add(whoosh(0.5, 400, 8000), B["c3"] - 0.25, 0.4, pan=0.4)
    t = t_axis(3.0)
    groan = bp(signal.sawtooth(2 * np.pi * np.cumsum(55 + 12 * np.sin(2 * np.pi * 0.7 * t)) / SR), 60, 900) * np.minimum(1, t / 0.4) * np.exp(-t / 2.0)
    s.add(verb(groan, IR_BIG, 0.5), B["c3"] + 0.2, 0.35, width=0.5)
    # STORM 20-28
    storm_d = B["calm"] - B["d1"]
    s.add(wind(storm_d, 200, 2500, 0.35, 0.4), B["d1"], 0.42, width=1)
    s.add(rumble(storm_d, 80), B["d1"], 0.3)
    for k, tt in enumerate([B["d1"] + 0.4, B["d1"] + 1.5, B["d2"] + 0.6, B["d2"] + 1.4, B["d3"] + 0.3, B["d4"] + 0.7, B["d4"] + 1.6]):
        s.add(thunder(3.5), tt, 0.45, pan=0.5 * np.sin(k * 2.1), width=0.6)
    rain_d = B["d4"] - B["d2"] + 0.5
    s.add(hp(noise(rain_d, "pink"), 2500) * 0.5, B["d2"], 0.28, width=1)
    s.add(whoosh(0.5, 300, 7000), B["d2"] - 0.25, 0.45, pan=-0.4)
    s.add(wave_crash(2.5), B["d2"] + 0.15, 0.6, width=1)
    s.add(wave_crash(2.5), B["d2"] + 1.1, 0.5, width=1, pan=0.3)
    approach = B["hit"] - B["d3"]
    s.add(riser(approach, 100, 3000) * 0.8 + rumble(approach, 120) * np.linspace(0.2, 1, int(approach * SR)), B["d3"], 0.75, width=1)
    s.add(impact(5.0, 2.0, 3000), B["hit"], 1.15, width=1)
    s.add(wave_crash(4.0), B["hit"], 0.9, width=1)
    s.add(rumble(B["calm"] - B["hit"], 60), B["hit"], 0.5)
    # calm 28-37
    s.add(lp(noise(9, "brown"), 100) * 0.5, B["calm"], 0.35, width=1)
    s.add(whoosh(1.2, 200, 3000, 0.5), B["e2"] - 0.6, 0.35, width=1)
    s.add(whoosh(0.35, 800, 9000, 0.4), B["strike"] - 0.12, 0.35, pan=0.5)
    s.add(impact(3.0, 0.8, 7000), B["year"], 0.6, width=1)
    s.add(shimmer(2.5, 660), B["year"], 0.2, width=1)
    # twist
    s.add(riser(1.0, 200, 5000), B["f1"] - 1.0, 0.35, width=1)
    s.add(impact(2.5, 0.6, 6000), B["day"], 0.4, pan=0.3)
    s.add(impact(2.5, 0.6, 3000), B["night"], 0.4, pan=-0.3)
    s.add(whoosh(0.6, 300, 6000), B["hot"] - 0.3, 0.45, width=1)
    hot_d = B["cold"] - B["hot"] + 0.3
    s.add(crackle(hot_d, 160) * 0.5 + bp(noise(hot_d, "pink"), 300, 1500) * 0.4, B["hot"], 0.4, width=1)
    s.add(whoosh(0.5, 2000, 300, 0.4), B["cold"] - 0.25, 0.4, pan=-0.4)
    cold_d = B["end"] - B["cold"] + 0.4
    s.add(wind(cold_d, 600, 3000, 0.4, 0.6), B["cold"], 0.45, width=1)
    s.add(shimmer(1.5, 1760), B["cold"] + 0.1, 0.15, width=1)
    s.add(crack(0.4, 7000), B["cold"] + 0.6, 0.35, pan=0.3)
    # ending
    s.add(whoosh(1.4, 150, 4000, 0.6), B["end"] - 0.5, 0.4, width=1)
    s.add(whoosh(1.0, 200, 5000, 0.6), B["g2"] - 0.5, 0.35, width=1)
    s.add(lp(noise(6, "brown"), 110) * 0.5, B["end"], 0.3, width=1)
    s.add(riser(B["black"] - B["end"] - 1.0, 100, 2500), B["end"] + 1.0, 0.18, width=1)
    s.add(impact(4.0, 2.2, 4000), B["final"], 1.25, width=1)
    return s


def envelope_follow(x, att=0.01, rel=0.25):
    a = np.abs(x)
    win = int(0.02 * SR)
    a = np.convolve(a, np.ones(win) / win, mode="same")
    out = np.zeros_like(a)
    ka, kr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    # vectorised approximation: smooth with release, then max with attack-smoothed
    out = signal.lfilter([1 - kr], [1, -kr], a)
    return np.maximum(out, signal.lfilter([1 - ka], [1, -ka], a))


def main():
    narr, sr = sf.read(os.path.join(AUD, "narration.wav"))
    assert sr == SR
    if narr.ndim > 1:
        narr = narr.mean(axis=1)
    narr = np.pad(narr, (0, max(0, N - len(narr))))[:N]
    music = build_music().stereo()
    sfx = build_sfx().stereo()
    # sidechain ducking: music -9 dB and sfx -5 dB while the narrator speaks
    env = envelope_follow(narr, 0.015, 0.35)
    env = env / (np.max(env) + 1e-9)
    duck_m = 1 - (1 - db(-9)) * np.clip(env * 4, 0, 1)
    duck_s = 1 - (1 - db(-8)) * np.clip(env * 4, 0, 1)
    music *= duck_m[:, None]
    sfx *= duck_s[:, None]
    # normalise stems, then balance
    music /= np.max(np.abs(music)) + 1e-9
    sfx /= np.max(np.abs(sfx)) + 1e-9
    voice = np.stack([narr, narr], axis=1) / (np.max(np.abs(narr)) + 1e-9)
    mix = voice * db(-3) + music * db(-17) + sfx * db(-9)
    # final fade (last 15 ms) to avoid a click at 50.000 s
    fade = int(0.015 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    sf.write(os.path.join(AUD, "music.wav"), music * db(-6), SR)
    sf.write(os.path.join(AUD, "sfx.wav"), sfx * db(-6), SR)
    raw = os.path.join(AUD, "mix_raw.wav")
    sf.write(raw, mix / (np.max(np.abs(mix)) + 1e-9) * 0.7, SR)
    # loudness-normalise for social (-14 LUFS integrated, -1.5 dBTP), two-pass
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    out = os.path.join(AUD, "final_mix.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", af, "-ar", str(SR), "-t", "50", out], check=True)
    os.remove(raw)
    print("wrote", out)


if __name__ == "__main__":
    main()
