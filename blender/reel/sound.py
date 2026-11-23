"""
Original sound design for the reel, synthesised from scratch with numpy (no samples, nothing to license).

  * airport room tone, crowd murmur, distant PA chime, footsteps synced to the walk cycles
  * a quiet documentary music bed (A minor: Am - F - Dm - E, resolving to A major at the end)
  * electromagnetic layer: transmitter hum + a soft tick on every pulse, energy swells, eddy-current crackle
  * whooshes on camera moves, low impacts on key cuts, a distinctive two-tone detector alarm synced to the red light
  * everything except the voice is ducked under the narration (sidechain from narration.wav)

    python sound.py --narration build/narration.wav --out build/mix.wav
"""
import argparse, json, math, os, sys, wave
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cuts import FPS, END, CUT, PULSE, ALARM, BLINK, WALKS, LABELS, METER

SR = 48000
C = CUT
T = END / FPS
N = int((T + 0.6) * SR)
rng = np.random.default_rng(23)
BUS = {k: np.zeros((N, 2)) for k in ("amb", "music", "sfx", "long")}   # "long" = beds/swells (ducked harder)


def fs(f):
    return f / FPS


def db(x):
    return 10 ** (x / 20)


def tt(n):
    return np.arange(n) / SR


def place(bus, sig, t0, gain_db=0.0, pan=0.0):
    i0 = int(round(t0 * SR))
    if sig.ndim == 1:
        a = (pan + 1) * math.pi / 4
        sig = np.stack([sig * math.cos(a), sig * math.sin(a)], 1) * math.sqrt(2)
    if i0 < 0:
        sig, i0 = sig[-i0:], 0
    n = min(len(sig), N - i0)
    if n > 0:
        BUS[bus][i0:i0 + n] += sig[:n] * db(gain_db)


def spectral(n, resp, seed=None):
    """Noise of length n shaped by resp(freq_hz) -> gain, normalised to RMS 1."""
    g = np.random.default_rng(seed) if seed is not None else rng
    X = np.fft.rfft(g.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    y = np.fft.irfft(X * resp(np.maximum(f, 1.0)), n)
    return y / (np.sqrt(np.mean(y ** 2)) + 1e-9)


def band(fc, bw_oct):
    return lambda f: np.exp(-0.5 * (np.log2(f / fc) / bw_oct) ** 2)


def lowpass(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order))


def env(n, a, r, shape=1.0):
    """Attack a seconds, exponential-ish release over the rest."""
    t = tt(n); a = max(a, 1e-4)
    e = np.minimum(1, t / a)
    tail = np.clip((t - a) / max(n / SR - a, 1e-4), 0, 1)
    return e * (1 - tail) ** shape


def fade(sig, fin=0.005, fout=0.01):
    n = len(sig); e = np.ones(n)
    i, o = int(fin * SR), int(fout * SR)
    if i: e[:i] = np.linspace(0, 1, i)
    if o: e[-o:] = np.minimum(e[-o:], np.linspace(1, 0, o))
    return sig * (e if sig.ndim == 1 else e[:, None])


def reverb(sig, rt=1.4, wet=0.35, seed=5):
    n = int(rt * SR)
    ir = np.random.default_rng(seed).standard_normal((n, 2)) * np.exp(-6.9 * tt(n) / rt)[:, None]
    ir[:, 0] = np.fft.irfft(np.fft.rfft(ir[:, 0]) * lowpass(5000)(np.maximum(np.fft.rfftfreq(n, 1 / SR), 1)), n)
    ir[:, 1] = np.fft.irfft(np.fft.rfft(ir[:, 1]) * lowpass(5000)(np.maximum(np.fft.rfftfreq(n, 1 / SR), 1)), n)
    ir /= np.sqrt(np.sum(ir ** 2, 0)) + 1e-9
    mono = sig if sig.ndim == 1 else sig.mean(1)
    L = len(mono) + n
    out = np.stack([np.fft.irfft(np.fft.rfft(mono, L) * np.fft.rfft(ir[:, c], L), L) for c in (0, 1)], 1)
    dry = np.zeros((L, 2)); dry[:len(mono)] = (mono[:, None] if sig.ndim == 1 else sig)
    return dry * (1 - wet) + out * wet


