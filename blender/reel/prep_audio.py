"""
Prepare the narration for the Instagram reel.

  * shortens the pauses between sentences,
  * speeds the voice up 1.2x (pitch preserved, ffmpeg atempo),
  * shifts it to start after the cold-open hook,
  * maps every subtitle phrase from the original timing to the new timeline.

    python prep_audio.py --src original.mp4 --out build/   ->  build/narration.wav, build/timeline.json

The script below is the cleaned-up transcript of the original Hindi narration, with a Hinglish (Roman Hindi) and
an English caption for each phrase; cuts.py CAPTIONS picks which one is shown. Each phrase carries its start time (seconds) in the ORIGINAL recording; highlighted caption words are
wrapped in *stars*.
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

# (original start time, Hindi as spoken, Hinglish caption, English caption); a phrase ends where the next one starts
SCRIPT = [
    (0.00, 'यह गेट तो', 'Yeh gate toh', 'This gate...'),
    (0.76, 'लगभग हर इंसान पर', 'lagbhag har insaan par', 'for almost everyone,'),
    (1.90, '*बीप* करता है', '*BEEP* karta hai', 'it *beeps*.'),
    (2.98, 'फिर सिक्योरिटी गार्ड्स को', 'Phir security guards ko', 'So how do security guards'),
    (4.60, '*कैसे* पता चलता है', '*kaise* pata chalta hai', '*know*'),
    (5.74, 'कि किसी के पास', 'ki kisi ke paas', 'whether someone has'),
    (6.54, '*सिक्का* है, *बंदूक* है,', '*sikka* hai, *bandook* hai,', 'a *coin*, a *gun*,'),
    (7.98, '*बम* है, या *बेल्ट*?', '*bomb* hai, ya *belt*?', 'a *bomb*, or a *belt*?'),
    (8.92, 'चलिए समझते हैं', 'Chaliye samajhte hain', "Let's find out."),
    (10.36, 'असल में,', 'Asal mein,', 'Actually,'),
    (11.26, 'यह मशीन सिर्फ़ *बीप* नहीं करती', 'yeh machine sirf *beep* nahi karti', "this machine doesn't just *beep*."),
    (12.88, 'बल्कि *मेटल* की मौजूदगी', 'balki *metal* ki maujoodgi', 'It detects the presence of *metal*'),
    (14.42, 'और उसके *इलेक्ट्रोमैग्नेटिक*', 'aur uske *electromagnetic*', 'and its *electromagnetic*'),
    (15.68, '*रिस्पॉन्स* को भी', '*response* ko bhi', '*response*'),
    (16.38, '*डिटेक्ट* करती है', '*detect* karti hai', 'as well.'),
    (17.24, 'इस वॉक-थ्रू मेटल डिटेक्टर के अंदर', 'Is walk-through metal detector ke andar', 'Inside this walk-through metal detector'),
    (19.60, 'ख़ास *कॉइल्स* लगी होती हैं', 'khaas *coils* lagi hoti hain', 'are special *coils*'),
    (21.62, 'जो लगातार एक', 'jo lagaatar ek', 'that constantly create'),
    (22.52, 'इनविज़िबल *इलेक्ट्रोमैग्नेटिक*', 'invisible *electromagnetic*', 'an invisible *electromagnetic*'),
    (23.96, '*फ़ील्ड* बनाती रहती हैं', '*field* banaati rehti hain', '*field*.'),
    (25.20, 'जैसे ही कोई व्यक्ति', 'Jaise hi koi vyakti', 'As soon as someone'),
    (26.36, 'इसके अंदर से गुज़रता है', 'iske andar se guzarta hai', 'walks through it,'),
    (27.84, 'उसके पास मौजूद *मेटल*', 'uske paas maujood *metal*', "the *metal* they're carrying"),
    (28.98, 'इस इलेक्ट्रोमैग्नेटिक फ़ील्ड में', 'is electromagnetic field mein', 'changes this electromagnetic'),
    (30.96, '*बदलाव* पैदा करता है', '*badlaav* paida karta hai', '*field*.'),
    (32.30, 'इस बदलाव की वजह से', 'Is badlaav ki wajah se,', 'Because of this change,'),
    (33.98, 'मेटल के अंदर छोटे-छोटे', 'metal ke andar chhote-chhote', 'tiny'),
    (35.52, '*इलेक्ट्रिक करंट्स* पैदा होते हैं', '*electric currents* paida hote hain', '*electric currents* form inside the metal.'),
    (37.34, 'मशीन के *सेंसर्स*', 'Machine ke *sensors*', "The machine's *sensors*"),
    (38.52, 'इस बदलाव को', 'is badlaav ko', 'pick up this change'),
    (39.24, '*तुरंत* डिटेक्ट कर लेते हैं', '*turant* detect kar lete hain', '*instantly*.'),
    (40.60, 'फिर सिग्नल की *स्ट्रेंथ*', 'Phir signal ki *strength*', "Then, from the signal's *strength*"),
    (41.94, 'और *रिस्पॉन्स* के आधार पर', 'aur *response* ke aadhaar par', 'and *response*,'),
    (42.88, 'मशीन को अंदाज़ा होता है', 'machine ko andaaza hota hai', 'the machine can tell'),
    (44.72, 'कि मेटल ऑब्जेक्ट', 'ki metal object', 'whether the metal object'),
    (45.70, 'कितना *बड़ा* या', 'kitna *bada* ya', 'is *big*'),
    (46.68, 'कितना *सिग्निफ़िकेंट* है', 'kitna *significant* hai', 'or *significant*.'),
    (48.20, 'इसी वजह से सिस्टम', 'Isi wajah se system', "That's why the system"),
    (49.28, '*कॉइन*, *बेल्ट*, या', '*coin*, *belt*, ya', 'can respond to a *coin*, a *belt*,'),
    (50.30, 'किसी बड़े मेटल ऑब्जेक्ट के लिए', 'kisi bade metal object ke liye', 'or a bigger metal object'),
    (51.90, '*अलग-अलग* रिस्पॉन्स दे सकता है', '*alag-alag* response de sakta hai', '*differently*.'),
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
    for i, (t0, hi, hg, en) in enumerate(SCRIPT):
        t1 = SCRIPT[i + 1][0] if i + 1 < len(SCRIPT) else SPEECH_END
        phrases.append(dict(hinglish=hg, english=en, hindi=hi, start=round(remap(t0, segs), 3), end=round(remap(t1, segs), 3)))
    tl = dict(fps=FPS, hook=HOOK, speech_end=round(speech_end, 3), duration=round(total, 3),
              frames=int(round(total * FPS)), phrases=phrases,
              remap={f"{t:.2f}": round(remap(t, segs), 3) for t in [p[0] for p in SCRIPT] + [SPEECH_END]})
    json.dump(tl, open(os.path.join(args.out, "timeline.json"), "w"), ensure_ascii=False, indent=1)
    print(f"narration -> {wav}; reel {total:.2f}s = {tl['frames']} frames")
    for p in phrases:
        print(f"  {p['start']:6.2f} f{int(p['start'] * FPS):4d}  {p['hinglish']}")


if __name__ == "__main__":
    main()
