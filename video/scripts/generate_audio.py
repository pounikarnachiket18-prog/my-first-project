#!/usr/bin/env python3
"""
Sound design + narration for the JUST KNOW IT mosquito reel.

Reads src/mosquito/config/timeline.json (the same timing the video uses) and
writes:
  public/jki/audio/sfx.wav  — synthesized sound design, ducked under the voice
  public/jki/audio/vo.wav   — narration track

Narration source, in order of preference:
  1. A real voice-over file passed with --vo path/to/voiceover.wav
     (35 s, starting at 0:00, any sample rate; it is used as-is and the SFX is
     ducked against it).
  2. Otherwise a GUIDE narration built with espeak-ng (Hindi voice), one
     phrase per timeline entry, placed at its start time and time-fitted to
     its slot. It exists to lock timing; replace it with a human voice.

Everything is synthesized from scratch (no samples, no copyrighted music).
Deterministic: fixed random seed.

Usage:  python3 scripts/generate_audio.py [--vo voiceover.wav]
Needs:  numpy, ffmpeg, espeak-ng (only for the guide narration)
"""
import argparse
import json
import os
import subprocess
import tempfile
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, "src/mosquito/config/timeline.json")))
OUT = os.path.join(ROOT, "public/jki/audio")
SR = 48000
DUR = TL["durationInFrames"] / TL["fps"]
N = int(DUR * SR)
CUE = TL["cues"]
rng = np.random.default_rng(20221018)
t_all = np.arange(N) / SR


# ----------------------------------------------------------------- utilities
def db(x):
    return 10 ** (x / 20)


def idx(t):
    return int(np.clip(t * SR, 0, N))


def env_adsr(n, a, r, curve=2.0):
    """attack/release envelope (seconds) over n samples."""
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na > 0:
        e[:na] = np.linspace(0, 1, na) ** curve
    if nr > 0:
        e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def fft_filter(x, lo=None, hi=None):
    """zero-phase brick-ish band filter with soft edges (offline)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))


def sweep_bp(noise, f0, f1, q=3.0, block=1024):
    """band-pass with centre frequency sweeping f0→f1 (overlap-add STFT)."""
    out = np.zeros(len(noise) + block)
    win = np.hanning(block)
    hop = block // 2
    nb = max(1, (len(noise) - block) // hop + 1)
    f = np.fft.rfftfreq(block, 1 / SR)
    for b in range(nb):
        s = b * hop
        seg = noise[s : s + block]
        if len(seg) < block:
            seg = np.pad(seg, (0, block - len(seg)))
        u = b / max(1, nb - 1)
        fc = f0 * (f1 / f0) ** u
        bw = fc / q
        g = np.exp(-0.5 * ((f - fc) / bw) ** 2)
        out[s : s + block] += np.fft.irfft(np.fft.rfft(seg * win) * g, block)
    return out[: len(noise)]


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, t0, gain_db=0.0, pan=0.0):
        """pan -1 (L) … +1 (R), equal power."""
        s = idx(t0)
        e = min(N, s + len(sig))
        if e <= s:
            return
        g = db(gain_db)
        th = (pan + 1) * np.pi / 4
        self.L[s:e] += sig[: e - s] * g * np.cos(th)
        self.R[s:e] += sig[: e - s] * g * np.sin(th)


sfx = Bus()

# ------------------------------------------------------------ sound sources
def mosquito_buzz(dur, f_fn, amp_fn=None, seed=0):
    """Female Aedes wing tone: harmonic-rich, slight jitter + AM from strokes."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    r = np.random.default_rng(seed)
    jitter = np.cumsum(r.normal(0, 1, n)) / SR * 6
    f = f_fn(tt) * (1 + 0.012 * np.sin(2 * np.pi * 5.3 * tt) + 0.004 * jitter)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.zeros(n)
    for k in range(1, 9):
        sig += np.sin(k * ph + r.uniform(0, 6)) / k ** 1.1
    sig *= 0.8 + 0.2 * np.sin(2 * np.pi * 23 * tt + r.uniform(0, 6))
    sig /= np.max(np.abs(sig)) + 1e-9
    if amp_fn is not None:
        sig *= amp_fn(tt)
    return sig


