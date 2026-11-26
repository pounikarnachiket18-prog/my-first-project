"""FINAL soundtrack (50 s): user's ElevenLabs voice + ORIGINAL synthesized action score + SFX.
Nothing third-party: drums, strings, brass and effects are generated here. Hook (first 2.7 s) uses the user's own dogfight clip audio.
usage: python3 build_mix_final.py   -> public/navy/mix_final.wav (then loudnorm -14 LUFS)"""
import json, os, subprocess
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(__file__); PUB = os.path.join(HERE, "..", "public", "navy")
tl = json.load(open(os.environ.get("TL") or os.path.join(HERE, "..", "src", "navy", "hyper10", "timeline.json")))
END = int(os.environ.get("END", "108")); LOGO_OFF = int(os.environ.get("LOGO_OFF", "62"))
SR, FPS = 44100, 30
HOOK = 81 / FPS
LOGO_AT = (round(tl["lines"][-1]["t0"] * FPS) - 3)
TOTAL = (81 + max(tl["frames"], LOGO_AT + END)) / FPS
N = int(TOTAL * SR)
rng = np.random.default_rng(11)

def lp(x, hz): return sosfilt(butter(2, min(hz, SR / 2 - 100), "low", fs=SR, output="sos"), x)
def hp(x, hz): return sosfilt(butter(2, hz, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, min(hi, SR / 2 - 200)], "band", fs=SR, output="sos"), x)
def noise(n): return rng.standard_normal(n)
def env(n, a, r):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e
def put(buf, x, t, g=1.0):
    i = int(max(0, t) * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i] * g; buf[i:i + len(x)] += x
m2f = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------- timeline helpers (global time = body time + HOOK)
SC = {s["id"]: s for s in tl["scenes"]}
S0 = lambda s: HOOK + SC[s]["start"]
Ls = lambda i: HOOK + tl["lines"][i]["t0"]; Le = lambda i: HOOK + tl["lines"][i]["t1"]
W = lambda i, j: HOOK + tl["lines"][i]["words"][min(j, len(tl["lines"][i]["words"]) - 1)]["t0"]
hyper_hit = Le(10) - 10 / FPS; super_hit = W(11, 1); logo = HOOK + (LOGO_AT + LOGO_OFF) / FPS

# ---------- instruments
def kick(g=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-t * 28)) / SR) * np.exp(-t * 7) + hp(noise(n), 2000) * np.exp(-t * 60) * 0.25) * g
def taiko(g=1.0):
    n = int(0.9 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(70 + 60 * np.exp(-t * 18)) / SR) * np.exp(-t * 5) * 1.1 + lp(noise(n), 500) * np.exp(-t * 9) * 0.6) * g
def snare(g=1.0):
    n = int(0.25 * SR); t = np.arange(n) / SR
    return (bp(noise(n), 1500, 7000) * np.exp(-t * 22) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5) * g
def hat(g=1.0):
    n = int(0.06 * SR); t = np.arange(n) / SR
    return hp(noise(n), 7000) * np.exp(-t * 90) * g
def saw(f, n, det=0.0):
    t = np.arange(n) / SR; x = np.zeros(n)
    for k in range(1, 14):
        if f * k > 9000: break
        x += np.sin(2 * np.pi * f * (1 + det) * k * t) / k
    return x
def braam(g=1.0, root=38):
    n = int(3.2 * SR); t = np.arange(n) / SR
    x = sum(saw(m2f(m), n, d) for m in (root - 12, root, root + 7) for d in (-0.004, 0.0, 0.005))
    out = np.zeros(n); cut = 180 + 1700 * np.exp(-t * 1.8)
    for i in range(0, n, 2048): out[i:i + 2048] = lp(x[i:i + 2048], cut[i])
    return out * np.minimum(1, t / 0.04) * np.exp(-t * 1.1) * g * 0.18
