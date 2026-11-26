"""
Synthesise the metro voiceover (VOICEOVER_v3.md) with Kokoro, an open-source offline TTS model, and lay each line
on its shot so it replaces the original narration.

    pip install kokoro-onnx soundfile
    # model files: kokoro-v1.0.int8.onnx and voices-v1.0.bin from the kokoro-onnx GitHub releases (model-files-v1.0)
    python tts_voiceover.py --model kokoro-v1.0.int8.onnx --voices voices-v1.0.bin --out build/narration_metro.wav

The output has the same format as prep_audio.py's narration (48 kHz stereo, the reel's length), so sound.py and
post.py take it unchanged. A line that would run into the next one is sped up a little (at most 1.25x); if it still
doesn't fit, the following lines move later.
"""
import argparse, os, subprocess, sys, tempfile, wave

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cuts import FPS, OUT_END

VOICE = "hm_omega"        # Kokoro's male Hindi voice
SPEED = 1.2
SR = 48000
GAP = 0.12                # minimum silence between lines (s)
MAX_TEMPO = 1.25

# (start in the reel in seconds, line). Hindi in Devanagari, English terms transliterated so they are pronounced the
# way they are said in Hindi.
LINES = [
    (3.0, "मेट्रो का मेटल डिटेक्टर, जेब का छोटा सा सिक्का भी पकड़ लेता है। कैसे?"),
    (8.0, "जवाब है, इलेक्ट्रोमैग्नेटिक इंडक्शन।"),
    (10.5, "गेट में दो कॉइल्स होती हैं, ट्रांसमीटर और रिसीवर।"),
    (13.3, "दोनों मिलकर मेटल को पाँच स्टेप्स में पकड़ती हैं।"),
    (17.0, "ट्रांसमीटर कॉइल हर सेकंड सैकड़ों करंट पल्स भेजती है।"),
    (20.4, "इससे गेट के बीच मैग्नेटिक फ़ील्ड बनता है।"),
    (23.4, "शरीर से फ़ील्ड नहीं बदलता। लेकिन मेटल आते ही, फ़ील्ड डिस्टर्ब हो जाता है।"),
    (29.0, "इस बदलाव से मेटल के अंदर एडी करंट्स घूमने लगते हैं।"),
    (33.2, "ये करंट्स उल्टा फ़ील्ड बनाते हैं, रिसीवर इसे पकड़ता है, और अलार्म बज जाता है!"),
    (37.6, "ज़ोन लाइट्स बताती हैं मेटल कहाँ है। सिग्नल जितना स्ट्रॉन्ग, मेटल उतना बड़ा।"),
    (42.0, "इसलिए सिक्का, बेल्ट, बड़ा मेटल, सबका रिस्पॉन्स अलग।"),
    (44.7, "बस, इतना सा साइंस।"),
    (46.4, "और एक्सप्लेनर्स के लिए, फ़ॉलो फ़ॉर मोर!"),]


def to_48k_stereo(a, sr, tempo=1.0):
    """Resample (and optionally speed up, pitch preserved) with ffmpeg; returns float32 (n, 2)."""
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, "a.wav"), os.path.join(d, "b.wav")
        with wave.open(src, "w") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
            w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
        flt = f"atempo={tempo:.4f}," if tempo != 1.0 else ""
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", flt + f"aresample={SR}", "-ac", "2", dst],
                       check=True)
        with wave.open(dst) as w:
            b = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return b.reshape(-1, 2)


def trim(a, sr, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx):
        return a
    pad = int(0.04 * sr)
    return a[max(0, idx[0] - pad): idx[-1] + pad]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--voices", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    from kokoro_onnx import Kokoro
    k = Kokoro(args.model, args.voices)
    clips = []
    for t0, text in LINES:
        a, sr = k.create(text, voice=VOICE, speed=SPEED, lang="hi")
        clips.append((t0, text, trim(np.asarray(a, np.float32), sr), sr))
    total = OUT_END / FPS
    out = np.zeros((int(total * SR), 2), np.float32)
    cursor = 0.0
    for i, (t0, text, a, sr) in enumerate(clips):
        start = max(t0, cursor)
        limit = (clips[i + 1][0] if i + 1 < len(clips) else total - 0.15) - GAP
        dur = len(a) / sr
        tempo = min(MAX_TEMPO, max(1.0, dur / max(0.1, limit - start)))
        b = to_48k_stereo(a, sr, tempo)
        i0 = int(start * SR); n = min(len(b), len(out) - i0)
        out[i0:i0 + n] += b[:n]
        cursor = start + len(b) / SR + GAP
        print(f"{start:6.2f}-{start + len(b) / SR:6.2f}s  x{tempo:.2f}  {text}")
    # match the original narration's level: -16 dBFS RMS over the speech
    sp = out[np.abs(out).max(1) > 0.01]
    gain = 10 ** (-16 / 20) / max(1e-6, float(np.sqrt((sp ** 2).mean())))
    out = np.clip(out * gain, -0.98, 0.98)
    with wave.open(args.out, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    print("voiceover ->", args.out)


if __name__ == "__main__":
    main()