def impact(dur=2.2, f0=58, f1=32, noise=0.35):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-tt * 5)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.1)
    thump = fft_filter(rng.normal(0, 1, n), hi=180) * np.exp(-tt * 9)
    click = fft_filter(rng.normal(0, 1, n), lo=2000) * np.exp(-tt * 60) * 0.25
    s = body + noise * thump / (np.max(np.abs(thump)) + 1e-9) + click
    return s / np.max(np.abs(s))


def whoosh(dur=1.1, f0=300, f1=3500, rev=False):
    n = int(dur * SR)
    s = sweep_bp(rng.normal(0, 1, n), f0, f1, q=2.2)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** (1.6 if not rev else 0.8)
    s = s * e
    return s / (np.max(np.abs(s)) + 1e-9)


def riser(dur=1.5, f0=120, f1=900):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    u = tt / dur
    f = f0 * (f1 / f0) ** u
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.2
    nz = sweep_bp(rng.normal(0, 1, n), 400, 6000, q=1.5)
    nz /= np.max(np.abs(nz)) + 1e-9
    s = (tone + nz * 0.6) * u ** 2.2
    s[-int(0.03 * SR) :] *= np.linspace(1, 0, int(0.03 * SR))
    return s / (np.max(np.abs(s)) + 1e-9)


def pulse(f=1500, dur=0.35):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 2.01 * tt)) * np.exp(-tt * 18)
    s += 0.25 * np.sin(2 * np.pi * f * 0.5 * tt) * np.exp(-tt * 9)
    return s / np.max(np.abs(s))


def drone(dur, freqs, lp=400, seed=1):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    r = np.random.default_rng(seed)
    s = np.zeros(n)
    for i, f in enumerate(freqs):
        s += np.sin(2 * np.pi * f * tt * (1 + 0.002 * np.sin(2 * np.pi * 0.07 * tt + i)) + r.uniform(0, 6)) / (i + 1) ** 0.7
    s += fft_filter(r.normal(0, 1, n), hi=lp) * 0.6
    return s / (np.max(np.abs(s)) + 1e-9)


# ----------------------------------------------------------------- the score
# Night room ambience (0–11 s): brown-ish noise, distant crickets, mains hum
amb_n = idx(11.4)
brown = np.cumsum(rng.normal(0, 1, amb_n))
brown -= np.convolve(brown, np.ones(4800) / 4800, mode="same")
brown = fft_filter(brown, lo=40, hi=900)
brown /= np.max(np.abs(brown))
hum = 0.15 * np.sin(2 * np.pi * 50 * t_all[:amb_n]) + 0.05 * np.sin(2 * np.pi * 100 * t_all[:amb_n])
amb = (brown + hum) * env_adsr(amb_n, 0.4, 1.2)
sfx.add(amb, 0, -27)
for k in range(40):  # crickets: short AM chirps at ~4.6 kHz
    tc = rng.uniform(0.2, 10.5)
    n = int(0.12 * SR)
    tt = np.arange(n) / SR
    ch = np.sin(2 * np.pi * (4500 + rng.uniform(-150, 150)) * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 55 * tt)) * np.sin(np.pi * tt / 0.12)
    sfx.add(ch, tc, -42 + rng.uniform(-4, 2), pan=rng.uniform(-0.8, 0.8))

# Low cinematic drones per act
sfx.add(drone(11.2, [55, 82.5, 110], lp=300, seed=2) * env_adsr(int(11.2 * SR), 1.2, 0.8), 0, -24)
sfx.add(drone(8.2, [65.4, 98, 130.8, 196], lp=500, seed=3) * env_adsr(int(8.2 * SR), 0.5, 0.8), 11.0, -25)
sfx.add(drone(9.2, [73.4, 110, 146.8, 220, 293.7], lp=700, seed=4) * env_adsr(int(9.2 * SR), 0.6, 0.8), 19.0, -24)
sfx.add(drone(5.2, [61.7, 92.5, 123.5, 185], lp=400, seed=5) * env_adsr(int(5.2 * SR), 0.4, 0.6), 28.0, -25)