def riser(d, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR; x = noise(n); out = np.zeros(n)
    for i in range(0, n, 2048):
        f = 300 + 5000 * (t[i] / d) ** 2; out[i:i + 2048] = bp(x[i:i + 2048], f * 0.7, f * 1.4)
    tone = np.sin(2 * np.pi * np.cumsum(220 + 880 * (t / d) ** 2) / SR) * 0.25
    return (out + tone) * (t / d) ** 1.5 * g
def tapestop(g=1.0):
    n = int(0.6 * SR); t = np.arange(n) / SR
    f = 110 * (1 - t / 0.6) ** 2 + 20
    return (saw(1, n) * 0 + np.sin(2 * np.pi * np.cumsum(f) / SR)) * (1 - t / 0.6) * g

# ---------- score: 140 bpm, D minor; energy per section
BPM = 140; beat = 60 / BPM; s16 = beat / 4
sections = [  # (start, end, energy) global seconds
    (0.0, S0("pause") - 0.05, 1.0),
    (S0("pause"), S0("mach"), 0.0),
    (S0("mach"), S0("radar"), 0.45),
    (S0("radar"), S0("strike"), 0.7),
    (S0("strike"), HOOK + LOGO_AT / FPS, 1.0),
    (HOOK + LOGO_AT / FPS, TOTAL, 0.6),
]
def energy(t):
    for a, b, e in sections:
        if a <= t < b: return e
    return 0.0
drums = np.zeros(N); bass = np.zeros(N); strings = np.zeros(N); fx = np.zeros(N)
# ostinato pattern (16ths) in semitones above D2
pat = [0, 0, 12, 0, 0, 0, 3, 0, 0, 0, 12, 0, 5, 0, 3, 0]
prog = [0, 0, -4, -2]  # Dm, Dm, Bb, C (bars)
nb = int(TOTAL / beat) + 1
for b in range(nb):
    tb = b * beat; e = energy(tb + 0.01)
    if e <= 0: continue
    bar = b // 4; root = 38 + prog[bar % 4]
    # drums
    if b % 4 == 0: put(drums, taiko(1.0), tb, e)
    if b % 2 == 0: put(drums, kick(0.9), tb, e)
    if b % 4 == 1 and e >= 0.7: put(drums, kick(0.6), tb + beat / 2, e)
    if b % 2 == 1 and e >= 0.6: put(drums, snare(0.55), tb, e)
    for k in range(4 if e >= 0.7 else 2):
        put(drums, hat(0.25 if k % 2 else 0.4), tb + k * (beat / (4 if e >= 0.7 else 2)), e)
    # ostinato bass
    for k in range(4):
        st = (b % 4) * 4 + k
        n = int(s16 * 0.92 * SR)
        note = saw(m2f(root + pat[st] - 12 + 12), n) * np.exp(-np.arange(n) / SR * 9)
        put(bass, lp(note, 700 + 900 * e), tb + k * s16, 0.16 * (0.6 + 0.4 * e))
    # string pad (once per bar)
    if b % 4 == 0:
        n = int(4 * beat * SR)
        chord = sum(saw(m2f(root + 12 + iv), n, d) for iv in (0, 3, 7) for d in (-0.003, 0.003))
        chord = lp(chord, 1400) * env(n, 0.25, 0.4)
        put(strings, chord, tb, 0.05 * e)
# tension: snare roll building into the strike
roll0, roll1 = S0("time") + 1.0, S0("strike")
t = roll0
while t < roll1:
    k = (t - roll0) / max(0.1, roll1 - roll0)
    put(drums, snare(0.25 + 0.5 * k), t, 1.0); t += s16 * (2 if k < 0.5 else 1)
# drone under the freeze/explanation
d0, d1 = S0("pause"), S0("radar"); n = int((d1 - d0) * SR); tt = np.arange(n) / SR
put(strings, (np.sin(2 * np.pi * m2f(26) * tt) + 0.5 * np.sin(2 * np.pi * m2f(33) * tt)) * env(n, 0.8, 1.0), d0, 0.05)
# big moments
put(fx, braam(1.0), 0.0); put(fx, braam(1.1), HOOK)
put(fx, tapestop(0.9), S0("pause") - 0.15)
put(fx, riser(1.6, 0.35), S0("strike") - 1.6)
put(fx, braam(1.2), S0("strike")); put(fx, braam(1.0, 41), hyper_hit); put(fx, braam(1.4), super_hit)
put(fx, riser(1.2, 0.25), logo - 1.2); put(fx, braam(1.3, 38), logo); put(fx, taiko(1.4), logo)

# ---------- SFX (same events as before, on the final timeline)
def whoosh(d, lo, hi, g=1.0):
    n = int(d * SR); x = noise(n); out = np.zeros(n); sw = np.linspace(0, 1, n)
    for i in range(0, n, 1024):
        f = lo + (hi - lo) * sw[i] ** 1.4; out[i:i + 1024] = bp(x[i:i + 1024], max(40, f * 0.7), min(f * 1.4, SR / 2 - 200))
    return out * env(n, d * 0.6, d * 0.4) * g
def rumble(d, g=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    return (lp(noise(n), 600) * 1.4 + 0.3 * np.sin(2 * np.pi * (60 + 30 * t / d) * t)) * env(n, 0.2, min(1.0, d * 0.4)) * g
def boom(g=1.0):
    n = int(2.0 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for d0_ in (0.0, 0.11):
        i0 = int(d0_ * SR); w = int(0.012 * SR); x[i0:i0 + w] += np.linspace(1, -1, w)
    return (lp(x, 2500) * 3 + lp(noise(n), 200) * np.exp(-t * 2.5) * 0.8) * g
def explosion(g=1.0):
    n = int(3.0 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (35 + 90 * np.exp(-t * 7)) * t) * np.exp(-t * 1.8) * 1.2 + lp(noise(n), 900) * np.exp(-t * 3.2) + hp(noise(n), 3000) * np.exp(-t * 14) * 0.5) * g
def plasma(d, g=1.0):
    n = int(d * SR); return (hp(noise(n), 1500) * 0.5 + bp(noise(n), 300, 900) * 0.5) * env(n, 0.3, 0.5) * g
def ping(g=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * 880 * t) * np.exp(-t * 8) * g
def tick(g=1.0):
    n = int(0.05 * SR); return hp(noise(n), 3000) * np.exp(-np.arange(n) / (0.006 * SR)) * g
sfx = np.zeros(N)
rel = W(0, 5)
put(sfx, rumble(rel - HOOK + 1.0, 0.5), HOOK); put(sfx, whoosh(1.0, 200, 3500, 0.9), rel + 0.35); put(sfx, whoosh(0.9, 300, 5000, 1.0), rel + 0.4)
put(sfx, rumble(2.5, 0.7), rel + 0.35); put(sfx, plasma(2.0, 0.3), rel + 0.8)
for nm in ("mach", "supersonic", "hypersonic", "radar", "time", "strike", "outro"):
    put(sfx, whoosh(0.5, 400, 3500, 0.55), S0(nm) - 0.25)
for k in range(8): put(sfx, ping(0.08), S0("mach") + 0.2 + k * 0.42)
put(sfx, rumble(S0("hypersonic") - S0("supersonic"), 0.45), S0("supersonic")); put(sfx, boom(1.2), W(5, 9))
put(sfx, plasma(S0("radar") - S0("hypersonic"), 0.45), S0("hypersonic"))
t = S0("radar") + 0.3
while t < S0("time") - 0.2: put(sfx, ping(0.08), t); t += 1.333
t = W(9, 1)
while t < S0("strike") - 0.3: put(sfx, tick(0.2), t); t += 0.25
put(sfx, rumble(2.0, 0.5), S0("strike")); put(sfx, explosion(0.9), hyper_hit); put(sfx, explosion(1.3), super_hit)
put(sfx, rumble(TOTAL - (HOOK + LOGO_AT / FPS), 0.5), HOOK + LOGO_AT / FPS)   # afterburner
put(sfx, whoosh(0.6, 300, 2500, 0.5), logo - 0.2)

# ---------- voice, hook clip audio
voice = np.zeros(N)
v, vsr = sf.read(os.path.join(PUB, os.environ.get("VOICE", "voice_final.wav")), dtype="float64")
if v.ndim > 1: v = v.mean(1)
put(voice, v, HOOK)
raw = subprocess.check_output(["ffmpeg", "-v", "error", "-ss", f"{(152 - 81) / FPS:.4f}", "-t", f"{HOOK + 0.15:.4f}", "-i", os.path.join(PUB, "dogfight.mp4"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
clip = np.frombuffer(raw, np.float32).astype(np.float64)
clip = clip * env(len(clip), 0.02, 0.15)

# ---------- mix
venv = np.sqrt(np.maximum(lp(voice ** 2, 6), 0)); vk = np.clip(venv / (venv.max() * 0.2 + 1e-9), 0, 1)
duck_m = lp(1 - 0.62 * vk, 4); duck_s = lp(1 - 0.3 * vk, 6)
nm = lambda x, p: x / (np.abs(x).max() + 1e-9) * p
music = nm(drums, 0.5) + nm(bass, 0.28) + nm(strings, 0.16) + nm(fx, 0.45)
music = nm(music, 0.42)
mix = voice * 0.95 + music * duck_m + nm(sfx, 0.38) * duck_s
mix[: len(clip)] += clip * 0.75
fade = np.ones(N); nf = int(0.8 * SR); fade[-nf:] = np.linspace(1, 0, nf)
mix = np.tanh(mix * fade * 1.05) / np.tanh(1.05)
st = np.stack([mix, mix], 1); st = st / np.abs(st).max() * 0.95
sf.write(os.path.join(PUB, os.environ.get("OUT", "mix_final.wav")), st.astype(np.float32), SR)
print("mix_final", round(N / SR, 2), "s; hyperHit", round(hyper_hit, 2), "superHit", round(super_hit, 2), "logo", round(logo, 2))