def sweep_noise(dur, f0, f1, bw=0.6, seed=None):
    """Noise through a band-pass whose centre glides f0 -> f1 (overlap-add of short filtered grains)."""
    n = int(dur * SR); hop = 1024; win = np.hanning(hop * 2)
    src = (np.random.default_rng(seed) if seed is not None else rng).standard_normal(n + hop * 2)
    out = np.zeros(n + hop * 2)
    frq = np.fft.rfftfreq(hop * 2, 1 / SR); frq = np.maximum(frq, 1)
    for k, i in enumerate(range(0, n, hop)):
        fc = f0 * (f1 / f0) ** (i / max(n - 1, 1))
        seg = src[i:i + hop * 2] * win
        out[i:i + hop * 2] += np.fft.irfft(np.fft.rfft(seg) * band(fc, bw)(frq), hop * 2) * win
    out = out[:n]
    return out / (np.max(np.abs(out)) + 1e-9)


def tone(freqs_amps, dur, decay=None):
    t = tt(int(dur * SR)); y = np.zeros_like(t)
    for f, a in freqs_amps:
        y += a * np.sin(2 * np.pi * f * t)
    if decay:
        y *= np.exp(-t / decay)
    return y


# --------------------------------------------------------------------------- #
# Building blocks
def whoosh(dur, f0=300, f1=3000, peak=0.7):
    s = sweep_noise(dur, f0, f1, 0.7)
    t = tt(len(s)) / dur
    return s * np.where(t < peak, (t / peak) ** 2, ((1 - t) / (1 - peak)) ** 1.5)


def impact(size=1.0, metal=False):
    d = 1.6 * size; t = tt(int(d * SR))
    f = 38 + 34 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.45 * size))
    click = spectral(len(t), lowpass(900, 2), 3) * np.exp(-t / 0.03) * 0.5
    y = sub + click
    if metal:
        y += tone([(182, 0.3), (433, 0.22), (778, 0.15), (1210, 0.08)], d, 0.35)
    return reverb(fade(y, 0.001, 0.2), 1.8, 0.25)


def chime():
    def bell(f):
        return tone([(f, 1.0), (2.0 * f, 0.35), (3.01 * f, 0.15), (4.2 * f, 0.07)], 1.6, 0.55)
    y = np.zeros(int(2.4 * SR))
    for k, f in enumerate((659.3, 523.3)):
        b = bell(f); i = int(k * 0.42 * SR); y[i:i + len(b)] += b
    return reverb(fade(y, 0.002, 0.3), 2.2, 0.5)


def footstep(heavy=1.0):
    d = 0.18; t = tt(int(d * SR))
    thump = np.sin(2 * np.pi * (70 + 40 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.035)
    heel = spectral(len(t), band(2600, 0.8), None) * np.exp(-t / 0.012) * 0.35
    return fade((thump * heavy + heel) * 0.8, 0.001, 0.02)


def beep(f=1850, dur=0.13):
    t = tt(int(dur * SR))
    y = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 3 * f * t) + 0.12 * np.sin(2 * np.pi * 5 * f * t)
    y *= 1 + 0.15 * np.sin(2 * np.pi * 32 * t)       # slight warble = "detector" character
    return fade(y * 0.6, 0.004, 0.02)


def tick(f=1400, dur=0.05, body=140):
    t = tt(int(dur * SR))
    return fade(0.5 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + 0.6 * np.sin(2 * np.pi * body * t) * np.exp(-t / 0.02), 0.0005, 0.005)


def blip(f=2200, dur=0.06):
    t = tt(int(dur * SR))
    return fade(np.sin(2 * np.pi * f * t) * np.exp(-t / 0.018) * 0.6, 0.001, 0.01)


