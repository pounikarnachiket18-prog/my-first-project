"""THE LAST FLIGHT: procedural score, sound design and final mix (no samples, no licensed or copyrighted audio).

Inputs : public/lastflight/audio/dialogue.wav   (from build_dialogue.py)
Outputs: public/lastflight/audio/music.wav, sfx.wav, final_mix.wav   (48 kHz stereo, exactly 60.000 s)

Every time below matches src/lastflight/timeline.ts (seconds; 24 fps).
Run from video/:  python3 lastflight/tools/build_audio.py

Physics notes used by the sound design
  * Main rotor: 4 blades at ~290 rpm -> blade-pass "slap" at ~19 Hz. Tail rotor: 2 blades at ~1500 rpm -> ~50 Hz buzz.
  * Fly-bys use a real propagation delay (distance / 343 m/s), so the Doppler shift and the timing come out naturally,
    with 1/r loudness and more high-frequency loss with distance.
  * Space has no air, so the Earth-from-space shot carries only score and radio, with no wind or rumble.
"""
import os, json, subprocess
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
DUR = 60.0
N = int(SR * DUR)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
AUD = os.path.join(ROOT, "public", "lastflight", "audio")
rng = np.random.default_rng(2024)

# ------------------------------------------------------------------ timeline (s)
T = dict(
    l1=1.15, flicker=4.0, powerdown=5.55, s2a=6.0, freeze=6.0 + 44 / 24, s2b=10.0, s3a=13.0, s3b=16.0, pole=17.4,
    s3c=18.5, s4a=22.0, s4b=26.0, l2=26.25, s4c=28.0, s4d=29.5, flyover=30.9, s4e=32.5, s4f=35.0, s5a=37.0,
    s5b=40.0, s5c=42.0, l3=42.15, s5d=44.0, s5e=46.0, grip=46.55, s5f=47.0, s6a=49.0, s6b=53.0, l4=53.0,
    title=56.0, subtitle=57.4, final=59.0, end=60.0)


# ------------------------------------------------------------------ primitives
def t_axis(d):
    return np.arange(int(round(d * SR))) / SR


def noise(d, color="white"):
    n = int(round(d * SR))
    w = rng.standard_normal(n)
    if color == "white":
        return w
    X = np.fft.rfft(w)
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = 1
    X /= np.sqrt(f) if color == "pink" else f
    y = np.fft.irfft(X, n)
    return y / (np.max(np.abs(y)) + 1e-9)


def _sos(kind, f, order):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def bp(x, lo, hi, order=4):
    return signal.sosfilt(_sos("band", [lo, hi], order), x)


def lp(x, fc, order=4):
    return signal.sosfilt(_sos("low", fc, order), x)


def hp(x, fc, order=4):
    return signal.sosfilt(_sos("high", fc, order), x)


def sweep_lp(x, f0, f1, steps=64):
    out = np.zeros_like(x)
    edges = np.linspace(0, len(x), steps + 1).astype(int)
    zi = None
    for i in range(steps):
        fc = min(f0 * (f1 / f0) ** (i / max(1, steps - 1)), SR / 2.2)
        sos = _sos("low", fc, 2)
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[edges[i]:edges[i + 1]], zi = signal.sosfilt(sos, x[edges[i]:edges[i + 1]], zi=zi)
    return out


def env_ad(d, a, decay):
    t = t_axis(d)
    return np.where(t < a, t / max(a, 1e-4), np.exp(-(t - a) / decay))


def fade_io(x, a=0.05, r=0.3):
    n = len(x)
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return x * e


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)


def reverb_ir(d=3.0, decay=1.2, bright=6000):
    t = t_axis(d)
    ir = lp(rng.standard_normal(len(t)) * np.exp(-t / decay), bright, 2)
    ir[0] = 1.0
    return ir / np.sqrt(np.sum(ir ** 2))


IR_BIG = reverb_ir(4.5, 1.6, 4500)
IR_CITY = reverb_ir(2.5, 0.7, 6000)


def verb(x, ir, wet=0.35):
    return x * (1 - wet) + signal.fftconvolve(x, ir)[: len(x)] * wet


def db(x):
    return 10 ** (x / 20)


class Track:
    def __init__(self):
        self.L = np.zeros(N + SR * 8)
        self.R = np.zeros(N + SR * 8)

    def add(self, x, at, gain=1.0, pan=0.0, width=0.0):
        s = int(round(at * SR))
        if s < 0:
            x, s = x[-s:], 0
        n = min(len(x), len(self.L) - s)
        if n <= 0:
            return
        gl = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2) * gain
        gr = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2) * gain
        self.L[s:s + n] += x[:n] * gl
        if width > 0:
            dly = int(width * 0.017 * SR)
            self.R[s:s + n] += np.concatenate([np.zeros(dly), x])[:n] * gr
        else:
            self.R[s:s + n] += x[:n] * gr

    def stereo(self):
        return np.stack([self.L[:N], self.R[:N]], axis=1)