# Mosquitoes — distant swarm (0–3.7 s), the lens fly-by, the swarm near the arm
sw_d = 4.6
sfx.add(mosquito_buzz(sw_d, lambda t: 520 + 0 * t, lambda t: np.clip(t / 1.5, 0, 1) * (1 - np.clip((t - 4.0) / 0.6, 0, 1)), seed=11), 0.0, -37, pan=0.35)
sfx.add(mosquito_buzz(sw_d, lambda t: 585 + 0 * t, lambda t: np.clip(t / 2.0, 0, 1) * (1 - np.clip((t - 4.0) / 0.6, 0, 1)), seed=12), 0.0, -39, pan=0.5)
fb_d = 1.1  # fly-by: Doppler (pitch high→low) + loudness bump + pan L→R
sfx.add(
    mosquito_buzz(fb_d, lambda t: 600 * (1 + 0.06 * np.tanh((0.5 - t) * 9)), lambda t: np.exp(-((t - 0.5) / 0.22) ** 2), seed=13),
    2.3, -15, pan=0.0,
)
fb = mosquito_buzz(fb_d, lambda t: 600 * (1 + 0.06 * np.tanh((0.5 - t) * 9)), lambda t: np.exp(-((t - 0.5) / 0.22) ** 2), seed=14)
pan_env = np.linspace(-0.9, 0.9, len(fb))
sfx.L[idx(2.3) : idx(2.3) + len(fb)] += fb * db(-17) * np.cos((pan_env + 1) * np.pi / 4)
sfx.R[idx(2.3) : idx(2.3) + len(fb)] += fb * db(-17) * np.sin((pan_env + 1) * np.pi / 4)
# Macro slow motion: wing tone drops with the speed ramp (4.4→4.95 s), takes off at ~9 s
def macro_f(t):
    T = t + 3.6
    slow = np.clip((T - 4.35) / 0.6, 0, 1)
    fast = np.clip((T - 8.85) / 0.25, 0, 1)
    return 600 * (1 - slow) + 72 * slow * (1 - fast) + 640 * fast


sfx.add(
    mosquito_buzz(7.6, macro_f, lambda t: (0.45 + 0.55 * np.clip((t + 3.6 - 4.3) / 0.6, 0, 1)) * (1 - np.clip((t + 3.6 - 9.6) / 1.4, 0, 1)) ** 2, seed=15),
    3.6, -24,
)
# Scene 4b mosquito approaching sample A, landing at ~27.6 s
sfx.add(mosquito_buzz(3.0, lambda t: 610 + 0 * t, lambda t: np.clip(t / 1.6, 0, 1) * (1 - np.clip((t - 2.55) / 0.15, 0, 1)), seed=16), 24.8, -27, pan=-0.2)
# Scene 5: frequent buzz on the left, rare on the right
for k, (tc, pn) in enumerate([(28.0, -0.7), (28.6, 0.6), (29.1, -0.6), (29.8, -0.75), (30.6, -0.65)]):
    sfx.add(mosquito_buzz(2.4, lambda t, k=k: 560 + 35 * k + 0 * t, lambda t: np.sin(np.pi * np.clip(t / 2.4, 0, 1)), seed=20 + k), tc, -33, pan=pn)

# Transitions: whooshes
for tc, d, f0, f1, g in [
    (3.75, 1.3, 250, 4200, -16),  # dive into macro
    (8.95, 0.8, 600, 3000, -22),  # mosquito turns
    (10.55, 0.6, 400, 6000, -15),  # flash into skin
    (17.55, 1.4, 300, 3800, -19),  # dive into molecule
    (24.2, 0.7, 2500, 400, -20),  # pull-back / dissolve
    (27.85, 0.45, 500, 5000, -19),  # to split screen
    (32.75, 0.5, 400, 5000, -18),  # to brand
]:
    sfx.add(whoosh(d, f0, f1), tc, g)

# Risers into the big beats
sfx.add(riser(1.2, 90, 700), CUE["whyYou"] - 1.2, -22)
sfx.add(riser(1.6, 110, 900), CUE["carboxylic"] - 1.6, -21)
sfx.add(riser(1.0, 130, 1100), CUE["brand"] - 1.0, -22)

# Impacts
sfx.add(impact(2.4), CUE["whyYou"], -9)
sfx.add(impact(1.6, 70, 40, 0.25), CUE["senseBreath"], -15)
sfx.add(impact(2.6, 55, 30), CUE["carboxylic"], -8)
sfx.add(impact(2.0, 62, 34), CUE["brand"], -9)

# Scientific electronic pulses on each label / data beat
for tc, f in [(7.3, 1650), (7.8, 1320), (CUE["co2Label"], 1500), (CUE["heatLabel"], 1180), (CUE["odourLabel"], 1760), (CUE["studyChip"], 1400), (20.3, 1880), (24.9, 1500), (25.2, 1250), (CUE["sweetBlood"], 980), (29.35, 740)]:
    sfx.add(pulse(f), tc, -24)
