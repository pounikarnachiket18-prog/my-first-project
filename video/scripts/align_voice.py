"""Fit a recorded voiceover to the reel: tighten pauses, time-stretch to the target length, and write the
scene/caption timeline from the chunk -> line mapping in the script module.
usage: python3 align_voice.py <script_module> <recording.mp3> <segments.json> <out_voice.wav> <out_timeline.json>"""
import importlib, json, os, subprocess, sys
import numpy as np, soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
mod = importlib.import_module(sys.argv[1])
REC, SEGS, OUT_WAV, OUT_TL = sys.argv[2:7]
SR, FPS = 44100, 30
raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", REC, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
rec = np.frombuffer(raw, np.float32).astype(np.float64)
segs = json.load(open(SEGS))
seg_line = {s: ln for ln, ss in mod.SEG_MAP.items() for s in ss}
assert sorted(seg_line) == list(range(len(segs))), "every chunk must map to a line"

# 1) tighten pauses
PAD = 0.03
pieces, new_t, t = [], {}, mod.LEAD
for k, sg in enumerate(segs):
    a, b = max(0, sg["s"] - PAD), min(len(rec) / SR, sg["e"] + PAD)
    clip = rec[int(a * SR):int(b * SR)]
    fade = int(0.008 * SR)
    clip = clip.copy(); clip[:fade] *= np.linspace(0, 1, fade); clip[-fade:] *= np.linspace(1, 0, fade)
    new_t[k] = (t + PAD, t + len(clip) / SR - PAD)
    pieces.append(clip); t += len(clip) / SR
    if k + 1 < len(segs):
        g = mod.GAP_KEEP.get(k, mod.GAP_IN if seg_line[k + 1] == seg_line[k] else mod.GAP_LINE)
        pieces.append(np.zeros(int(g * SR))); t += g
tight = np.concatenate([np.zeros(int(mod.LEAD * SR))] + pieces)
speech_len = len(tight) / SR
# 2) time-stretch (pitch preserved) so speech + tail = TARGET
rate = speech_len / (mod.TARGET - mod.TAIL)
tmp_in, tmp_out = OUT_WAV + ".tight.wav", OUT_WAV + ".fit.wav"
sf.write(tmp_in, tight.astype(np.float32), SR)
subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-i", tmp_in, "-af", f"atempo={rate:.5f}", "-ar", str(SR), tmp_out])
fit, _ = sf.read(tmp_out); os.remove(tmp_in); os.remove(tmp_out)
fit = np.concatenate([fit, np.zeros(int(mod.TAIL * SR))])
fit = fit / (np.abs(fit).max() + 1e-9) * 0.89
sf.write(OUT_WAV, fit.astype(np.float32), SR)
T = lambda x: x / rate
print(f"recording {len(rec)/SR:.2f}s -> tightened {speech_len:.2f}s -> x{rate:.3f} -> {len(fit)/SR:.2f}s")

# 3) word timings: spread each line's words over its chunks' speech time (gaps skipped), weighted by word length
lines_out = []
last = T(mod.LEAD)
for i, (scene, hi, rom) in enumerate(mod.LINES):
    words = [w for c in rom.split(",") for w in c.split()]
    # restore clause commas on words (as build_voice does)
    clauses = [c.strip() for c in rom.split(",") if c.strip()]
    wl = []
    for ci, c in enumerate(clauses):
        cw = c.split()
        for j, w in enumerate(cw):
            wl.append(w + ("," if j == len(cw) - 1 and ci < len(clauses) - 1 else ""))
    if i in mod.SKIP:
        lines_out.append({"id": i, "scene": scene, "skip": True, "t0": round(last, 3), "t1": round(last, 3), "words": [{"text": w, "t0": round(last, 3), "t1": round(last, 3)} for w in wl]})
        continue
    spans = [(T(new_t[k][0]), T(new_t[k][1])) for k in mod.SEG_MAP[i]]
    total = sum(b - a for a, b in spans)
    wts = np.array([max(1, len(w.strip(",.?!"))) + 1 for w in wl], float)
    edges = np.concatenate([[0], np.cumsum(wts) / wts.sum()]) * total
    def at(x):  # speech-time offset -> absolute time
        for a, b in spans:
            if x <= b - a + 1e-9: return a + x
            x -= b - a
        return spans[-1][1]
    ws = [{"text": w, "t0": round(at(edges[j]) if j == 0 else at(edges[j] + 1e-4), 3), "t1": round(at(edges[j + 1]), 3)} for j, w in enumerate(wl)]
    lines_out.append({"id": i, "scene": scene, "t0": round(spans[0][0], 3), "t1": round(spans[-1][1], 3), "words": ws})
    last = spans[-1][1]
    print(f"L{i:02d} {scene:8s} {spans[0][0]:6.2f}-{spans[-1][1]:6.2f}  {rom}")

dur = len(fit) / SR
chunks = []
for ln in lines_out:
    if ln.get("skip"): continue
    cur = []
    for w in ln["words"]:
        cur.append(w)
        if len(cur) >= 4 or (w["text"].endswith(",") and len(cur) >= 2):
            chunks.append(cur); cur = []
    if cur:
        if len(cur) == 1 and chunks and chunks[-1][-1] in ln["words"] and len(chunks[-1]) < 5: chunks[-1].append(cur[0])
        else: chunks.append(cur)
cap = []
for k, c in enumerate(chunks):
    nxt = chunks[k + 1][0]["t0"] if k + 1 < len(chunks) else dur
    cap.append({"t0": c[0]["t0"], "t1": round(min(nxt, c[-1]["t1"] + 0.6), 3), "words": c})
scenes = []
for s in mod.SCENES:
    ls = [l for l in lines_out if l["scene"] == s and not l.get("skip")]
    if ls: scenes.append({"id": s, "t0": ls[0]["t0"], "t1": ls[-1]["t1"]})
for k in range(len(scenes)):
    scenes[k]["start"] = 0 if k == 0 else round((scenes[k - 1]["t1"] + scenes[k]["t0"]) / 2, 3)
for k in range(len(scenes)):
    scenes[k]["end"] = scenes[k + 1]["start"] if k + 1 < len(scenes) else round(dur, 3)
tl = {"fps": FPS, "duration": round(dur, 3), "frames": int(np.ceil(dur * FPS)), "lines": lines_out, "captions": cap, "scenes": scenes,
      "coldKeyword": getattr(mod, "COLD_KEYWORD", None), "voice": {"source": os.path.basename(REC), "tempo": round(rate, 4)}}
os.makedirs(os.path.dirname(OUT_TL), exist_ok=True)
json.dump(tl, open(OUT_TL, "w"), ensure_ascii=False, indent=1)
print("total", round(dur, 2), "s", tl["frames"], "frames; scenes", [(s["id"], s["start"], s["end"]) for s in scenes])