# ------------------------------------------------------------------ helicopter
def rotor(d, bpf=19.3, rpm=None, slap=1.0, whine=0.25, tail=0.3, interior=False, seed=0):
    """Main-rotor blade slap + turbine whine + tail-rotor buzz. rpm(t) scales every rate (1 = nominal)."""
    r = np.random.default_rng(seed)
    t = t_axis(d)
    k = rpm(t) if rpm is not None else np.ones_like(t)
    ph = np.cumsum(bpf * k) / SR
    imp = np.zeros_like(t)
    idx = np.where(np.diff(np.floor(ph)) > 0)[0]
    imp[idx] = 1 + 0.18 * r.standard_normal(len(idx))
    g = t_axis(0.09)
    grain = np.sin(2 * np.pi * 62 * g) * np.exp(-g / 0.028) * 1.0
    burst = r.standard_normal(len(g)) * np.exp(-g / 0.010)
    grain += bp(burst, 250, 2600, 2) * 0.9 * slap
    x = signal.fftconvolve(imp, grain)[: len(t)]
    # broadband downwash, breathing with the blade passes
    bb = lp(r.standard_normal(len(t)), 3200, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * ph)) * 0.12
    # turbine whine (shaft tones with slow wobble)
    wob = 1 + 0.002 * np.sin(2 * np.pi * 0.3 * t)
    wh = sum(a * np.sin(2 * np.pi * np.cumsum(f * k * wob) / SR) for f, a in ((1180, 1), (2365, 0.5), (6900, 0.35)))
    # tail rotor: ~50 Hz buzz, rich in harmonics
    tr = bp(signal.sawtooth(2 * np.pi * np.cumsum(50.5 * k) / SR), 90, 900, 2)
    y = norm(x) + bb + wh * 0.05 * whine + tr * 0.12 * tail
    if interior:
        y = lp(y, 1500, 2) + bp(r.standard_normal(len(t)), 2000, 6000, 2) * 0.01   # muffled through the airframe
        rattle = bp(r.standard_normal(len(t)), 900, 3500, 2) * (np.sin(2 * np.pi * ph * 2) > 0.85) * 0.25
        y += rattle
    return norm(y)


def doppler(x, dist_fn, ref=20.0, max_gain=4.0):
    """Propagate a source signal to the listener: delay = r/c, gain = ref/r, air absorption."""
    t = np.arange(len(x)) / SR
    r = np.maximum(dist_fn(t), 1.0)
    src_t = t - r / 343.0
    y = np.interp(src_t, t, x, left=0.0, right=0.0)
    g = np.minimum(ref / r, max_gain)
    dull = lp(y, 1400, 2)
    w = np.clip((r - 30) / 250, 0, 1)                 # far -> duller
    return (y * (1 - w) + dull * w) * g


def alarm(d, kind="master"):
    t = t_axis(d)
    if kind == "master":                              # two-tone warble, 2 Hz
        f = np.where((t * 2) % 1 < 0.5, 980, 1310)
        gate = ((t * 4) % 1 < 0.78).astype(float)
    else:                                             # low-altitude: rapid beeps
        f = np.full_like(t, 2050)
        gate = ((t * 7) % 1 < 0.45).astype(float)
    x = signal.square(2 * np.pi * np.cumsum(f) / SR) * 0.6 + np.sin(2 * np.pi * np.cumsum(f) / SR)
    gate = lp(gate, 200, 2)
    return bp(x * gate, 400, 5000, 2) * 0.6


def winch(d):
    t = t_axis(d)
    f = 240 + 120 * np.minimum(1, t / 0.4)
    x = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in (1, 2, 3, 5))
    x *= 0.8 + 0.2 * np.sin(2 * np.pi * 31 * t)
    clack = debris_clatter(d, 12) * 0.25
    return norm(bp(x, 150, 4000, 2) + clack)


# ------------------------------------------------------------------ general sound design
def sub_boom(d=3.0, f0=55, f1=26, decay=0.9):
    t = t_axis(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.35)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / decay) + 0.4 * np.tanh(3 * np.sin(ph * 2)) * np.exp(-t / (decay * 0.4))
    return norm(x)


def crack(d=0.6, bright=9000):
    return hp(lp(noise(d) * env_ad(d, 0.002, 0.06), bright), 300) * 1.2


def impact(d=4.0, size=1.0, bright=6000):
    x = sub_boom(d, 60 * size ** -0.2, 24, 0.7 + 0.6 * size) * 0.9
    x[: int(0.6 * SR)] += crack(0.6, bright) * 0.6
    x += lp(noise(d, "brown"), 400) * env_ad(d, 0.005, 0.5 * size) * 0.8
    return verb(norm(x), IR_BIG, 0.3)