for k in range(9):  # soft ticking during the molecular orbit (19–23.3 s)
    sfx.add(pulse(2400, 0.12), 19.2 + k * 0.5, -36)

# Body heat: warm rumble; skin odour: fizzing micro-pops
heat_n = idx(16.4) - idx(13.35)
heat = fft_filter(rng.normal(0, 1, heat_n), lo=60, hi=420)
heat = heat / np.max(np.abs(heat)) * env_adsr(heat_n, 0.5, 1.2)
sfx.add(heat, 13.35, -27)
for k in range(60):
    tc = rng.uniform(14.9, 17.2)
    n = int(0.05 * SR)
    tt = np.arange(n) / SR
    pop = np.sin(2 * np.pi * rng.uniform(2200, 5200) * tt) * np.exp(-tt * 120)
    sfx.add(pop, tc, -38 + rng.uniform(-5, 3), pan=rng.uniform(-0.6, 0.6))

# Brand: shimmer tail
sh_n = int(2.0 * SR)
tt = np.arange(sh_n) / SR
shimmer = sum(np.sin(2 * np.pi * f * tt) / (i + 1) for i, f in enumerate([880, 1318.5, 1760, 2637]))
shimmer *= np.exp(-tt * 1.6) * (1 - np.exp(-tt * 30))
sfx.add(shimmer / np.max(np.abs(shimmer)), CUE["brand"] + 0.1, -26)


# --------------------------------------------------------------- narration
def read_wav_any(path):
    """decode any audio file to mono float @SR via ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def guide_vo():
    vo = np.zeros(N)
    tmp = tempfile.mkdtemp()
    vos = TL["vo"]
    for i, v in enumerate(vos):
        # usable window: until the next phrase starts (or the end of the reel)
        nxt = vos[i + 1]["start"] if i + 1 < len(vos) else DUR - 2.0
        window = max(v["slot"], nxt - v["start"] - 0.08)
        raw = os.path.join(tmp, v["id"] + ".wav")
        fit = os.path.join(tmp, v["id"] + "_fit.wav")
        subprocess.run(["espeak-ng", "-v", "hi", "-s", "205", "-p", "42", "-a", "170", "-g", "2", "-w", raw, v["tts"]], check=True)
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", raw], capture_output=True, text=True).stdout)
        tempo = min(1.4, max(1.0, d / window))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", f"atempo={tempo:.3f},highpass=f=90,lowpass=f=7500", "-ar", str(SR), "-ac", "1", fit], check=True)
        x = read_wav_any(fit)
        x = x[: int(window * SR)]
        x *= env_adsr(len(x), 0.01, 0.05, 1)
        s = idx(v["start"])
        vo[s : s + len(x)] += x[: N - s]
        print(f"  {v['id']}: {d:.2f}s → window {window:.2f}s (tempo ×{tempo:.2f}){'  [TRIMMED]' if d / tempo > window + 0.01 else ''}")
    return vo


def write_wav(path, L, R):
    st = np.stack([L, R], axis=1)
    st = np.clip(st, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype("<i2").tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vo", help="real voice-over file (replaces the guide narration)")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    if args.vo:
        print(f"Using real voice-over: {args.vo}")
        vo = read_wav_any(args.vo)
        vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
    else:
        print("Building GUIDE narration with espeak-ng (replace with a human VO):")
        vo = guide_vo()
    vo = vo / (np.max(np.abs(vo)) + 1e-9) * db(-3)

    # Duck SFX under the voice: smoothed VO envelope → -8 dB gain reduction
    env = onepole_lp(np.abs(vo), 6.0)
    env = env / (env.max() + 1e-9)
    duck = db(-8 * np.clip(env * 3.0, 0, 1))
    L, R = sfx.L * duck, sfx.R * duck
    peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
    L, R = L / peak * db(-6), R / peak * db(-6)
    write_wav(os.path.join(OUT, "sfx.wav"), L, R)
    write_wav(os.path.join(OUT, "vo.wav"), vo, vo)
    print(f"wrote {OUT}/sfx.wav and vo.wav ({DUR:.1f}s @ {SR} Hz)")


if __name__ == "__main__":
    main()