def swell(dur, freqs, bright=False):
    t = tt(int(dur * SR))
    y = np.zeros_like(t)
    for i, f in enumerate(freqs):
        y += np.sin(2 * np.pi * f * t + i) * (1 + 0.3 * np.sin(2 * np.pi * (3 + i) * t))
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    y = y / len(freqs) * e
    if bright:
        y += sweep_noise(dur, 800, 5000, 0.5) * e * 0.25
    return fade(y, 0.05, 0.1)


# --------------------------------------------------------------------------- #
# 1) Ambience: room tone + murmur, level follows the shots (quieter in the physics and macro shots)
def amb_level(f):
    pts = [(0, 1.0), (C["S9"], 0.45), (C["S10"], 0.9), (C["S12"], 0.55), (C["S14"], 0.85), (C["S16"], 0.5),
           (C["S17"], 0.3), (C["S19"], 0.8), (C["S23"], 0.4), (C["S24"], 1.0)]
    v = pts[0][1]
    for a, b in pts:
        if f >= a: v = b
    return v
lv = np.array([amb_level(f) for f in range(END + 30)])
kern = np.ones(12) / 12
lv = np.convolve(np.pad(lv, (6, 5), mode="edge"), kern, mode="valid")
gain_curve = np.interp(np.arange(N) / SR * FPS, np.arange(len(lv)), lv)
room = np.stack([spectral(N, lambda f: (f / 100) ** -0.5 * lowpass(1800)(f), 1 + c) for c in (0, 1)], 1)
murmur = np.stack([spectral(N, band(600, 0.9), 11 + c) for c in (0, 1)], 1)
lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.37 * tt(N)[:, None] + np.array([[0, 1.3]])) * np.sin(2 * np.pi * 0.11 * tt(N))[:, None]
hum = (np.sin(2 * np.pi * 100 * tt(N)) * 0.4 + np.sin(2 * np.pi * 200 * tt(N)) * 0.15)[:, None]
BUS["amb"] += (room * db(-33) + murmur * lfo * db(-37) + hum * db(-52)) * gain_curve[:, None]
place("amb", chime(), 0.05, -21, -0.2)
place("amb", chime(), fs(C["S24"]) + 0.2, -30, 0.3)     # another, distant, later

# footsteps synced to the walk cycles (two steps per stride)
for f0, f1, cad in WALKS:
    near = f0 == 0
    k = 0
    while True:
        t = fs(f0) + 0.12 + k / cad
        if t > fs(f1) - 0.05: break
        place("sfx", footstep(1.2 if near else 0.8), t, -17 if near else -24, -0.15 if k % 2 else 0.15)
        k += 1

# --------------------------------------------------------------------------- #
# 2) Hook
place("sfx", whoosh(0.55, 400, 4500, 0.85), fs(26) - 0.5, -14)
place("sfx", impact(1.0), fs(26), -9)
place("long", swell(0.9, [2400, 3100, 3700, 4400]), fs(26), -27)        # X-ray shimmer
place("sfx", whoosh(0.28, 2600, 300, 0.4), fs(C["H2"]) - 0.2, -12)      # whip pan
place("sfx", impact(1.3, metal=True), fs(C["H2"]), -6)

# alarm beeps synced with the red light; very loud only where the story calls for it
for a, b in ALARM:
    for i, f in enumerate(range(a, b, BLINK)):
        g = -15
        if a == 137: g = -21
        if a == C["S20"]: g = -16 if f < C["S21"] else -26
        if a == C["S28"]: g = -26 - 6 * (f - a) / (b - a)
        if a == 36 and f >= 84: g = -24
        place("sfx", reverb(beep(1850 if i % 2 == 0 else 1450), 1.0, 0.25), fs(f), g, 0.1)

