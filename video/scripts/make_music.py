"""Synthesize a 30s, 120 BPM warm lo-fi bed: pads + pluck arpeggio + bass + soft drums."""
import math, random, struct, sys, wave
SR = 44100; DUR = 30.5; BEAT = 0.5; BAR = 4 * BEAT
N = int(SR * DUR)
random.seed(7)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
# I–V–vi–IV in D major (D, A, Bm, G), as MIDI chord tones
CHORDS = [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]]
BASS = [38, 33, 35, 31]
L = [0.0] * N; R = [0.0] * N
def add(start, buf, pan=0.0):
    i0 = int(start * SR)
    gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    for k, v in enumerate(buf):
        j = i0 + k
        if j >= N: break
        L[j] += v * gl; R[j] += v * gr
def tone(f, dur, amp, attack, decay, harmonics=(1,), detune=0.0):
    n = int(dur * SR); out = []
    for k in range(n):
        t = k / SR
        env = min(1, t / attack) * math.exp(-t / decay)
        s = sum(math.sin(2 * math.pi * f * h * (1 + detune * (h % 2)) * t) / h for h in harmonics)
        out.append(amp * env * s)
    return out
bars = int(30 / BAR)  # 15 bars
for b in range(bars):
    t0 = b * BAR; ci = b % 4; section = 0 if b < 3 else (1 if b < 13 else 2)
    # pads (every bar)
    for m in CHORDS[ci]:
        add(t0, tone(hz(m), BAR + 0.3, 0.045, 0.35, 2.5, (1, 2, 3)), pan=random.uniform(-0.4, 0.4))
    # bass from bar 1
    if b >= 1:
        for beat in (0, 2.5):
            add(t0 + beat * BEAT, tone(hz(BASS[ci]), 0.9, 0.16, 0.01, 0.35, (1, 2)))
    # pluck arpeggio (sitar-ish: bright harmonics, fast decay) from bar 2
    if b >= 2:
        pattern = [0, 1, 2, 1, 2, 0, 1, 2]
        for e, p in enumerate(pattern):
            m = CHORDS[ci][p] + 12
            add(t0 + e * BEAT / 2, tone(hz(m), 0.45, 0.05, 0.003, 0.12, (1, 2, 3, 4, 5), 0.002), pan=0.35 if e % 2 else -0.35)
    # drums from bar 3 until last bar (outro: pads only)
    if 3 <= b < 14:
        for beat in range(4):
            tb = t0 + beat * BEAT
            if beat in (0, 2):  # kick
                add(tb, [0.35 * math.exp(-k / (SR * 0.09)) * math.sin(2 * math.pi * (45 + 90 * math.exp(-k / (SR * 0.03))) * k / SR) for k in range(int(SR * 0.3))])
            else:  # soft snare/clap
                add(tb, [0.06 * math.exp(-k / (SR * 0.06)) * random.uniform(-1, 1) for k in range(int(SR * 0.2))])
            add(tb + BEAT / 2, [0.025 * math.exp(-k / (SR * 0.02)) * random.uniform(-1, 1) for k in range(int(SR * 0.06))], pan=0.3)  # hat
# final sustained D chord
for m in [50, 62, 66, 69, 74]:
    add(bars * BAR - 0.5, tone(hz(m), 2.0, 0.05, 0.05, 1.2, (1, 2, 3)))
peak = max(max(abs(x) for x in L), max(abs(x) for x in R))
g = 0.85 / peak
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<hh", int(math.tanh(L[i] * g) * 32767), int(math.tanh(R[i] * g) * 32767)) for i in range(N)))
print("ok", peak)
