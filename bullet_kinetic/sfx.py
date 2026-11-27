"""Synthesised sound bed for the kinetic-text cut (no samples).
Whooshes on every wipe, a metal hit on STRIKE, crackle on SPARK, a rising rumble on
PRESSURE and a boom on FIRE. Usage: python3 sfx.py out.wav"""
import sys, wave
import numpy as np

SR, DUR = 48000, 5.0
n = int(SR * DUR); t = np.arange(n) / SR
rng = np.random.default_rng(3)
L = np.zeros(n); R = np.zeros(n)

def smooth(x, fc):  # two box-filter passes: a cheap, gentle low-pass
    k = max(1, int(SR / (2 * np.pi * fc))); ker = np.ones(k) / k
    return np.convolve(np.convolve(x, ker, 'same'), ker, 'same')

def env(t0, attack, decay):
    e = np.zeros(n); m = t >= t0; u = t[m] - t0
    e[m] = np.minimum(u / max(attack, 1e-4), 1) * np.exp(-np.maximum(u - attack, 0) / decay)
    return e

noise = rng.standard_normal(n)
hiss = noise - smooth(noise, 1500)
low = smooth(rng.standard_normal(n), 300) * 6

def whoosh(c, g=0.5, pan=0.0):
    u = np.clip((t - (c - 0.2)) / 0.4, 0, 1)
    e = np.sin(np.pi * u) ** 2 * (t > c - 0.2) * (t < c + 0.2)
    s = (hiss * 0.6 + smooth(noise, 2500) * 0.8) * e * g
    return s * (1 - pan), s * (1 + pan)

for c, p in [(0.05, -0.4), (0.95, -0.6), (1.95, 0.6), (2.90, -0.6), (3.85, 0.6)]:
    a, b = whoosh(c, 0.45, p); L += a; R += b

# soft bass pulse on each beat start
for c in [0.0, 0.95, 1.95, 2.90]:
    s = np.sin(2 * np.pi * 55 * t) * env(c + 0.05, 0.01, 0.18) * 0.35; L += s; R += s

# STRIKE: firing pin hits the primer (1.25)
hit = hiss * env(1.25, 0.0005, 0.015) * 1.2 + np.sin(2 * np.pi * 3200 * t) * env(1.25, 0.0005, 0.08) * 0.25 \
      + np.sin(2 * np.pi * 1180 * t) * env(1.25, 0.0005, 0.12) * 0.2 + smooth(noise, 2500) * env(1.26, 0.002, 0.05) * 0.9
L += hit; R += hit

# SPARK: crackle (2.0 - 2.8)
crk = np.zeros(n)
for tc in np.sort(2.0 + rng.random(70) * 0.8):
    crk += hiss * env(tc, 0.0003, 0.004 + rng.random() * 0.006) * (0.4 + rng.random() * 0.8)
sizzle = hiss * 0.12 * np.clip((t - 2.0) / 0.2, 0, 1) * np.clip((2.9 - t) / 0.3, 0, 1)
L += crk + sizzle; R += np.roll(crk, 90) + sizzle

# PRESSURE: rising rumble and tone (2.9 - 3.85)
u = np.clip((t - 2.9) / 0.95, 0, 1) * (t < 3.85)
f = 45 + 120 * u ** 2; ph = 2 * np.pi * np.cumsum(f) / SR
rum = (np.sin(ph) * 0.35 + low * 0.25) * u ** 1.5
L += rum; R += rum

# FIRE: crack + boom + short tail (3.85)
crack = hiss * env(3.85, 0.0008, 0.03) * 1.4
boom = smooth(rng.standard_normal(n), 200) * 9 * env(3.85, 0.006, 0.28)
sub = np.sin(2 * np.pi * (36 + 50 * np.exp(-np.clip(t - 3.85, 0, None) * 7)) * t) * env(3.85, 0.006, 0.4) * 0.9
blast = crack + boom + sub
tail = np.zeros(n)
for dly, g in [(0.05, 0.45), (0.09, 0.35), (0.14, 0.25), (0.21, 0.16), (0.3, 0.1)]:
    d = int(dly * SR); tail[d:] += smooth(blast, 1500)[:-d] * g
L += blast + tail; R += blast + np.roll(tail, 350)

fo = np.clip((DUR - t) / 0.08, 0, 1)
st = np.stack([L * fo, R * fo], 1)
st = np.tanh(st * 1.2) / np.tanh(1.2)
st *= 0.89 / np.max(np.abs(st))
with wave.open(sys.argv[1], 'wb') as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((st * 32767).astype('<i2').tobytes())
print('sfx ok', sys.argv[1])