def metal_ring(d=3.0, base=97.0):
    t = t_axis(d)
    parts = [(1, 1), (2.76, 0.6), (5.4, 0.4), (8.93, 0.25), (13.3, 0.15)]
    x = sum(a * np.sin(2 * np.pi * base * m * t + m) * np.exp(-t / (d * 0.35 / m ** 0.3)) for m, a in parts)
    return norm(x)


def whoosh(d=0.9, f0=300, f1=5000, peak=0.6):
    t = t_axis(d)
    x = sweep_lp(noise(d, "pink"), f0, f1)
    e = np.where(t < d * peak, (t / (d * peak)) ** 2, np.exp(-(t - d * peak) / (d * 0.18)))
    return norm(x * e)


def riser(d=2.5, f0=200, f1=4000):
    t = t_axis(d)
    x = norm(sweep_lp(noise(d, "pink"), f0, f1)) * (t / d) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(80 * 8 ** (t / d)) / SR) * (t / d) ** 3 * 0.35
    return norm(x + tone)


def reverse_suck(d=1.8):
    return norm(impact(d, 1.4)[::-1] * np.linspace(0, 1, int(round(d * SR))) ** 2)


def grind_stop(d=1.6):
    t = t_axis(d)
    f = 700 * np.exp(-t * 2.6) + 45
    x = bp(signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5), 60, 3000)
    g = bp(noise(d), 120, 2000) * np.exp(-t / 0.4) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t))
    return norm(x * 0.6 + g * 0.5)


def wind(d, lo=150, hi=1400, gust=0.3, rate=0.27, howl=0.35):
    t = t_axis(d)
    x = bp(noise(d, "pink"), lo, hi)
    mod = 0.6 + gust * np.sin(2 * np.pi * rate * t) + gust * 0.7 * np.sin(2 * np.pi * rate * 2.3 * t + 1.3)
    hw = bp(noise(d), 480, 950) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.19 * t))
    return norm(x * mod + hw * howl)


def rumble(d, fc=90):
    return norm(lp(noise(d, "brown"), fc))


def debris_clatter(d, density=40, lo=(400, 1500), hi=(2500, 7000)):
    out = np.zeros(int(round(d * SR)))
    for _ in range(int(density * d)):
        s = int(rng.uniform(0, max(0.01, d - 0.2)) * SR)
        ln = int(rng.uniform(0.02, 0.12) * SR)
        c = rng.standard_normal(ln) * np.exp(-np.arange(ln) / (ln * 0.2))
        c = bp(c, rng.uniform(*lo), rng.uniform(*hi), 2)
        n = min(ln, len(out) - s)
        out[s:s + n] += c[:n] * rng.uniform(0.15, 1.0)
    return norm(out)


def glass(d=1.5, count=140):
    out = np.zeros(int(round(d * SR)))
    for _ in range(count):
        s = int(rng.uniform(0, d * 0.85) * SR)
        f = rng.uniform(2500, 9500)
        ln = int(rng.uniform(0.02, 0.15) * SR)
        tt = np.arange(ln) / SR
        n = min(ln, len(out) - s)
        out[s:s + n] += (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.03) * rng.uniform(0.2, 1))[:n]
    return norm(hp(out, 1500))


def metal_creak(d=1.5, f0=120, f1=70):
    t = t_axis(d)
    f = f0 + (f1 - f0) * t / d + 8 * np.sin(2 * np.pi * 5 * t)
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * t) ** 2)
    return norm(bp(x, 150, 2500) * np.sin(np.pi * t / d))


def crackle(d, rate=120):
    out = np.zeros(int(round(d * SR)))
    for _ in range(int(rate * d)):
        s = int(rng.uniform(0, d - 0.01) * SR)
        ln = int(rng.uniform(0.001, 0.006) * SR)
        out[s:s + ln] += rng.standard_normal(ln) * rng.uniform(0.1, 1)
    return hp(out, 1200)


def zap(d=0.25):
    t = t_axis(d)
    x = signal.square(2 * np.pi * np.cumsum(120 + 2000 * rng.random(len(t)) * (t < d * 0.6)) / SR)
    return norm(bp(x, 300, 6000, 2) * np.exp(-t / (d * 0.4)) + crackle(d, 400) * 0.6)


def footsteps(d, rate=2.9):
    out = np.zeros(int(round(d * SR)))
    for k in range(int(d * rate)):
        s = max(0, int((k / rate + rng.uniform(-0.015, 0.015)) * SR))
        b = sub_boom(0.18, 140, 70, 0.04) * 0.7 + bp(noise(0.18), 400, 3000, 2) * env_ad(0.18, 0.001, 0.02) * 0.5
        n = min(len(b), len(out) - s)
        if n > 0:
            out[s:s + n] += b[:n]
    return out


def heartbeat(d, bpm=72):
    out = np.zeros(int(round(d * SR)))
    per = 60 / bpm
    for k in range(int(d / per) + 1):
        for off, g in ((0, 1.0), (0.28, 0.6)):
            s = int((k * per + off) * SR)
            b = sub_boom(0.4, 70, 40, 0.09) * g
            n = min(len(b), len(out) - s)
            if n > 0:
                out[s:s + n] += b[:n]
    return out


