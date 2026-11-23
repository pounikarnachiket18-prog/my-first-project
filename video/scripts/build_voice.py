"""Synthesize the Hindi narration with Piper and write the caption/scene timeline.

usage: python3 build_voice.py <piper_model.onnx> <out_dir>
writes <out_dir>/voice.wav and <out_dir>/../../src/navy/timeline.json
"""
import json, os, re, sys
import numpy as np, librosa, soundfile as sf
from piper import PiperVoice, SynthesisConfig

sys.path.insert(0, os.path.dirname(__file__))
from navy_script import LINES, SCENES

MODEL, OUT = sys.argv[1], sys.argv[2]
SR_OUT = 44100
FPS = 30
LEAD, CLAUSE_GAP, LINE_GAP, SCENE_GAP, TAIL = 0.4, 0.11, 0.24, 0.45, 1.8

voice = PiperVoice.load(MODEL)
cfg = SynthesisConfig(length_scale=0.8, noise_scale=0.6, noise_w_scale=0.75)


def synth(text):
    chunks = list(voice.synthesize(text, syn_config=cfg))
    sr = chunks[0].sample_rate
    a = np.concatenate([c.audio_float_array for c in chunks]).astype(np.float32)
    a, _ = librosa.effects.trim(a, top_db=38)
    return librosa.resample(a, orig_sr=sr, target_sr=SR_OUT)


def weight(w):
    return max(1, len(re.sub(r"[^ऀ-ॿ]", "", w)))


audio = [np.zeros(int(LEAD * SR_OUT), np.float32)]
t = LEAD
lines_out, prev_scene = [], None
for i, (scene, hi, rom) in enumerate(LINES):
    if prev_scene is not None:
        g = SCENE_GAP if scene != prev_scene else LINE_GAP
        audio.append(np.zeros(int(g * SR_OUT), np.float32)); t += g
    prev_scene = scene
    hi_cl = [c.strip() for c in hi.split(",") if c.strip()]
    ro_cl = [c.strip() for c in rom.split(",") if c.strip()]
    assert len(hi_cl) == len(ro_cl), (i, hi_cl, ro_cl)
    words, line_start = [], t
    for k, (hc, rc) in enumerate(zip(hi_cl, ro_cl)):
        hw, rw = hc.split(), rc.split()
        assert len(hw) == len(rw), (i, hw, rw)
        clip = synth(hc.replace("_", " "))
        dur = len(clip) / SR_OUT
        ws = np.array([weight(w) for w in hw], float)
        edges = np.concatenate([[0], np.cumsum(ws) / ws.sum()]) * dur
        last = k == len(hi_cl) - 1
        for j, r in enumerate(rw):
            suffix = "," if (j == len(rw) - 1 and not last) else ""
            words.append({"text": r + suffix, "t0": round(t + edges[j], 3), "t1": round(t + edges[j + 1], 3)})
        audio.append(clip); t += dur
        if not last:
            audio.append(np.zeros(int(CLAUSE_GAP * SR_OUT), np.float32)); t += CLAUSE_GAP
    lines_out.append({"id": i, "scene": scene, "t0": round(line_start, 3), "t1": round(t, 3), "words": words})
    print(f"L{i:02d} {scene:8s} {line_start:6.2f}-{t:6.2f}  {rom}")

audio.append(np.zeros(int(TAIL * SR_OUT), np.float32)); t += TAIL
v = np.concatenate(audio)
v = v / (np.abs(v).max() + 1e-9) * 0.89
os.makedirs(OUT, exist_ok=True)
sf.write(os.path.join(OUT, "voice.wav"), v, SR_OUT)

# caption chunks: <=4 words, never crossing a clause comma when avoidable
chunks = []
for ln in lines_out:
    cur = []
    for w in ln["words"]:
        cur.append(w)
        if len(cur) >= 4 or (w["text"].endswith(",") and len(cur) >= 2):
            chunks.append(cur); cur = []
    if cur:
        if len(cur) == 1 and chunks and chunks[-1][-1] in ln["words"] and len(chunks[-1]) < 5:
            chunks[-1].append(cur[0])
        else:
            chunks.append(cur)
cap = []
for k, c in enumerate(chunks):
    nxt = chunks[k + 1][0]["t0"] if k + 1 < len(chunks) else t
    end = min(nxt, c[-1]["t1"] + 0.6)
    cap.append({"t0": c[0]["t0"], "t1": round(end, 3), "words": c})

scenes = []
for s in SCENES:
    ls = [l for l in lines_out if l["scene"] == s]
    scenes.append({"id": s, "t0": ls[0]["t0"], "t1": ls[-1]["t1"]})
# scene boundaries: cut halfway into the gap before the scene's first line
for k in range(len(scenes)):
    scenes[k]["start"] = 0 if k == 0 else round((scenes[k - 1]["t1"] + scenes[k]["t0"]) / 2, 3)
for k in range(len(scenes)):
    scenes[k]["end"] = scenes[k + 1]["start"] if k + 1 < len(scenes) else round(t, 3)

tl = {"fps": FPS, "duration": round(t, 3), "frames": int(np.ceil(t * FPS)), "lines": lines_out, "captions": cap, "scenes": scenes}
dst = os.path.join(os.path.dirname(__file__), "..", "src", "navy", "timeline.json")
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump(tl, open(dst, "w"), ensure_ascii=False, indent=1)
print("total", round(t, 2), "s", tl["frames"], "frames")
