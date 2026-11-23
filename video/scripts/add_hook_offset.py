"""Delay the narration so it starts over the live-action hook clips.
Pads public/navy/voice.wav and shifts src/navy/timeline.json so the 'hook'
scene lasts exactly as long as hookA + hookB. Safe to run once (records the offset)."""
import json, os, subprocess
import numpy as np, soundfile as sf

HERE = os.path.dirname(__file__)
PUB = os.path.join(HERE, "..", "public", "navy")
TL = os.path.join(HERE, "..", "src", "navy", "timeline.json")
tl = json.load(open(TL))
if tl.get("hookOffset"):
    raise SystemExit(f"already offset by {tl['hookOffset']} s")

dur = lambda f: float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(PUB, f)]))
hookA, hookB = dur("hookA.mp4"), dur("hookB.mp4")
target = hookA + hookB - 0.05  # hook scene ends just before the footage runs out
hook = tl["scenes"][0]
off = round(target - hook["end"], 3)
assert off >= 0, "narration hook is longer than the clips"

v, sr = sf.read(os.path.join(PUB, "voice.wav"), dtype="float32")
sf.write(os.path.join(PUB, "voice.wav"), np.concatenate([np.zeros(int(off * sr), np.float32), v]), sr)

for ln in tl["lines"]:
    ln["t0"] = round(ln["t0"] + off, 3); ln["t1"] = round(ln["t1"] + off, 3)
    for w in ln["words"]:
        w["t0"] = round(w["t0"] + off, 3); w["t1"] = round(w["t1"] + off, 3)
for c in tl["captions"]:
    c["t0"] = round(c["t0"] + off, 3); c["t1"] = round(c["t1"] + off, 3)
    for w in c["words"]:
        w["t0"] = round(w["t0"] + off, 3); w["t1"] = round(w["t1"] + off, 3)
for k, s in enumerate(tl["scenes"]):
    for key in ("t0", "t1", "end"):
        s[key] = round(s[key] + off, 3)
    if k:
        s["start"] = round(s["start"] + off, 3)
tl["duration"] = round(tl["duration"] + off, 3)
tl["frames"] = int(np.ceil(tl["duration"] * tl["fps"]))
tl["hookOffset"] = off
tl["hookClips"] = {"hookA": round(hookA, 3), "hookB": round(hookB, 3)}
json.dump(tl, open(TL, "w"), ensure_ascii=False, indent=1)
print(f"offset {off} s; hook scene now 0-{tl['scenes'][0]['end']} s; total {tl['duration']} s")