def flutter(d, rate=17):
    t = t_axis(d)
    return norm(bp(noise(d), 200, 2500, 2) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * rate * t + 3 * np.sin(2 * np.pi * 0.7 * t)))))


def clasp():
    x = bp(noise(0.25), 300, 4000, 2) * env_ad(0.25, 0.002, 0.03)
    x += sub_boom(0.25, 120, 60, 0.05) * 0.6
    return verb(norm(x), IR_BIG, 0.45)


# ------------------------------------------------------------------ score (original, procedural, D minor)
def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def tone(fr, d, kind="saw", cutoff=1800, a=0.01, r=0.25):
    t = t_axis(d)
    if kind == "saw":
        x = sum(signal.sawtooth(2 * np.pi * fr * dt * t + dt) for dt in (0.996, 1.0, 1.005)) / 3
    elif kind == "piano":
        x = sum(np.sin(2 * np.pi * fr * h * t) * np.exp(-t * (1.2 + h * 0.8)) / h for h in (1, 2, 3, 4))
        return x * np.minimum(1, t / 0.004)
    else:
        x = np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(4 * np.pi * fr * t)
    e = np.minimum(1, t / max(a, 1e-3)) * np.where(t > d - r, np.maximum(0, (d - t) / max(r, 1e-3)), 1)
    return lp(x, cutoff, 2) * e


def pad(chord, d, cutoff=1400, a=None, r=None):
    a = d * 0.3 if a is None else a
    r = d * 0.35 if r is None else r
    return sum(tone(hz(m), d, "saw", cutoff, a, r) for m in chord) / len(chord)


def choir(chord, d, a=None, r=None):
    """'Ah' pad: saw stack through two vowel formants."""
    x = pad(chord, d, 5000, a, r)
    return norm(bp(x, 600, 850, 2) + 0.7 * bp(x, 1050, 1300, 2) + 0.15 * x)


def braam(d=4.0, root=26, bright=1.0):
    t = t_axis(d)
    x = sum(signal.sawtooth(2 * np.pi * hz(m) * dt * t) for m in (root, root + 12, root + 19, root + 24) for dt in (0.993, 1.0, 1.008))
    x = np.tanh(1.8 * x / 4)
    x = sweep_lp(x, 1800 * bright, 160, 48)
    x *= np.minimum(1, t / 0.03) * np.exp(-t / (d * 0.45))
    return norm(x + sub_boom(d, 50, 27, 1.2) * 0.8)


def drum(size=1.0):
    d = 1.2
    x = sub_boom(d, 95 * size ** -0.3, 45, 0.18 * size) + bp(noise(d), 120, 1800, 2) * env_ad(d, 0.001, 0.05) * 0.6
    return verb(norm(x), IR_CITY, 0.25)


def ostinato(d, bpm, roots, cutoff=2600, vol=1.0):
    """Driving 16th-note string figure; one root (midi) per bar of 4 beats."""
    step = 60 / bpm / 4
    figure = [0, 0, 3, 0, 7, 0, 5, 3, 0, 0, 3, 0, 7, 10, 7, 5]
    out = np.zeros(int(round(d * SR)) + SR)
    nsteps = int(d / step)
    for i in range(nsteps):
        bar = i // 16
        root = roots[bar % len(roots)]
        m = root + figure[i % 16]
        x = tone(hz(m), step * 0.9, "saw", cutoff, 0.004, step * 0.4)
        acc = 1.0 if i % 4 == 0 else 0.7
        s = int(i * step * SR)
        out[s:s + len(x)] += x * acc
    return out[: int(round(d * SR))] * vol


def drum_pattern(d, bpm, pattern, size=1.0):
    beat = 60 / bpm
    bar = beat * 4
    out = np.zeros(int(round(d * SR)) + 2 * SR)
    k = drum(size)
    kh = drum(size * 0.6) * 0.6
    nb = int(np.ceil(d / bar))
    for b in range(nb):
        for pos, g in pattern:
            s = int((b * bar + pos * beat) * SR)
            if s < int(d * SR):
                h = k if g >= 0.9 else kh
                out[s:s + len(h)] += h * g
    return out[: int(round(d * SR))]


