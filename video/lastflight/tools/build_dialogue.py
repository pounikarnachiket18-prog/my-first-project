"""THE LAST FLIGHT: synthesise and process the four dialogue lines.

Voices (Piper neural TTS, downloaded by lastflight/tools/fetch_assets.sh):
  Captain Arjun Rao      hi_IN-rohan-medium    (Indian male; English lines written in Devanagari
                                                so they come out with a natural Indian accent)
  Control (radio)        hi_IN-pratham-medium  (a second Indian male voice)

Processing:
  Arjun    helmet boom mic: high-pass, presence lift, light saturation + compression, short cockpit reflection
  Control  radio: 300-3400 Hz band, hard clipping, carrier hiss, squelch clicks at both ends

Outputs (48 kHz):
  public/lastflight/audio/dialogue.wav      mono, full 60 s timeline, dialogue only
  src/lastflight/data/dialogue.json         subtitle cues (seconds) for the Remotion edit

Run from video/:  python3 lastflight/tools/build_dialogue.py
Every line was checked for intelligibility with a Whisper speech recogniser (see README).
"""
import io, json, os, wave
import numpy as np
from scipy import signal
from scipy.signal import resample_poly
from piper import PiperVoice, SynthesisConfig

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VOICES = os.path.join(ROOT, "lastflight", "voices")
OUT_WAV = os.path.join(ROOT, "public", "lastflight", "audio", "dialogue.wav")
OUT_JSON = os.path.join(ROOT, "src", "lastflight", "data", "dialogue.json")
SR = 48000
TOTAL = 60.0
rng = np.random.default_rng(7)

# who, start (s), subtitle text, spoken chunks [(devanagari text, length_scale, pause_after_s, pitch_semitones)]
LINES = [
    ("arjun", 1.15, "Control… something is wrong.",
     [("कन्ट्रोल...", 1.1, 0.38, 0.0), ("समथिंग इज़ रॉन्ग.", 1.0, 0.0, -0.5)]),
    ("control", 26.25, "Captain! You're losing altitude!",
     [("कैप्टन!", 0.85, 0.12, 1.0), ("यू आर लूज़िंग ऑल्टिट्यूड!", 0.82, 0.0, 1.0)]),
    ("arjun", 42.15, "I'm not leaving her behind!",
     [("आइ एम नॉट लीविंग हर बिहाइंड!", 0.86, 0.0, 1.5)]),
    ("control", 53.0, "Captain… this was only the beginning.",
     [("कैप्टन...", 1.05, 0.5, -0.5), ("दिस वाज़ ओनली द बिगिनिंग.", 1.06, 0.0, -1.0)]),
]
VOICE_FILE = {"arjun": "hi_IN-rohan-medium", "control": "hi_IN-pratham-medium"}


def load(name):
    return PiperVoice.load(os.path.join(VOICES, f"vits-piper-{name}", f"{name}.onnx"))


def synth(v, text, ls):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        v.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls, noise_scale=0.62, noise_w_scale=0.8))
    buf.seek(44)
    x = np.frombuffer(buf.read(), dtype=np.int16).astype(np.float64) / 32768.0
    return resample_poly(x, SR, v.config.sample_rate)


def trim(x, thr=0.01):
    env = np.convolve(np.abs(x), np.ones(512) / 512, mode="same")
    idx = np.where(env > thr)[0]
    return x[max(0, idx[0] - 300): min(len(x), idx[-1] + 1200)] if len(idx) else x[:0]


def pitch(x, semis):
    """Small pitch lift for urgency (resample; the slight tempo change is wanted)."""
    if abs(semis) < 1e-3:
        return x
    r = 2 ** (semis / 12)
    up, down = int(round(1000 / r)), 1000
    return resample_poly(x, up, down)


def sos(kind, f, order=4):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def compress(x, thr=0.25, ratio=4.0, att=0.004, rel=0.12):
    a = np.abs(x)
    ka, kr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    env = np.maximum(signal.lfilter([1 - kr], [1, -kr], a), signal.lfilter([1 - ka], [1, -ka], a))
    g = np.where(env > thr, (thr + (env - thr) / ratio) / (env + 1e-9), 1.0)
    return x * g


def helmet_mic(x):
    x = signal.sosfilt(sos("highpass", 170), x)
    pres = signal.sosfilt(sos("bandpass", [2200, 4800], 2), x)
    x = x + 0.35 * pres
    x = signal.sosfilt(sos("lowpass", 9000), x)
    x = np.tanh(2.2 * x / (np.max(np.abs(x)) + 1e-9)) * 0.8
    x = compress(x, 0.3, 3.5)
    ir = np.zeros(int(0.03 * SR)); ir[0] = 1; ir[int(0.007 * SR)] = 0.22; ir[int(0.019 * SR)] = 0.1   # cockpit reflections
    return np.convolve(x, ir)[: len(x)]