# --------------------------------------------------------------------------- #
# 3) Transitions + story hits
place("sfx", whoosh(0.8, 250, 2600, 0.9), fs(C["S7"]), -14)
place("sfx", impact(0.8), fs(C["S8"]), -15)
place("sfx", whoosh(0.6, 500, 1800, 0.6), fs(C["S11"]) - 0.1, -24)
place("sfx", whoosh(0.5, 300, 2200, 0.5), fs(C["S12"] + 24), -20)       # fast arc past the gate
place("sfx", whoosh(1.2, 300, 3500, 0.92), fs(C["S16"]), -15)           # dive into the pocket
place("sfx", impact(0.7, metal=True), fs(C["S17"]), -14)                # match cut to the macro
place("sfx", impact(1.2), fs(C["S20"]), -10)                              # ALARM
place("long", swell(2.0, [220, 277.2, 329.6, 440]), fs(C["S28"]), -24)  # resolve
place("sfx", whoosh(0.9, 600, 3000, 0.7), fs(C["S28"]) + 0.1, -24)

# --------------------------------------------------------------------------- #
# 4) Electromagnetic layer
n0, n1 = int(fs(C["S12"]) * SR), int(fs(C["S22"]) * SR)
tl = tt(n1 - n0)
emhum = (np.sin(2 * np.pi * 60 * tl) * 0.6 + np.sin(2 * np.pi * 120 * tl) * 0.3 + np.sin(2 * np.pi * 180 * tl) * 0.12)
emhum *= np.minimum(1, tl / 0.6) * np.minimum(1, (tl[-1] - tl) / 0.4)
place("long", emhum, fs(C["S12"]), -33)
for f in range(C["S12"] + 10, C["S22"], PULSE):          # one soft tick per transmitter pulse
    macro = C["S17"] <= f < C["S19"]
    place("sfx", tick(1300, 0.06, 150), fs(f), -27 if not macro else -31, -0.3)
place("long", swell(1.8, [180, 270, 405, 607], bright=True), fs(C["S13"]), -20)    # field builds
place("long", swell(1.4, [300, 450, 675]), fs(C["S15"] + 30), -25)                 # field bends
# eddy currents: crackling energy that surges with every pulse, slowly circling L-R
n0, n1 = int(fs(C["S17"] + 20) * SR), int(fs(C["S19"]) * SR)
cr = spectral(n1 - n0, band(3200, 0.7), 41)
cr *= (np.abs(rng.standard_normal(n1 - n0)) > 1.6) * 0.6 + 0.4
surge = np.zeros(n1 - n0)
for f in range(C["S12"] + 10, C["S19"], PULSE):
    i = int((fs(f) - fs(C["S17"] + 20)) * SR)
    seg = np.exp(-tt(int(0.6 * SR)) / 0.18) * np.minimum(1, tt(int(0.6 * SR)) / 0.03)
    a, b = max(i, 0), min(i + len(seg), n1 - n0)
    if b > a: surge[a:b] += seg[a - i:b - i]
cr *= np.minimum(surge, 1.2) * np.minimum(1, tt(n1 - n0) / 0.8)
pan = np.sin(2 * np.pi * 0.6 * tt(n1 - n0))
place("long", np.stack([cr * np.cos((pan + 1) * np.pi / 4), cr * np.sin((pan + 1) * np.pi / 4)], 1) * 1.4,
      fs(C["S17"] + 20), -26)
place("long", swell(1.0, [523, 784, 1046, 1568]), fs(C["S18"]), -21)               # secondary field blooms
t_rx = tt(int(0.62 * SR)); fq = 500 + 1100 * (t_rx / t_rx[-1]) ** 1.5
place("long", np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.sin(np.pi * t_rx / t_rx[-1]) * (1 + 0.4 * np.sin(2 * np.pi * 18 * t_rx)),
      fs(C["S19"]), -26)                                                          # receiver locks on
for f in range(C["S19"] + 6, C["S21"] + 40, 14):
    place("sfx", blip(2300, 0.05), fs(f), -30, 0.3)

# screen / UI
place("sfx", blip(1800), fs(C["S8"] + 30), -27)
place("sfx", blip(1600), fs(C["S10"]), -27)
for i in range(7):
    place("sfx", blip(1200 + i * 140, 0.05), fs(C["S21"] + i * 6), -29)