def build_music():
    m = Track()
    # 0-6: cockpit tension: low D drone, high harmonic shimmer, ticking clock pulse
    m.add(verb(pad([38, 45], 6.2, 600, 1.5, 0.6), IR_BIG, 0.4), 0.0, 0.55, width=1)
    m.add(verb(tone(hz(86), 5.5, "sine", 6000, 2.5, 0.4), IR_BIG, 0.6), 0.2, 0.06, width=1)
    for k in range(10):
        m.add(tone(hz(81), 0.06, "sine", 8000, 0.002, 0.05), 0.5 + k * 0.5, 0.05, pan=0.3)
    # power cut: music chokes with the electrics
    # 6-7.8: reverse suck into the planet freeze
    m.add(reverse_suck(T["freeze"] - T["s2a"]), T["s2a"], 0.6, width=1)
    m.add(braam(5.0, 26, 1.0), T["freeze"], 1.0, width=1)
    m.add(verb(choir([50, 53, 57], 3.5, 0.05, 2.0), IR_BIG, 0.5), T["freeze"], 0.35, width=1)
    # 10-13: dust front: string tremolo swell
    trem = pad([50, 57, 62], 3.2, 2200, 2.5, 0.2) * (0.7 + 0.3 * np.sign(np.sin(2 * np.pi * 14 * t_axis(3.2))))
    m.add(trem, T["s2b"], 0.45, width=1)
    m.add(riser(3.0, 150, 3500), T["s2b"], 0.25, width=1)
    # 13-22: destruction: drums + ostinato at 120 bpm
    bpm = 120
    pat = [(0, 1.0), (0.75, 0.5), (1.5, 0.7), (2.0, 1.0), (2.75, 0.5), (3.0, 0.7), (3.5, 0.8)]
    m.add(braam(3.5, 26, 0.8), T["s3a"], 0.8, width=1)
    m.add(drum_pattern(9.0, bpm, pat, 1.0), T["s3a"], 0.75, width=1)
    m.add(ostinato(9.0, bpm, [38, 38, 34, 36], 2200, 0.5), T["s3a"], 0.45, width=1)
    m.add(braam(3.5, 29, 0.9), T["s3c"], 0.7, width=1)
    m.add(choir([50, 53, 57, 62], 3.5, 1.0, 0.5), T["s3c"], 0.25, width=1)
    m.add(riser(1.2, 300, 6000), T["s4a"] - 1.2, 0.3, width=1)
    # 22-37: the chase: faster, brass stabs on every cut
    bpm = 132
    pat2 = [(0, 1.0), (0.5, 0.5), (1.0, 0.7), (1.5, 0.5), (2.0, 1.0), (2.5, 0.5), (2.75, 0.6), (3.0, 0.8), (3.5, 0.7), (3.75, 0.6)]
    chase = T["s5a"] - T["s4a"]
    m.add(drum_pattern(chase, bpm, pat2, 1.1), T["s4a"], 0.8, width=1)
    m.add(ostinato(chase, bpm, [38, 41, 34, 36], 2800, 0.6), T["s4a"], 0.5, width=1)
    m.add(pad([26, 38, 45], chase, 500, 1.0, 1.0), T["s4a"], 0.35, width=1)
    for at, root in ((T["s4a"], 26), (T["s4b"], 29), (T["s4d"], 26), (T["s4e"], 22), (T["s4f"], 24)):
        m.add(braam(2.5, root, 0.9), at, 0.6, width=1)
    m.add(verb(choir([50, 53, 57, 62, 65], 4.5, 1.5, 1.5), IR_BIG, 0.5), T["s4e"], 0.35, width=1)
    # 37-46: rooftop: drums out, pulse + heartbeat, hope rising (Dm - Bb - F - C)
    m.add(heartbeat(9.0, 76), T["s5a"], 0.5)
    pulse = ostinato(9.0, 76, [38, 34, 41, 36], 900, 0.5)
    m.add(pulse, T["s5a"], 0.35, width=1)
    for k, ch in enumerate(([50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55])):
        m.add(pad(ch, 2.6, 1600, 0.8, 0.8), T["s5a"] + k * 2.25, 0.4, width=1)
    m.add(verb(choir([62, 65, 69], 3.0, 1.0, 1.0), IR_BIG, 0.5), T["s5c"], 0.35, width=1)
    # 46-47: slow-motion: one high note
    m.add(verb(tone(hz(86), 1.4, "sine", 8000, 0.05, 0.6), IR_BIG, 0.7), T["s5e"], 0.12, width=1)
    # 47-49: she's lifted: B-flat major swell
    m.add(braam(3.0, 22, 0.7), T["s5f"], 0.55, width=1)
    m.add(verb(choir([58, 62, 65, 70], 3.5, 0.3, 1.5), IR_BIG, 0.5), T["s5f"], 0.45, width=1)
    m.add(pad([46, 53, 58, 62], 3.0, 2400, 0.2, 1.2), T["s5f"], 0.45, width=1)
    # 49-53: silence, a lone piano and a breath of strings
    for k, (n_, at) in enumerate(((62, 0.3), (57, 1.1), (65, 1.9), (62, 2.7))):
        m.add(verb(tone(hz(n_), 2.5, "piano"), IR_BIG, 0.55), T["s6a"] + at, 0.22, pan=-0.2 + 0.13 * k)
    m.add(pad([50, 57], 4.5, 900, 1.5, 1.5), T["s6a"], 0.25, width=1)
    # 53-56: Earth from space: deep drone, then the build to the title
    m.add(pad([26, 33, 38], 3.4, 400, 1.0, 0.4), T["s6b"], 0.5, width=1)
    m.add(riser(2.2, 120, 3000), T["title"] - 2.2, 0.3, width=1)
    m.add(reverse_suck(0.9), T["title"] - 0.9, 0.5, width=1)
    # 56-60: title hit, subtitle hit, final impact
    m.add(braam(4.0, 26, 1.2), T["title"], 1.1, width=1)
    m.add(verb(choir([50, 53, 57, 62], 3.4, 0.05, 2.0), IR_BIG, 0.55), T["title"], 0.35, width=1)
    m.add(braam(2.0, 29, 0.6), T["subtitle"], 0.45, width=1)
    m.add(braam(1.0, 26, 1.3), T["final"], 1.0, width=1)
    return m


