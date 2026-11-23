"""
Prepare the narration for the Instagram reel.

  * shortens the pauses between sentences,
  * speeds the voice up 1.2x (pitch preserved, ffmpeg atempo),
  * shifts it to start after the cold-open hook,
  * maps every subtitle phrase from the original timing to the new timeline.

    python prep_audio.py --src original.mp4 --out build/   ->  build/narration.wav, build/timeline.json

The subtitle script below is the cleaned-up transcript of the original Hindi narration. Each phrase carries its
start time (seconds) in the ORIGINAL recording; highlighted words are wrapped in *stars*.
"""
import argparse, json, os, subprocess

TEMPO = 1.2
HOOK = 3.0          # seconds of cold open before the narration starts
OUTRO = 0.9         # seconds after the last word
KEEP_PAUSE = 0.10   # how much of each detected pause to keep
SPEECH_END = 53.40  # end of the last word in the original
FPS = 30

# pauses in the original (silencedetect -40 dB, >= 0.18 s)
PAUSES = [(8.951, 9.225), (9.974, 10.452), (17.309, 17.599), (25.143, 25.467), (32.265, 32.507),
          (40.518, 40.809), (47.843, 48.030)]

# (original start time, phrase); a sentence ends where the next one starts
SCRIPT = [
    (0.00, "यह गेट तो"), (0.76, "लगभग हर इंसान पर"), (1.90, "*बीप* करता है"),
    (2.98, "फिर सिक्योरिटी गार्ड्स को"), (4.60, "*कैसे* पता चलता है"),
    (5.74, "कि किसी के पास"), (6.54, "*सिक्का* है, *बंदूक* है,"), (7.98, "*बम* है, या *बेल्ट*?"),
    (8.92, "चलिए समझते हैं"),
    (10.36, "असल में,"), (11.26, "यह मशीन सिर्फ़ *बीप* नहीं करती"),
    (12.88, "बल्कि *मेटल* की मौजूदगी"), (14.42, "और उसके *इलेक्ट्रोमैग्नेटिक*"), (15.68, "*रिस्पॉन्स* को भी"),
    (16.38, "*डिटेक्ट* करती है"),
    (17.24, "इस वॉक-थ्रू मेटल डिटेक्टर के अंदर"),
    (19.60, "ख़ास *कॉइल्स* लगी होती हैं"), (21.62, "जो लगातार एक"), (22.52, "इनविज़िबल *इलेक्ट्रोमैग्नेटिक*"),
    (23.96, "*फ़ील्ड* बनाती रहती हैं"),
    (25.20, "जैसे ही कोई व्यक्ति"), (26.36, "इसके अंदर से गुज़रता है"),
    (27.84, "उसके पास मौजूद *मेटल*"), (28.98, "इस इलेक्ट्रोमैग्नेटिक फ़ील्ड में"), (30.96, "*बदलाव* पैदा करता है"),
    (32.30, "इस बदलाव की वजह से"), (33.98, "मेटल के अंदर छोटे-छोटे"), (35.52, "*इलेक्ट्रिक करंट्स* पैदा होते हैं"),
    (37.34, "मशीन के *सेंसर्स*"), (38.52, "इस बदलाव को"), (39.24, "*तुरंत* डिटेक्ट कर लेते हैं"),
    (40.60, "फिर सिग्नल की *स्ट्रेंथ*"), (41.94, "और *रिस्पॉन्स* के आधार पर"), (42.88, "मशीन को अंदाज़ा होता है"),
    (44.72, "कि मेटल ऑब्जेक्ट"), (45.70, "कितना *बड़ा* या"), (46.68, "कितना *सिग्निफ़िकेंट* है"),
    (48.20, "इसी वजह से सिस्टम"), (49.28, "*कॉइन*, *बेल्ट*, या"), (50.30, "किसी बड़े मेटल ऑब्जेक्ट के लिए"),
    (51.90, "*अलग-अलग* रिस्पॉन्स दे सकता है"),
]


def keep_segments():
    segs, t = [], 0.0
    for a, b in PAUSES:
        segs.append((t, a + KEEP_PAUSE / 2))
        t = b - KEEP_PAUSE / 2
    segs.append((t, SPEECH_END + 0.08))
    return segs


def remap(t_old, segs):
    """Original time -> reel time (seconds)."""
    acc = 0.0
    for a, b in segs:
        if t_old <= b:
            return HOOK + (acc + max(0.0, t_old - a)) / TEMPO
        acc += b - a
    return HOOK + acc / TEMPO


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    segs = keep_segments()
    parts = "".join(f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,"
                    f"afade=t=out:st={b - a - 0.012:.3f}:d=0.012[s{i}];" for i, (a, b) in enumerate(segs))
    cat = "".join(f"[s{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1,"
    flt = parts + cat + f"atempo={TEMPO},adelay={int(HOOK * 1000)}:all=1,apad=pad_dur={OUTRO + 0.5}[out]"
    wav = os.path.join(args.out, "narration.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", args.src, "-filter_complex", flt, "-map", "[out]",
                    "-ac", "2", "-ar", "48000", wav], check=True)

    speech_end = remap(SPEECH_END, segs)
    total = speech_end + OUTRO
    phrases = []
    for i, (t0, txt) in enumerate(SCRIPT):
        t1 = SCRIPT[i + 1][0] if i + 1 < len(SCRIPT) else SPEECH_END
        phrases.append(dict(text=txt, start=round(remap(t0, segs), 3), end=round(remap(t1, segs), 3)))
    tl = dict(fps=FPS, hook=HOOK, speech_end=round(speech_end, 3), duration=round(total, 3),
              frames=int(round(total * FPS)), phrases=phrases,
              remap={f"{t:.2f}": round(remap(t, segs), 3) for t in [p[0] for p in SCRIPT] + [SPEECH_END]})
    json.dump(tl, open(os.path.join(args.out, "timeline.json"), "w"), ensure_ascii=False, indent=1)
    print(f"narration -> {wav}; reel {total:.2f}s = {tl['frames']} frames")
    for p in phrases:
        print(f"  {p['start']:6.2f} f{int(p['start'] * FPS):4d}  {p['text']}")


if __name__ == "__main__":
    main()