for a, b, item, lvl in METER:
    for i in range(lvl):
        place("sfx", blip(1100 + i * 120, 0.04), fs(a) + i * 0.025, -31)
t_g = tt(int(1.1 * SR)); fq = 300 + 600 * t_g / t_g[-1]
place("long", np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.sin(np.pi * t_g / t_g[-1]) ** 2, fs(C["S23"] + 12), -29)
place("sfx", tick(2400, 0.04, 300), fs(C["S23"] + 45), -24)
for lab in LABELS:
    place("sfx", blip(2900, 0.035), fs(lab[0]), -33, 0.2)

# --------------------------------------------------------------------------- #
# 5) Music bed: A minor, 96 bpm, enters after the hook. Builds through the physics, drops at the alarm,
#    resolves to A major under the conclusion.
BPM = 96; beat = 60 / BPM; bar = 4 * beat
PROG = [("Am", [220.0, 261.6, 329.6]), ("F", [174.6, 220.0, 261.6]), ("Dm", [146.8, 174.6, 220.0]),
        ("E", [164.8, 207.7, 246.9])]
AMAJ = [220.0, 277.2, 329.6]
t0_music = fs(C["S1"]) - 0.15


def saw(f, t, nh=9):
    return sum(np.sin(2 * np.pi * f * k * t) / k * math.exp(-k / 3.5) for k in range(1, nh + 1))


def intensity(t):
    f = t * FPS
    if f < C["S1"]: return 0.0
    if f < C["S8"]: return 0.55
    if f < C["S13"]: return 0.7
    if f < C["S20"]: return 1.0
    if f < C["S21"]: return 0.35
    if f < C["S28"]: return 0.85
    return 0.7
music = np.zeros((N, 2))
seg = 2 * bar
t_abs = tt(N)
k = 0
t = t0_music
while t < T + 0.5:
    end_chord = (t + seg) * FPS >= C["S28"] + 10
    name, notes = ("A", AMAJ) if t * FPS >= C["S28"] - 20 else PROG[k % len(PROG)]
    n = int((seg + 0.8) * SR); tl = tt(n)
    e = np.minimum(1, tl / 0.9) * np.clip((seg + 0.8 - tl) / 0.8, 0, 1)
    if t * FPS >= C["S28"] - 20:
        n = int((T + 0.6 - t) * SR); tl = tt(n)
        e = np.minimum(1, tl / 0.9) * np.clip((T + 0.4 - t - tl) / 1.5, 0, 1)
    pad = np.zeros((n, 2))
    for j, f in enumerate(notes):
        for c, det in enumerate((-0.0025, 0.0025)):
            pad[:, c] += saw(f * (1 + det), tl + j * 0.01) * 0.33
    pad[:, 0] += saw(notes[0] / 2, tl) * 0.25; pad[:, 1] += saw(notes[0] / 2 * 1.002, tl) * 0.25
    i0 = int(t * SR); m = min(n, N - i0)
    music[i0:i0 + m] += (pad * e[:, None])[:m]
    if t * FPS >= C["S28"] - 20:
        break
    t += seg; k += 1