def build_sfx():
    s = Track()
    # ---- 0-6 cockpit: interior rotor, master warning, flicker, power dies
    d1 = T["powerdown"] + 0.6
    rpm1 = lambda t: np.where(t < T["powerdown"], 1.0, np.maximum(0.25, 1 - (t - T["powerdown"]) * 1.4))
    s.add(fade_io(rotor(d1, rpm=rpm1, interior=True, seed=1), 0.6, 0.4), 0.0, 0.55, width=1)
    s.add(verb(tone(1320, 0.5, "sine", 8000, 0.003, 0.4), IR_CITY, 0.3), 0.35, 0.12, pan=0.25)      # soft caution chime
    s.add(fade_io(alarm(T["powerdown"] - 3.55, "master"), 0.01, 0.02), 3.55, 0.2, pan=0.25)       # master warning, after his call
    s.add(fade_io(bp(noise(0.12), 800, 4000) * 0.5, 0.0, 0.05), T["l1"] - 0.12, 0.3)          # push-to-talk click
    for at in (4.05, 4.4, 4.62, 5.05, 5.3):
        s.add(zap(rng.uniform(0.12, 0.3)), at, 0.35, pan=rng.uniform(-0.5, 0.5))
    s.add(sub_boom(1.0, 90, 30, 0.2), T["powerdown"], 0.6)                                     # electrical thunk
    s.add(metal_creak(0.6, 400, 120), T["powerdown"] + 0.05, 0.15)
    # ---- 6-10 the planet stops
    s.add(rumble(T["freeze"] - T["s2a"] + 0.2, 60) * np.linspace(0, 1, int(round((T["freeze"] - T["s2a"] + 0.2) * SR))) ** 2, T["s2a"], 0.6, width=1)
    s.add(grind_stop(1.8), T["freeze"] - 0.1, 0.7, width=1)
    s.add(impact(5.0, 2.2, 3000), T["freeze"], 1.0, width=1)
    s.add(rumble(4.0, 70) * np.exp(-t_axis(4.0) / 1.6), T["freeze"] + 0.5, 0.5, width=1)
    # ---- 10-13 dust front approaching
    dd = T["s3a"] - T["s2b"]
    s.add(rumble(dd + 0.5, 110) * np.linspace(0.3, 1, int(round((dd + 0.5) * SR))), T["s2b"], 0.6, width=1)
    s.add(wind(dd + 0.5, 100, 900) * np.linspace(0.2, 1, int(round((dd + 0.5) * SR))), T["s2b"], 0.4, width=1)
    # ---- 13-22 the street tears apart
    st = T["s4a"] - T["s3a"]
    s.add(whoosh(0.5, 400, 6000, 0.8), T["s3a"] - 0.4, 0.35, width=1)
    s.add(fade_io(wind(st, 120, 2200, 0.4, 0.4, 0.5), 0.1, 0.5), T["s3a"], 0.65, width=1)
    s.add(footsteps(3.0, 3.2), T["s3a"], 0.35)
    s.add(debris_clatter(st, 22), T["s3a"], 0.35, width=1)
    s.add(metal_creak(1.4, 260, 140), T["s3a"] + 1.2, 0.3, pan=0.5)                            # sign ripping
    s.add(glass(2.4, 220), T["s3b"] + 0.15, 0.45, width=1)
    s.add(metal_creak(1.1, 180, 80), T["pole"] - 1.0, 0.35, pan=-0.3)                           # street light tips
    s.add(impact(2.0, 0.7, 7000), T["pole"], 0.6, pan=-0.2)
    s.add(metal_ring(2.0, 140), T["pole"], 0.18, pan=-0.2)
    for k, at in enumerate((T["s3c"] + 0.3, T["s3c"] + 1.6, T["s3c"] + 2.7)):                    # distant explosions
        s.add(verb(impact(3.0, 1.3, 2500), IR_BIG, 0.5) * 0.8, at, 0.5 - 0.1 * k, pan=(-0.6, 0.5, -0.2)[k], width=1)
    s.add(metal_creak(2.5, 70, 45), T["s3c"] + 0.8, 0.35, width=1)                              # a tower groans
    s.add(crackle(st - 5, 90), T["s3c"], 0.12, width=1)
    # ---- 22-26 whip pan into the chase: exterior rotor, close pass
    s.add(whoosh(0.7, 300, 8000, 0.75), T["s4a"] - 0.55, 0.7, width=1)
    c4 = T["s4b"] - T["s4a"] + 0.2
    ext = rotor(c4 + 0.5, seed=3, slap=1.3)
    s.add(doppler(ext, lambda t: np.hypot(28, (t - 2.2) * 70.0), ref=25)[: int(c4 * SR)], T["s4a"], 0.65, width=1)
    s.add(wind(c4, 200, 2500, 0.3, 0.5, 0.2), T["s4a"], 0.3, width=1)
    # ---- 26-29.5 cockpit: turbulence, low-altitude alarm, stick shudder
    c5 = T["s4d"] - T["s4b"]
    s.add(fade_io(rotor(c5, interior=True, seed=4, rpm=lambda t: 1 + 0.03 * np.sin(2 * np.pi * 0.8 * t)), 0.05, 0.1), T["s4b"], 0.6, width=1)
    s.add(fade_io(alarm(c5 - 0.1, "altitude"), 0.01, 0.05), T["s4b"] + 0.05, 0.16, pan=0.3)
    s.add(debris_clatter(c5, 30, (800, 2000), (3000, 7000)), T["s4b"], 0.25, width=1)           # airframe rattles
    for at in (T["s4b"] + 0.4, T["s4b"] + 1.3, T["s4c"] + 0.2):
        s.add(sub_boom(0.7, 70, 35, 0.15), at, 0.5)                                              # turbulence jolts
    s.add(metal_creak(1.3, 160, 110), T["s4c"] + 0.1, 0.3)
    # ---- 29.5-32.5 the helicopter roars overhead (closest approach at T["flyover"])
    c6 = T["s4e"] - T["s4d"] + 0.4
    s.add(doppler(rotor(c6 + 0.6, seed=5, slap=1.4), lambda t: np.hypot(18, (t - (T["flyover"] - T["s4d"])) * 62.0), ref=18)[: int(c6 * SR)],
          T["s4d"], 0.8, width=1)
    s.add(wind(c6, 150, 1600), T["s4d"], 0.35, width=1)
    s.add(debris_clatter(c6, 12), T["s4d"], 0.2, width=1)
    # ---- 32.5-35 wide: distant helicopters across a dying city
    c7 = T["s4f"] - T["s4e"]
    s.add(doppler(rotor(c7 + 1.5, seed=6), lambda t: np.full_like(t, 260.0), ref=30), T["s4e"] - 0.75, 0.9, width=1)
    s.add(doppler(rotor(c7 + 3.0, bpf=21, seed=7), lambda t: np.full_like(t, 900.0), ref=30), T["s4e"] - 2.6, 0.9, pan=0.6)
    s.add(wind(c7, 100, 1000, 0.3), T["s4e"], 0.45, width=1)
    s.add(verb(impact(3.0, 1.5, 2000), IR_BIG, 0.6), T["s4e"] + 1.1, 0.25, pan=-0.5)
    # ---- 35-37 side profile: blades scything dust
    c8 = T["s5a"] - T["s4f"]
    s.add(fade_io(rotor(c8, seed=8, slap=1.6), 0.02, 0.2), T["s4f"], 0.75, width=1)
    s.add(wind(c8, 300, 3000, 0.4, 0.8, 0.1), T["s4f"], 0.3, width=1)
    # ---- 37-46 the rooftop: gale + hovering helicopter overhead
    roof = T["s5e"] - T["s5a"]
    hover = rotor(roof + 0.5, seed=9, slap=1.2)
    s.add(doppler(hover, lambda t: np.maximum(16, 60 - t * 25), ref=16), T["s5a"], 0.55, width=1)
    s.add(fade_io(lp(noise(roof, "pink"), 900), 1.5, 0.3), T["s5a"], 0.25, width=1)              # downwash roar
    s.add(wind(roof, 150, 2400, 0.45, 0.5, 0.45), T["s5a"], 0.6, width=1)
    s.add(debris_clatter(roof, 10, (600, 1500), (2500, 6000)), T["s5a"], 0.18, width=1)
    s.add(winch(2.2), T["s5b"] + 0.1, 0.35, pan=0.15)
    s.add(fade_io(rotor(2.0, interior=True, seed=10), 0.1, 0.1), T["s5c"], 0.25)                  # cockpit cut
    s.add(flutter(2.0, 19), T["s5d"], 0.3, pan=-0.2)
    # ---- 46-47 slow motion: the grab
    s.add(clasp(), T["grip"], 0.8)
    s.add(fade_io(lp(wind(1.5, 100, 900, 0.2, 0.3, 0.1), 260, 2), 0.1, 0.25), T["s5e"] - 0.1, 0.5, width=1)   # muffled gale bed
    s.add(heartbeat(1.2, 60), T["s5e"], 0.6)
    # ---- 47-49 lifted
    s.add(winch(2.0), T["s5f"], 0.35)
    s.add(fade_io(rotor(2.5, seed=11, slap=1.5, rpm=lambda t: 1 + 0.06 * np.minimum(1, t)), 0.05, 0.5), T["s5f"], 0.75, width=1)
    s.add(whoosh(1.5, 200, 4000, 0.5), T["s5f"] + 0.2, 0.4, width=1)
    s.add(wind(2.2, 150, 2000), T["s5f"], 0.35, width=1)
    # ---- 49-53 the helicopter leaves; near silence
    c9 = T["s6b"] - T["s6a"]
    s.add(fade_io(doppler(rotor(c9 + 2, seed=12), lambda t: 60 + t * 110, ref=30), 0.2, 1.5)[: int(c9 * SR)], T["s6a"], 0.7, width=1)
    s.add(fade_io(wind(c9, 100, 800, 0.2, 0.2, 0.2), 0.3, 1.5), T["s6a"], 0.18, width=1)
    # ---- 53-56 space: silence (no air). Radio only.
    # ---- titles
    s.add(impact(4.0, 2.4, 3500), T["title"], 1.0, width=1)
    s.add(metal_ring(3.5, 73), T["title"], 0.25, width=1)
    s.add(impact(2.5, 1.0, 5000), T["subtitle"], 0.35, width=1)
    s.add(impact(1.0, 2.8, 3000), T["final"], 1.0, width=1)
    return s


