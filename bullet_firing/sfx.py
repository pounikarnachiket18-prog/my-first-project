"""Synthesise the 5 s sound-effect bed (no samples): sear click, primer pop,
powder roar, bullet whoosh, slow-motion muzzle boom. Usage: python3 sfx.py out.wav"""
import sys, wave
import numpy as np

SR, DUR = 48000, 5.0
n = int(SR * DUR)
t = np.arange(n) / SR
rng = np.random.default_rng(5)
L = np.zeros(n); R = np.zeros(n)

def env(t0, attack, decay):
    e = np.zeros(n); m = t >= t0; u = t[m] - t0
    e[m] = np.minimum(u / max(attack, 1e-4), 1.0) * np.exp(-np.maximum(u - attack, 0) / decay)
    return e

def lowpass_fast(x, fc):  # two box-filter passes: a cheap, gentle low-pass
    k = max(1, int(SR / (2 * np.pi * fc)))
    ker = np.ones(k) / k
    return np.convolve(np.convolve(x, ker, 'same'), ker, 'same')

noise = rng.standard_normal(n)
pink = lowpass_fast(rng.standard_normal(n), 900) * 6

# room tone
L += 0.01 * pink; R += 0.01 * np.roll(pink, 300)

# sear release click (0.70) and firing-pin strike (0.84)
for t0, f, g in [(0.70, 2600, 0.35), (0.84, 3400, 0.6)]:
    e = env(t0, 0.0005, 0.012)
    s = (noise - lowpass_fast(noise, 2000)) * e * g + np.sin(2 * np.pi * f * t) * env(t0, 0.0005, 0.05) * g * 0.4
    L += s; R += s * 0.9

# primer pop (0.86)
pop = lowpass_fast(noise, 2500) * env(0.86, 0.002, 0.06) * 1.4
L += pop; R += pop

# powder burning roar, swelling until the bullet moves (0.93 -> 2.2), then pressure falls
roar_env = np.clip((t - 0.93) / 1.25, 0, 1) ** 1.6 * np.where(t < 2.2, 1.0, np.exp(-(t - 2.2) * 1.4))
roar = lowpass_fast(rng.standard_normal(n), 400) * 5 * roar_env * 0.5
rumble = np.sin(2 * np.pi * (38 + 25 * roar_env) * t) * roar_env * 0.25
L += roar + rumble; R += np.roll(roar, 120) + rumble

# bullet accelerating down the barrel: rising whistle + air (2.2 -> 3.85)
u = np.clip((t - 2.2) / 1.65, 0, 1)
f = 180 + 1400 * u ** 2
ph = 2 * np.pi * np.cumsum(f) / SR
w_env = np.where((t > 2.2) & (t < 3.85), u ** 1.3, 0) + np.where(t >= 3.85, np.exp(-(t - 3.85) * 3), 0)
whoosh = (np.sin(ph) * 0.18 + (noise - lowpass_fast(noise, 1500)) * 0.25) * w_env
L += whoosh * 0.9; R += whoosh

# slow-motion: tonal drop as the bullet exits (3.85)
f2 = 900 * np.exp(-np.clip(t - 3.85, 0, None) * 2.5) + 60
ph2 = 2 * np.pi * np.cumsum(f2) / SR
drop = np.sin(ph2) * env(3.85, 0.02, 0.5) * 0.18
L += drop; R += drop

# muzzle blast (4.35): crack + deep slowed boom + long tail
crack = (noise - lowpass_fast(noise, 800)) * env(4.35, 0.001, 0.03) * 1.2
boom = lowpass_fast(rng.standard_normal(n), 180) * 9 * env(4.35, 0.01, 0.35)
sub = np.sin(2 * np.pi * (34 + 40 * np.exp(-np.clip(t - 4.35, 0, None) * 6)) * t) * env(4.35, 0.008, 0.45) * 0.9
blast = crack + boom + sub
tail = np.zeros(n)
for dly, g in [(0.043, 0.5), (0.071, 0.42), (0.113, 0.33), (0.167, 0.25), (0.229, 0.18), (0.311, 0.12)]:
    d = int(dly * SR); tail[d:] += lowpass_fast(blast, 1200)[:-d] * g
L += blast + tail; R += blast + np.roll(tail, 400)

# short fade-out at the very end
fo = np.clip((DUR - t) / 0.08, 0, 1)
L *= fo; R *= fo
st = np.stack([L, R], 1)
st = np.tanh(st * 1.2) / np.tanh(1.2)
st *= 0.89 / np.max(np.abs(st))
with wave.open(sys.argv[1], 'wb') as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((st * 32767).astype('<i2').tobytes())
print('sfx ok', sys.argv[1])
