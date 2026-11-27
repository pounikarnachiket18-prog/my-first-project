"""Synthesise the Hinglish narration and word-level timings.

Output:
  public/earth/audio/narration.wav   (48 kHz mono, full 50 s timeline, mastered voice)
  src/earth/data/captions.json        (word timings for the subtitle system)

Voice: Piper "hi_IN-pratham-medium" (male Hindi neural voice, ~103 Hz F0).
Word timings: each chunk (text between pauses) is synthesised as a whole for
natural prosody. Word boundaries are first estimated from the duration of each
word synthesised in isolation, then snapped to the nearest low-energy valley
in the chunk audio.

Run:  python3 earth/tools/build_narration.py      (from video/)
"""
import json, os, subprocess, sys, wave, io
import numpy as np
from scipy.signal import resample_poly, butter, sosfiltfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))  # video/
sys.path.insert(0, HERE)
from narration_script import LINES  # noqa: E402

VOICE = os.path.join(ROOT, "earth", "voices", "vits-piper-hi_IN-pratham-medium", "hi_IN-pratham-medium.onnx")
SR = 48000
TOTAL = 50.0
OUT_WAV = os.path.join(ROOT, "public", "earth", "audio", "narration.wav")
OUT_JSON = os.path.join(ROOT, "src", "earth", "data", "captions.json")
BASE_LENGTH_SCALE = 0.90  # <1 = faster, energetic delivery

from piper import PiperVoice, SynthesisConfig  # noqa: E402

voice = PiperVoice.load(VOICE)
VSR = voice.config.sample_rate


def synth(text, length_scale):
    cfg = SynthesisConfig(length_scale=length_scale, noise_scale=0.6, noise_w_scale=0.75)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        voice.synthesize_wav(text, w, syn_config=cfg)
    buf.seek(44)
    x = np.frombuffer(buf.read(), dtype=np.int16).astype(np.float32) / 32768.0
    return x


def trim(x, thr=0.012):
    env = np.convolve(np.abs(x), np.ones(256) / 256, mode="same")
    idx = np.where(env > thr)[0]
    if len(idx) == 0:
        return x[:0]
    a = max(0, idx[0] - 200)
    b = min(len(x), idx[-1] + 600)
    return x[a:b]


def tok(t):
    d = t[2] if len(t) > 2 else {}
    return t[0], t[1], d


def chunks_of(line):
    """Split tokens into chunks at pause markers."""
    out, cur = [], []
    for t in line["tokens"]:
        disp, spoken, d = tok(t)
        cur.append((disp, spoken, d))
        if d.get("pause"):
            out.append((cur, d["pause"]))
            cur = []
    if cur:
        out.append((cur, 0.0))
    return out


def render_line(line, ls):
    """Returns audio (VSR) and word list with times relative to line start."""
    pieces, words, t = [], [], 0.0
    for toks, pause in chunks_of(line):
        text = " ".join(s for _, s, _ in toks)
        a = trim(synth(text, ls))
        dur = len(a) / VSR
        # isolated word durations -> proportional split
        iso = np.array([max(0.08, len(trim(synth(s, ls))) / VSR) for _, s, _ in toks])
        bounds = np.concatenate([[0], np.cumsum(iso / iso.sum() * dur)])
        # snap inner boundaries to local energy valleys (+-90 ms)
        env = np.convolve(a ** 2, np.ones(480) / 480, mode="same")
        for i in range(1, len(bounds) - 1):
            c = int(bounds[i] * VSR)
            r = int(0.09 * VSR)
            lo, hi = max(0, c - r), min(len(a) - 1, c + r)
            if hi > lo:
                bounds[i] = (lo + int(np.argmin(env[lo:hi]))) / VSR
        # every word stays on screen for at least ~100 ms
        mg = min(0.1, dur / len(toks) * 0.6)
        for i in range(1, len(bounds) - 1):
            bounds[i] = max(bounds[i], bounds[i - 1] + mg)
        for i in range(len(bounds) - 2, 0, -1):
            bounds[i] = min(bounds[i], bounds[i + 1] - mg)
        for i, (disp, _, d) in enumerate(toks):
            words.append({
                "text": disp,
                "start": round(t + bounds[i], 3),
                "end": round(t + bounds[i + 1], 3),
                "emph": bool(d.get("emph")),
                **({"accent": d["accent"]} if d.get("accent") else {}),
            })
        pieces.append(a)
        t += dur
        if pause:
            pieces.append(np.zeros(int(pause * VSR), np.float32))
            t += pause
    return np.concatenate(pieces), words


def master(x):
    """Broadcast-style voice chain via ffmpeg: HPF, warmth, presence, compression, de-ess, short room."""
    tmp_in = OUT_WAV + ".raw.wav"
    import soundfile as sf
    sf.write(tmp_in, x, SR)
    af = ",".join([
        "highpass=f=70",
        "equalizer=f=120:t=q:w=1.0:g=3.5",      # chest / depth
        "equalizer=f=350:t=q:w=1.2:g=-2.5",     # de-box
        "equalizer=f=3200:t=q:w=1.0:g=3",       # presence / clarity
        "equalizer=f=7500:t=q:w=2:g=-2",        # tame sibilance
        "acompressor=threshold=-20dB:ratio=3.5:attack=6:release=120:makeup=4",
        "aecho=0.85:0.35:28|46:0.12|0.07",      # small studio room
        "alimiter=limit=0.89",
    ])
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp_in, "-af", af, "-ar", str(SR), OUT_WAV], check=True)
    os.remove(tmp_in)


def main():
    track = np.zeros(int(TOTAL * SR), np.float32)
    out_lines = []
    for line in LINES:
        window = line["end"] - line["start"]
        ls = BASE_LENGTH_SCALE
        audio, words = render_line(line, ls)
        if len(audio) / VSR > window:  # bisection for the slowest speed that still fits
            lo, hi = 0.62, BASE_LENGTH_SCALE
            for _ in range(6):
                mid = (lo + hi) / 2
                a2, w2 = render_line(line, mid)
                if len(a2) / VSR <= window:
                    lo, audio, words, ls = mid, a2, w2, mid
                else:
                    hi = mid
            if len(audio) / VSR > window:
                audio, words = render_line(line, lo); ls = lo
        dur = len(audio) / VSR
        audio48 = resample_poly(audio, SR, VSR).astype(np.float32)
        s = int(line["start"] * SR)
        track[s:s + len(audio48)] += audio48[: len(track) - s]
        for w in words:
            w["start"] = round(w["start"] + line["start"], 3)
            w["end"] = round(w["end"] + line["start"], 3)
        out_lines.append({"id": line["id"], "start": line["start"], "end": round(line["start"] + dur, 3),
                          "accent": line["accent"], "lengthScale": round(ls, 3), "words": words})
        print(f"{line['id']:12s} {line['start']:6.2f}s -> {line['start'] + dur:6.2f}s  (limit {line['end']:.2f}, ls={ls:.3f})")
    peak = np.max(np.abs(track)) or 1
    master(track / peak * 0.8)
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    json.dump({"fps": 30, "lines": out_lines}, open(OUT_JSON, "w"), ensure_ascii=False, indent=1)
    print("wrote", OUT_WAV, OUT_JSON)


if __name__ == "__main__":
    main()