def envelope_follow(x, att=0.01, rel=0.25):
    a = np.convolve(np.abs(x), np.ones(int(0.02 * SR)) / int(0.02 * SR), mode="same")
    ka, kr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    return np.maximum(signal.lfilter([1 - kr], [1, -kr], a), signal.lfilter([1 - ka], [1, -ka], a))


def slowmo_filter(x, t0, t1, fc=380, ramp=0.12):
    """Muffle a stereo stem between t0 and t1 (the slow-motion grab)."""
    w = np.zeros(len(x))
    t = np.arange(len(x)) / SR
    w = np.clip(np.minimum((t - t0) / ramp, (t1 - t) / ramp), 0, 1)
    dull = np.stack([lp(x[:, 0], fc, 2), lp(x[:, 1], fc, 2)], axis=1)
    return x * (1 - w[:, None]) + dull * w[:, None]


def main():
    dlg, sr = sf.read(os.path.join(AUD, "dialogue.wav"))
    assert sr == SR
    dlg = np.pad(dlg, (0, max(0, N - len(dlg))))[:N]
    music = build_music().stereo()
    sfx = build_sfx().stereo()
    # hard cut of everything at the power failure (the score is choked with the electrics, 5.55-6.0 s)
    t = np.arange(N) / SR
    gate = np.clip(1 - (t - T["powerdown"] - 0.25) / 0.2, 0, 1) + np.clip((t - T["s2a"]) / 0.05, 0, 1)
    gate = np.where(t < T["powerdown"], 1.0, np.clip(gate, 0, 1))
    music *= gate[:, None]
    sfx = slowmo_filter(sfx, T["s5e"], T["s5f"], 380)
    music = slowmo_filter(music, T["s5e"], T["s5f"], 1200)
    # sidechain ducking under the dialogue
    env = envelope_follow(dlg, 0.012, 0.4)
    env = np.clip(env / (np.max(env) + 1e-9) * 5, 0, 1)
    music *= (1 - (1 - db(-10)) * env)[:, None]
    sfx *= (1 - (1 - db(-12)) * env)[:, None]
    music /= np.max(np.abs(music)) + 1e-9
    sfx /= np.max(np.abs(sfx)) + 1e-9
    voice = np.stack([dlg, dlg], axis=1) / (np.max(np.abs(dlg)) + 1e-9)
    mix = voice * db(-3) + music * db(-10) + sfx * db(-7)
    # final cut to black: tail of the last impact decays, then silence
    fade = np.clip((DUR - 0.05 - t) / 0.6, 0, 1)
    mix *= fade[:, None]
    os.makedirs(AUD, exist_ok=True)
    sf.write(os.path.join(AUD, "music.wav"), music * db(-6), SR)
    sf.write(os.path.join(AUD, "sfx.wav"), sfx * db(-6), SR)
    raw = os.path.join(AUD, "mix_raw.wav")
    sf.write(raw, norm(mix) * 0.7, SR)
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    out = os.path.join(AUD, "final_mix.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", af, "-ar", str(SR), "-t", str(DUR), out], check=True)
    os.remove(raw)
    print("wrote", out)


if __name__ == "__main__":
    main()
