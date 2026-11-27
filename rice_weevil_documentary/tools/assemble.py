"""Edit, grade, title, subtitle and export the final film with ffmpeg.

Usage: python tools/assemble.py [--preview] [--reuse-segments]
  --reuse-segments  keep existing renders/segments/*.mp4 (use after audio/subtitle-only changes)
Inputs : renders/frames/frame_0001..1500.png, assets/audio/mix.wav, assets/audio/subtitles.json
Outputs: final/the_invisible_invader_50s.mp4 (+ final/subtitles.ass)
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES = os.path.join(ROOT, "renders", "frames")
SEGS = os.path.join(ROOT, "renders", "segments")
FINAL = os.path.join(ROOT, "final")
FONTS = os.path.join(ROOT, "assets", "fonts")
AUDIO = os.path.join(ROOT, "assets", "audio")
W, H, FPS = 1080, 1920, 30

# scene ranges and how each one enters / leaves (frames of dip, colour)
SCENES = [
    ("S1_Mystery", 1, 180, (10, "black"), (4, "black")),
    ("S2_Invader", 181, 390, (4, "black"), (5, "black")),
    ("S3_SecretEgg", 391, 630, (5, "black"), (0, None)),        # match-cut into S4
    ("S4_HiddenDestruction", 631, 930, (0, None), (6, "white")),
    ("S5_Transformation", 931, 1200, (8, "white"), (5, "black")),
    ("S6_FinalReveal", 1201, 1410, (5, "black"), (3, "white")),
    ("S7_Takeaway", 1411, 1500, (6, "white"), (0, None)),       # final fade done on master
]

GRADE = ("scale={w}:{h}:flags=lanczos,unsharp=5:5:0.6:5:5:0.0,"
         "eq=contrast=1.05:saturation=1.06:gamma=0.98,"
         "format=gbrp,split[base][glow];"
         "[glow]curves=all='0/0 0.72/0 1/1',gblur=sigma=14[g];"
         "[base][g]blend=all_mode=screen:all_opacity=0.28,"
         "vignette=angle=PI/6,format=yuv420p,noise=alls=3:allf=t")


def run(cmd):
    print(" ".join(cmd[:6]), "...", flush=True)
    subprocess.run(cmd, check=True)


def t_ass(sec):
    sec = max(0.0, sec)
    h = int(sec // 3600)
    m = int(sec % 3600 // 60)
    s = sec % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def fr(f):
    return (f - 1) / FPS


def build_ass(path):
    subs = json.load(open(os.path.join(AUDIO, "subtitles.json"), encoding="utf-8"))
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Noto Sans Devanagari,62,&H00FFFFFF,&H00FFFFFF,&H00101010,&H96000000,1,0,0,0,100,100,0,0,1,3.2,1.5,2,80,80,250,1
Style: Label,Cinzel,66,&H00F2F2F2,&H00FFFFFF,&H00141414,&H64000000,1,0,0,0,100,100,6,0,1,2,1,8,60,60,250,1
Style: Small,Inter,34,&H00D8D8D8,&H00FFFFFF,&H00141414,&H64000000,0,0,0,0,100,100,2,0,1,1.6,0,8,60,60,330,1
Style: Stage,Inter,30,&H00FFFFFF,&H00FFFFFF,&H00101010,&H64000000,1,0,0,0,100,100,4,0,1,1.6,0,8,60,60,120,1
Style: Title,Cinzel,92,&H00FFFFFF,&H00FFFFFF,&H000A0A0A,&H78000000,1,0,0,0,100,100,8,0,1,2.5,2,8,50,50,300,1
Style: Card,Inter,44,&H00E9F4FF,&H00FFFFFF,&H000A0A0A,&H78000000,1,0,0,0,100,100,5,0,1,2.2,1,2,60,60,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for s in subs:
        txt = (s["hi"] + r"\N{\fnInter\fs40\b0\c&HB9E3FF&}" + s["en"])
        ev.append(f"Dialogue: 0,{t_ass(s['start'])},{t_ass(s['end'])},Sub,,0,0,0,,"
                  r"{\fad(120,120)}" + txt)
    # species card (scene 2) with a hairline rule
    ev.append(f"Dialogue: 1,{t_ass(fr(232))},{t_ass(fr(388))},Label,,0,0,0,,"
              r"{\fad(400,300)\i1}SITOPHILUS ORYZAE")
    ev.append(f"Dialogue: 1,{t_ass(fr(240))},{t_ass(fr(388))},Small,,0,0,0,,"
              r"{\fad(400,300)}RICE WEEVIL  •  ADULT LENGTH 2–4 mm")
    ev.append(f"Dialogue: 1,{t_ass(fr(236))},{t_ass(fr(388))},Small,,0,0,0,,"
              r"{\fad(400,300)\an7\pos(390,318)\p1\bord0\shad0\c&HD8D8D8&}m 0 0 l 300 0 l 300 3 l 0 3{\p0}")
    # life-cycle tracker: egg -> larva -> pupa -> adult (inside the grain)
    stages = ["EGG", "LARVA", "PUPA", "ADULT"]
    spans = [(612, 690, 0), (690, 990, 1), (990, 1105, 2), (1105, 1215, 3)]
    for a, b, k in spans:
        parts = []
        for i, nm in enumerate(stages):
            if i == k:
                parts.append(r"{\c&H5FD7FF&\alpha&H00&}" + f"{i + 1} {nm}")
            else:
                parts.append(r"{\c&HFFFFFF&\alpha&H90&}" + f"{i + 1} {nm}")
        line = r"{\fad(250,250)}" + r"{\alpha&H90&}   ›   ".join(parts)
        ev.append(f"Dialogue: 2,{t_ass(fr(a))},{t_ass(fr(b))},Stage,,0,0,0,,{line}")
    ev.append(f"Dialogue: 2,{t_ass(fr(1290))},{t_ass(fr(1345))},Small,,0,0,0,,"
              r"{\fad(250,250)\an8\pos(540,250)}EXIT HOLE  •  ~1 mm")
    # title + takeaway
    ev.append(f"Dialogue: 3,{t_ass(fr(1413))},{t_ass(50.0)},Title,,0,0,0,,"
              r"{\fad(500,0)\blur1}THE INVISIBLE\NINVADER")
    ev.append(f"Dialogue: 3,{t_ass(fr(1425))},{t_ass(50.0)},Small,,0,0,0,,"
              r"{\fad(500,0)\an8\pos(540,560)}HOW A TINY WEEVIL DESTROYS YOUR RICE")
    ev.append(f"Dialogue: 3,{t_ass(fr(1440))},{t_ass(50.0)},Card,,0,0,0,,"
              r"{\fad(400,0)}STORE GRAINS DRY.\NINSPECT REGULARLY.")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(head + "\n".join(ev) + "\n")


def segment(name, f0, f1, fin, fout, preview=False):
    os.makedirs(SEGS, exist_ok=True)
    out = os.path.join(SEGS, f"{name}.mp4")
    if "--reuse-segments" in sys.argv and os.path.exists(out):
        return out
    n = f1 - f0 + 1
    vf = "[0:v]" + GRADE.format(w=W, h=H)
    if fin[0]:
        vf += f",fade=t=in:s=0:n={fin[0]}:color={fin[1]}"
    if fout[0]:
        vf += f",fade=t=out:s={n - fout[0]}:n={fout[0]}:color={fout[1]}"
    vf += "[v]"
    run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-start_number", str(f0),
         "-i", os.path.join(FRAMES, "frame_%04d.png"), "-frames:v", str(n),
         "-filter_complex", vf, "-map", "[v]", "-c:v", "libx264", "-preset",
         "veryfast" if preview else "slow", "-crf", "12", "-pix_fmt", "yuv420p", "-r", str(FPS),
         out])
    return out


def main():
    preview = "--preview" in sys.argv
    os.makedirs(FINAL, exist_ok=True)
    segs = [segment(n, a, b, i, o, preview) for n, a, b, i, o in SCENES]
    lst = os.path.join(SEGS, "list.txt")
    with open(lst, "w") as fh:
        for s in segs:
            fh.write(f"file '{s}'\n")
    ass = os.path.join(FINAL, "subtitles.ass")
    build_ass(ass)
    out = os.path.join(FINAL, "the_invisible_invader_50s.mp4")
    vf = (f"subtitles='{ass}':fontsdir='{FONTS}',fade=t=out:st=49.55:d=0.45,"
          f"format=yuv420p")
    af = "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
         "-i", os.path.join(AUDIO, "mix.wav"), "-filter_complex",
         f"[0:v]{vf}[v];[1:a]{af}[a]", "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "17",
         "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-t", "50", "-movflags", "+faststart",
         out])
    print("FINAL", out)


if __name__ == "__main__":
    main()