def squelch(d=0.07, g=0.6):
    n = int(d * SR)
    c = rng.standard_normal(n) * np.exp(-np.arange(n) / (n * 0.25)) * g
    c[: int(0.004 * SR)] += 0.9 * np.sign(rng.standard_normal(int(0.004 * SR)))
    return signal.sosfilt(sos("bandpass", [600, 4500], 2), c)


def radio(x):
    x = signal.sosfilt(sos("bandpass", [300, 3400], 6), x)
    x = x / (np.max(np.abs(x)) + 1e-9)
    x = np.clip(x * 1.9, -0.8, 0.8)                     # overdriven handset
    x = np.round(x * 96) / 96                              # coarse quantisation grit
    x = signal.sosfilt(sos("bandpass", [330, 3300], 4), x)
    # carrier hiss + slow fading
    hiss = signal.sosfilt(sos("bandpass", [900, 5000], 2), rng.standard_normal(len(x))) * 0.07
    t = np.arange(len(x)) / SR
    fade = 0.85 + 0.15 * np.sin(2 * np.pi * 1.7 * t) * np.sin(2 * np.pi * 0.37 * t + 1)
    x = x * fade + hiss
    head, tail = squelch(0.06, 0.5), squelch(0.12, 0.7)
    pre = np.zeros(int(0.09 * SR)); post = np.zeros(int(0.05 * SR))
    hiss_pre = signal.sosfilt(sos("bandpass", [900, 5000], 2), rng.standard_normal(len(pre))) * 0.07
    out = np.concatenate([head, hiss_pre, x, post, tail])
    return out, len(head) + len(pre)                       # audio, sample offset where the voice starts


# Piper's synthesis is stochastic, so each line is generated TAKES times and the take that a Whisper
# recogniser transcribes most accurately (after mic/radio processing) is kept, like picking the best take
# in a recording session. Without the recogniser model the first take is used.
TAKES = 12
ASR_DIR = os.environ.get("LF_ASR", "/tmp/asr/sherpa-onnx-whisper-base.en")


def recogniser():
    try:
        import sherpa_onnx
        return sherpa_onnx.OfflineRecognizer.from_whisper(
            encoder=f"{ASR_DIR}/base.en-encoder.int8.onnx", decoder=f"{ASR_DIR}/base.en-decoder.int8.onnx",
            tokens=f"{ASR_DIR}/base.en-tokens.txt", num_threads=2)
    except Exception as e:  # noqa
        print("no ASR model -> first take is used:", e)
        return None


def score(asr, y, target):
    import difflib, re
    y = np.concatenate([np.zeros(SR // 3), y, np.zeros(SR // 2)])   # judged as it will sit in the track
    s = asr.create_stream()
    s.accept_waveform(16000, resample_poly(y, 1, 3).astype(np.float32))
    asr.decode_stream(s)
    norm = lambda t: re.sub(r"[^a-z ]", "", t.lower().replace("'re", " are").replace("'m", " am")).split()
    got = s.result.text
    return difflib.SequenceMatcher(None, norm(got), norm(target)).ratio(), got


def take(voice, who, chunks):
    parts = []
    for t, ls, pause, semis in chunks:
        parts += [trim(pitch(synth(voice, t, ls), semis)), np.zeros(int(pause * SR))]
    x = np.concatenate(parts)
    x = x / (np.max(np.abs(x)) + 1e-9)
    if who == "arjun":
        return x, helmet_mic(x), 0
    y, off = radio(x)
    return x, y, off


def main():
    voices = {k: load(v) for k, v in VOICE_FILE.items()}
    asr = recogniser()
    track = np.zeros(int(TOTAL * SR) + SR)
    cues = []
    for who, start, text, chunks in LINES:
        best = None
        for k in range(TAKES if asr else 1):
            x, y, off = take(voices[who], who, chunks)
            sc, got = score(asr, y, text) if asr else (1.0, "")
            if best is None or sc > best[0]:
                best = (sc, got, x, y, off)
            if sc >= 0.999:
                break
        sc, got, x, y, off = best
        if asr:
            print(f"   best of {k + 1} takes: score {sc:.2f}  heard: {got!r}")
        gain = 0.9 if who == "arjun" else 0.8
        s = int(start * SR) - off
        track[s: s + len(y)] += y * gain
        dur = len(x) / SR
        cues.append({"who": who, "text": text, "start": round(start, 3), "end": round(start + dur, 3)})
        print(f"{who:8s} {start:6.2f}-{start + dur:6.2f}s  {text}")
    track = track[: int(TOTAL * SR)]
    os.makedirs(os.path.dirname(OUT_WAV), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with wave.open(OUT_WAV, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(track, -1, 1) * 32767).astype(np.int16).tobytes())
    with open(OUT_JSON, "w") as f:
        json.dump(cues, f, indent=1, ensure_ascii=False)
    print("wrote", OUT_WAV, OUT_JSON)


if __name__ == "__main__":
    main()