music *= db(-25)
# sub drone
drone = (np.sin(2 * np.pi * 55 * t_abs) + 0.4 * np.sin(2 * np.pi * 110 * t_abs)) * db(-31)
music += drone[:, None] * (t_abs > t0_music)[:, None]
# heartbeat kick on beats 1 and 3, and soft 8th-note ticks + a plucked arp in the physics section
kick = impact(0.35)[:int(0.5 * SR)] * 0.6
pluck_t = tt(int(0.35 * SR))
nb = 0
t = t0_music
while t < T:
    f = t * FPS
    I = intensity(t)
    if I > 0 and nb % 2 == 0 and f < C["S28"] + 30:
        i0 = int(t * SR); m = min(len(kick), N - i0)
        music[i0:i0 + m] += kick[:m] * db(-24) * I
    if C["S11"] <= f < C["S20"] or C["S21"] <= f < C["S28"]:
        for h in range(2):
            th = t + h * beat / 2
            hh = spectral(int(0.04 * SR), band(8000, 0.5), int(th * 100)) * np.exp(-tt(int(0.04 * SR)) / 0.01)
            i0 = int(th * SR); m = min(len(hh), N - i0)
            music[i0:i0 + m] += (hh * db(-38))[:m, None]
    if C["S13"] <= f < C["S20"]:
        chord = PROG[int((t - t0_music) // seg) % len(PROG)][1]
        for h in range(4):
            th = t + h * beat / 4
            fq = chord[(nb * 4 + h) % 3] * 2
            p = np.sin(2 * np.pi * fq * pluck_t) * np.exp(-pluck_t / 0.09) + 0.3 * np.sin(4 * np.pi * fq * pluck_t) * np.exp(-pluck_t / 0.04)
            i0 = int(th * SR); m = min(len(p), N - i0)
            pan = 0.35 if h % 2 else -0.35
            music[i0:i0 + m, 0] += p[:m] * db(-33) * math.cos((pan + 1) * math.pi / 4) * 1.4
            music[i0:i0 + m, 1] += p[:m] * db(-33) * math.sin((pan + 1) * math.pi / 4) * 1.4
    t += beat; nb += 1
ic = np.array([intensity(x / 100) for x in range(int(T * 100) + 60)])
ic = np.convolve(np.pad(ic, (25, 24), mode="edge"), np.ones(50) / 50, mode="valid")
music *= np.interp(t_abs * 100, np.arange(len(ic)), ic)[:, None]
BUS["music"] += music

# --------------------------------------------------------------------------- #
# Mix: duck everything under the narration
def read_wav(p):
    with wave.open(p) as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        a = np.frombuffer(w.readframes(n), {2: np.int16, 4: np.int32}[sw]).astype(np.float64)
        a /= 32768.0 if sw == 2 else 2147483648.0
        a = a.reshape(-1, ch)
    assert sr == SR, sr
    return a if ch == 2 else np.repeat(a, 2, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    vo = np.zeros((N, 2)); v = read_wav(args.narration); vo[:min(N, len(v))] = v[:N]
    # sidechain envelope at 1 kHz: fast attack, slow release
    m = np.abs(vo).mean(1); hop = SR // 1000
    e = m[:len(m) // hop * hop].reshape(-1, hop).max(1)
    e = np.convolve(e, np.ones(25) / 25, mode="same")
    act = np.clip((20 * np.log10(e + 1e-6) + 42) / 16, 0, 1)    # 0 below -42 dBFS, 1 above -26 dBFS
    sm = np.zeros_like(act); s = 0.0
    for i, x in enumerate(act):
        s = s + (x - s) * (0.15 if x > s else 0.006)
        sm[i] = s
    duck = np.interp(np.arange(N) / hop, np.arange(len(sm)), sm)[:, None]
    mix = (vo * db(0.0)
           + BUS["music"] * (1 - 0.6 * duck)
           + BUS["amb"] * (1 - 0.5 * duck)
           + BUS["long"] * (1 - 0.55 * duck)
           + BUS["sfx"] * (1 - 0.35 * duck))
    peak = np.max(np.abs(mix))
    mix = np.tanh(mix / 0.98) * 0.98 if peak > 0.98 else mix      # gentle safety clip
    mix = mix[:int(T * SR)]
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with wave.open(args.out, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    stems = os.path.join(os.path.dirname(os.path.abspath(args.out)), "stems")
    os.makedirs(stems, exist_ok=True)
    for k, b in BUS.items():
        with wave.open(os.path.join(stems, k + ".wav"), "w") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(b[:int(T * SR)], -1, 1) * 32767).astype(np.int16).tobytes())
    print(f"mix -> {args.out}  ({T:.2f}s, peak before clip {20 * math.log10(peak + 1e-9):.1f} dBFS)")


if __name__ == "__main__":
    main()
