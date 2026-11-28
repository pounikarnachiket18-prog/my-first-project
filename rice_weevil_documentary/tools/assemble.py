"""Finish, grade, title, subtitle and export the final film.

Usage (needs numpy + scipy, e.g. the audio venv):
  python tools/assemble.py                 cinematic finishing pass (tools/finish.py) -> final
  python tools/assemble.py --range=1,180   preview only these output frames (scratch file)
  python tools/assemble.py --classic [--reuse-segments] [--redo=S1_Mystery,...]
                                           the original straight-cut edit (no hook, no effects)
Inputs : renders/frames/*.png, assets/audio/mix.wav, assets/audio/subtitles.json,
         assets/tracking.json (from tools/track.py)
Outputs: final/the_invisible_invader_50s.mp4 (+ final/subtitles.ass)
"""
import json
import math
import os
import subprocess
import sys
from multiprocessing import Pool

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES = os.path.join(ROOT, "renders", "frames")
SEGS = os.path.join(ROOT, "renders", "segments")
FINAL = os.path.join(ROOT, "final")
FONTS = os.path.join(ROOT, "assets", "fonts")
AUDIO = os.path.join(ROOT, "assets", "audio")
W, H, FPS = 1080, 1920, 30

# scene ranges and how each one enters / leaves (frames of dip, colour) -- classic edit only
SCENES = [
    ("S1_Mystery", 1, 180, (10, "black"), (4, "black")),
    ("S2_Invader", 181, 390, (4, "black"), (5, "black")),
    ("S3_SecretEgg", 391, 630, (5, "black"), (0, None)),        # match-cut into S4
    ("S4_HiddenDestruction", 631, 930, (0, None), (6, "white")),
    ("S5_Transformation", 931, 1200, (8, "white"), (5, "black")),
    ("S6_FinalReveal", 1201, 1410, (5, "black"), (3, "white")),
    ("S7_Takeaway", 1411, 1500, (6, "white"), (0, None)),       # final fade done on master
]

# upscale + look: gentle contrast, a light teal/amber split, highlight bloom, vignette, grain
GRADE = ("scale={w}:{h}:flags=lanczos,unsharp=5:5:0.6:5:5:0.0,"
         "eq=contrast=1.06:saturation=1.08:gamma=0.98,"
         "colorbalance=rs=-0.04:gs=0.0:bs=0.05:rh=0.04:gh=0.015:bh=-0.04,"
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


# --------------------------------------------------------------------------- typography
AMBER = r"&H3FC8FF&"   # highlight (BGR)
KEY_HI = ["कभी", "बंद चावल के डिब्बे", "कीड़े", "अंदर", "राइस वीविल", "गेहूँ", "छोटा सा छेद", "अंडा", "खास स्राव", "लार्वा",
          "बाहर नहीं", "प्यूपा", "वयस्क वीविल", "बाहर निकलता", "खोखला", "सूखा", "बंद डिब्बों"]
KEY_EN = ["ever", "sealed", "bugs", "inside", "rice weevil", "wheat", "tiny hole", "egg", "secretion", "larva",
          "never comes out", "pupa", "adult weevil", "emerges", "hollowed out", "dry",
          "tightly sealed"]


def highlight(text, keys, base="&HFFFFFF&", pop=118):
    """Colour key words amber with a short scale 'pop' as the line appears."""
    for kw in sorted(keys, key=len, reverse=True):
        if kw in text:
            text = text.replace(
                kw, r"{\c" + AMBER + rf"\fscx{pop}\fscy{pop}\t(40,260,\fscx100\fscy100)}}"
                + kw + r"{\c" + base + r"\fscx100\fscy100}", 1)
            break
    return text


def screen_pos(track_name, k):
    """1080x1920 screen position of a tracked point after the finishing zoom/pan."""
    import finish
    tx, ty = finish.track_k(track_name, k)
    z, p, _ = finish.zoom_plan(k)
    return 2 * (p[0] + (tx - p[0]) * z), 2 * (p[1] + (ty - p[1]) * z)


def circle(cx, cy, r):
    """Absolute-coordinate circle path (use with \\an7\\pos(0,0))."""
    c = 0.5523 * r
    return (f"m {cx:.1f} {cy - r:.1f} b {cx + c:.1f} {cy - r:.1f} {cx + r:.1f} {cy - c:.1f} "
            f"{cx + r:.1f} {cy:.1f} b {cx + r:.1f} {cy + c:.1f} {cx + c:.1f} {cy + r:.1f} "
            f"{cx:.1f} {cy + r:.1f} b {cx - c:.1f} {cy + r:.1f} {cx - r:.1f} {cy + c:.1f} "
            f"{cx - r:.1f} {cy:.1f} b {cx - r:.1f} {cy - c:.1f} {cx - c:.1f} {cy - r:.1f} "
            f"{cx:.1f} {cy - r:.1f}")


def line_shape(x1, y1, x2, y2, w=3.0):
    dx, dy = x2 - x1, y2 - y1
    n = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / n * w / 2, dx / n * w / 2
    pts = [(x1 + nx, y1 + ny), (x2 + nx, y2 + ny), (x2 - nx, y2 - ny), (x1 - nx, y1 - ny)]
    return "m " + " l ".join(f"{x:.1f} {y:.1f}" for x, y in pts)


def callout(ev, trk, k0, k1, anchor, title, hindi, align=7):
    """A tracked marker ring + leader line that draws on, and a two-line editorial label."""
    ax, ay = anchor
    for k in range(k0, k1 + 1):
        tx, ty = screen_pos(trk, k)
        grow = min(1.0, (k - k0) / 9.0)
        fade = min(1.0, (k1 - k) / 8.0)
        a = int(255 * (1 - min(grow * 1.6, 1) * fade))
        al = f"&H{a:02X}&"
        t0, t1 = t_ass(fr(k)), t_ass(fr(k + 1))
        # marker: solid dot + a ring that pulses
        rr = 13 + 5 * (0.5 + 0.5 * math.sin(k / 3.0))
        ev.append(f"Dialogue: 4,{t0},{t1},Draw,,0,0,0,,{{\\an7\\pos(0,0)\\p1"
                  f"\\bord0\\shad0\\c{AMBER}\\alpha{al}}}{circle(tx, ty, 6)}{{\\p0}}")
        ev.append(f"Dialogue: 4,{t0},{t1},Draw,,0,0,0,,{{\\an7\\pos(0,0)\\p1"
                  f"\\bord2.2\\shad0\\3c{AMBER}\\1a&HFF&\\3a{al}}}{circle(tx, ty, rr)}{{\\p0}}")
        # leader line from the marker towards the label
        ex, ey = tx + (ax - tx) * grow, ty + (ay - ty) * grow
        if grow > 0.05:
            ev.append(f"Dialogue: 4,{t0},{t1},Draw,,0,0,0,,{{\\an7\\pos(0,0)\\p1\\bord0\\shad1"
                      f"\\4c&H000000&\\c&HF2F2F2&\\alpha{al}}}{line_shape(tx, ty, ex, ey, 2.6)}{{\\p0}}")
    # label (an7 = text hangs right of the anchor, an9 = left of it)
    st, en = t_ass(fr(k0 + 7)), t_ass(fr(k1))
    off = 14 if align == 7 else -14
    # brand panel: wipes open from the leader-line side, with a white leading edge
    w = text_w(title) + 30
    y0, y1 = ay - 36, ay + 16
    if align == 7:
        x0, x1 = ax + off - 14, ax + off - 14 + w
        c0, edge = rf"\clip({x0:.0f},{y0},{x0:.0f},{y1})", rect(x0, y0, 5, y1 - y0)
    else:
        x0, x1 = ax + off + 14 - w, ax + off + 14
        c0, edge = rf"\clip({x1:.0f},{y0},{x1:.0f},{y1})", rect(x1 - 5, y0, 5, y1 - y0)
    full = rf"\clip({x0:.0f},{y0},{x1:.0f},{y1})"
    ev.append(rf"Dialogue: 5,{st},{en},Draw,,0,0,0,,{{\an7\pos(0,0)\p1\bord0\shad2\4c&H000000&"
              rf"\4a&H90&\c{BRAND}\alpha&H18&\fad(0,220){c0}\t(0,240,0.6,{full})}}"
              rf"{rect(x0, y0, x1 - x0, y1 - y0)}{{\p0}}")
    ev.append(rf"Dialogue: 5,{st},{en},Draw,,0,0,0,,{{\an7\pos(0,0)\p1\bord0\shad0"
              rf"\c&HFFFFFF&\fad(0,220)}}{edge}{{\p0}}")
    ev.append(rf"Dialogue: 6,{t_ass(fr(k0 + 10))},{en},Callout,,0,0,0,,{{\an{align}"
              rf"\pos({ax + off},{ay - 30})\fad(160,220)\bord0\shad0\fsp14\t(0,350,\fsp4)}}{title}")
    ev.append(rf"Dialogue: 6,{t_ass(fr(k0 + 13))},{en},CalloutBox,,0,0,0,,{{\an{align}"
              rf"\pos({ax + off + (6 if align == 7 else -6)},{ay + 28})\fad(220,220)\blur3\t(0,260,\blur0)}}{hindi}")


# --------------------------------------------------------------------------- holographic HUD
HOLO = r"&HFFE07A&"     # cyan (BGR)
_PPM = None


def ppm(trk, k):
    """True screen pixels per millimetre at a tracked subject (after the finishing zoom)."""
    global _PPM
    import finish
    if _PPM is None:
        d = json.load(open(os.path.join(ROOT, "assets", "tracking.json")))
        _PPM = {n: (sorted(int(f) for f in v), [v[str(f)][2] for f in sorted(int(f) for f in v)])
                for n, v in d.items()}
    fs, vs = _PPM[trk]
    z, _p, _ = finish.zoom_plan(k)
    return _interp(finish.source(k), list(zip(fs, vs))) * z


def holo(ev, k, shape, layer=6, alpha=0, glow=True):
    """Draw an absolute-coordinate vector shape in hologram cyan with a soft glow pass."""
    t0, t1 = t_ass(fr(k)), t_ass(fr(k + 1))
    a = f"&H{alpha:02X}&"
    if glow:
        ag = f"&H{min(255, alpha + 120):02X}&"
        ev.append(rf"Dialogue: {layer},{t0},{t1},Draw,,0,0,0,,{{\an7\pos(0,0)\p1\bord4\blur7"
                  rf"\shad0\c{HOLO}\3c{HOLO}\alpha{ag}}}{shape}{{\p0}}")
    ev.append(rf"Dialogue: {layer + 1},{t0},{t1},Draw,,0,0,0,,{{\an7\pos(0,0)\p1\bord0"
              rf"\shad0\c&HFFF6E6&\alpha{a}}}{shape}{{\p0}}")


def holo_text(ev, k0, k1, x, y, text, an=7, size=28, fad=(120, 180), sp=6, layer=8):
    ev.append(f"Dialogue: {layer},{t_ass(fr(k0))},{t_ass(fr(k1))},Small,,0,0,0,,"
              rf"{{\an{an}\pos({x:.0f},{y:.0f})\fs{size}\fsp{sp}\b1\c{HOLO}\3c&H3A2A10&"
              rf"\bord1.4\blur0.6\fad({fad[0]},{fad[1]})}}{text}")


def brackets(cx, cy, hw, hh, arm, t=4.0):
    out = []
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        x0, y0 = cx + sx * hw, cy + sy * hh
        ax, ay = -sx * arm, -sy * arm
        tx, ty = -sx * t, -sy * t
        pts = [(x0, y0), (x0 + ax, y0), (x0 + ax, y0 + ty), (x0 + tx, y0 + ty), (x0 + tx, y0 + ay),
               (x0, y0 + ay)]
        out.append("m " + " l ".join(f"{px:.1f} {py:.1f}" for px, py in pts))
    return " ".join(out)


def rect(x, y, w, h):
    return f"m {x:.1f} {y:.1f} l {x + w:.1f} {y:.1f} l {x + w:.1f} {y + h:.1f} l {x:.1f} {y + h:.1f}"


def pill_shape(cx, cy, hw, hh):
    """Stadium (rounded pill) centred on (cx, cy), absolute coordinates."""
    r = hh
    x0, x1 = cx - hw + r, cx + hw - r
    if x1 < x0:
        x0 = x1 = cx
    c = 0.5523 * r
    return (f"m {x0:.1f} {cy - r:.1f} l {x1:.1f} {cy - r:.1f} "
            f"b {x1 + c:.1f} {cy - r:.1f} {x1 + r:.1f} {cy - c:.1f} {x1 + r:.1f} {cy:.1f} "
            f"b {x1 + r:.1f} {cy + c:.1f} {x1 + c:.1f} {cy + r:.1f} {x1:.1f} {cy + r:.1f} "
            f"l {x0:.1f} {cy + r:.1f} "
            f"b {x0 - c:.1f} {cy + r:.1f} {x0 - r:.1f} {cy + c:.1f} {x0 - r:.1f} {cy:.1f} "
            f"b {x0 - r:.1f} {cy - c:.1f} {x0 - c:.1f} {cy - r:.1f} {x0:.1f} {cy - r:.1f}")


def hud_lock(ev, trk, k0, k1, label, half_mm=(0.85, 0.55)):
    """Lock-on reticle: brackets fly in from wide, overshoot and settle on the tracked subject,
    a centre crosshair blinks and the label types on."""
    for k in range(k0, k1 + 1):
        cx, cy = screen_pos(trk, k)
        q = ppm(trk, k)
        u = min(1.0, (k - k0) / 10.0)
        settle = 1 + 1.4 * (1 - u) ** 3 - 0.08 * math.sin(min(1.0, (k - k0) / 16.0) * math.pi)
        hw = min(300.0, half_mm[0] * q) * settle
        hh = min(220.0, half_mm[1] * q) * settle
        fade = min(1.0, (k1 - k) / 8.0)
        alpha = int(255 * (1 - min(1.0, u * 2) * fade))
        holo(ev, k, brackets(cx, cy, hw, hh, 34), alpha=alpha)
        if (k - k0) % 6 < 4 and k - k0 > 8:
            cross = (rect(cx - 16, cy - 1.5, 10, 3) + " " + rect(cx + 6, cy - 1.5, 10, 3) + " "
                     + rect(cx - 1.5, cy - 16, 3, 10) + " " + rect(cx - 1.5, cy + 6, 3, 10))
            holo(ev, k, cross, alpha=alpha, glow=False)
        n = int(len(label) * min(1.0, max(0.0, (k - k0 - 6) / 12.0)))
        if n:
            ev.append(f"Dialogue: 8,{t_ass(fr(k))},{t_ass(fr(k + 1))},Small,,0,0,0,,"
                      rf"{{\an1\pos({cx - hw:.0f},{cy - hh - 12:.0f})\fs26\fsp6\b1\c{HOLO}"
                      rf"\bord1.4\3c&H3A2A10&\alpha&H{alpha:02X}&}}{label[:n]}")


def hud_scale(ev, trk, k0, k1, x=90, y=1212, units=((1.0, "1 mm"),), max_px=420):
    """True-to-scale bar: its length is exactly 1 (or 5) mm at the subject's depth, measured
    from the Blender camera, so the viewer can read the real size of what they see."""
    for k in range(k0, k1 + 1):
        q = ppm(trk, k)
        mm, txt = next(((m, t) for m, t in units if m * q <= max_px), units[-1])
        L = mm * q * min(1.0, (k - k0) / 8.0)
        fade = min(1.0, (k1 - k) / 8.0, (k - k0 + 1) / 4.0)
        alpha = int(255 * (1 - fade))
        bar = (rect(x, y, L, 4) + " " + rect(x, y - 12, 3, 16) + " " + rect(x + L - 3, y - 12, 3, 16))
        holo(ev, k, bar, alpha=alpha)
        ev.append(f"Dialogue: 8,{t_ass(fr(k))},{t_ass(fr(k + 1))},Small,,0,0,0,,"
                  rf"{{\an1\pos({x:.0f},{y - 18:.0f})\fs26\fsp5\b1\c{HOLO}\bord1.4"
                  rf"\3c&H3A2A10&\alpha&H{alpha:02X}&}}SCALE  {txt}")


def hud_scan(ev, k0, k1, x=90, y=1212, w=330):
    """X-ray scan readout with a filling progress bar (bottom-left, clear of the subtitles)."""
    for k in range(k0, k1 + 1):
        p = min(1.0, max(0.0, (k - k0 - 4) / (k1 - k0 - 18)))
        fade = min(1.0, (k1 - k) / 8.0, (k - k0 + 1) / 5.0)
        alpha = int(255 * (1 - fade))
        holo(ev, k, rect(x, y, w, 2), alpha=min(255, alpha + 90), glow=False)
        holo(ev, k, rect(x, y - 3, w * p, 8), alpha=alpha)
        label = "X-RAY SCAN  " + ("COMPLETE" if p >= 1 else f"{int(p * 100):3d}%")
        ev.append(f"Dialogue: 8,{t_ass(fr(k))},{t_ass(fr(k + 1))},Small,,0,0,0,,"
                  rf"{{\an1\pos({x:.0f},{y - 14:.0f})\fs26\fsp5\b1\c{HOLO}\bord1.4"
                  rf"\3c&H3A2A10&\alpha&H{alpha:02X}&}}{label}")


# --------------------------------------------------------------------------- brand motion graphics
BRAND = r"&H2012D6&"    # Just KnowIt red (BGR of #D61220)
CHAPTERS = [(1, 60, "00", "THE MYSTERY"), (61, 180, "01", "THE JAR"), (181, 390, "02", "THE INVADER"),
            (391, 630, "03", "THE SECRET EGG"), (631, 930, "04", "INSIDE THE GRAIN"),
            (931, 1200, "05", "METAMORPHOSIS"), (1201, 1410, "06", "THE ESCAPE"),
            (1411, 1500, "07", "PROTECT YOUR RICE")]


def text_w(t, size=40, sp=4.0):
    """Rough advance width of Inter Bold caps text (for panels behind labels)."""
    w = 0.0
    for c in t:
        w += (0.40 if c == " " else 0.56 if c.islower() or c in "~•.-" else
              0.36 if c in "I1" else 0.70) * size + sp
    return w


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def chapter_hud(ev):
    """Top-right: chapter number tile + title (types on at each chapter) and an 8-segment
    progress bar that fills through the film. Motion graphics present in every frame."""
    R, Y = 1044, 166
    seg_w, gap, n = 30, 5, len(CHAPTERS)
    x_first = R - n * seg_w - (n - 1) * gap
    for ci, (a, b, num, title) in enumerate(CHAPTERS):
        # number tile springs in on every chapter change
        ev.append(rf"Dialogue: 6,{t_ass(fr(a))},{t_ass(fr(b + 1))},Draw,,0,0,0,,"
                  rf"{{\an5\pos({R - 22},{Y})\p1\bord0\shad0\c{BRAND}\fscx40\fscy40"
                  rf"\t(0,180,\fscx108\fscy108)\t(180,300,\fscx100\fscy100)}}"
                  r"m 4 0 l 48 0 b 52 0 52 0 52 4 l 52 36 b 52 40 52 40 48 40 "
                  r"l 4 40 b 0 40 0 40 0 36 l 0 4 b 0 0 0 0 4 0{\p0}")
        blink = r"\t(0,120,\alpha&H80&)\t(120,240,\alpha&H00&)" if num == "00" else ""
        ev.append(rf"Dialogue: 7,{t_ass(fr(a))},{t_ass(fr(b + 1))},Small,,0,0,0,,"
                  rf"{{\an5\pos({R - 22},{Y + 1})\fs26\fsp1\b1\c&HFFFFFF&\bord0\shad0{blink}}}{num}")
        # title types on, a red caret blinks while typing
        for k in range(a, b + 1):
            m = min(len(title), int((k - a + 1) * len(title) / 10.0))
            if m >= len(title) and k > a + 12:
                ev.append(rf"Dialogue: 7,{t_ass(fr(k))},{t_ass(fr(b + 1))},Small,,0,0,0,,"
                          rf"{{\an6\pos({R - 58},{Y})\fs26\fsp5\b1\c&HFFFFFF&\bord1.6"
                          rf"\3c&H101010&\shad0}}{title}")
                break
            caret = r"{\c" + BRAND + r"}▍" if (k - a) % 4 < 3 else ""
            ev.append(rf"Dialogue: 7,{t_ass(fr(k))},{t_ass(fr(k + 1))},Small,,0,0,0,,"
                      rf"{{\an6\pos({R - 58},{Y})\fs26\fsp5\b1\c&HFFFFFF&\bord1.6"
                      rf"\3c&H101010&\shad0}}{title[:m]}{caret}")
    # progress segments: done = white, current = red fill, upcoming = dim track
    for k in range(1, 1501):
        shapes_dim, shapes_done, shapes_red = [], [], []
        for ci, (a, b, _n, _t) in enumerate(CHAPTERS):
            x = x_first + ci * (seg_w + gap)
            if k > b:
                shapes_done.append(rect(x, Y + 32, seg_w, 4))
            else:
                shapes_dim.append(rect(x, Y + 32, seg_w, 4))
                if k >= a:
                    shapes_red.append(rect(x, Y + 31, seg_w * (k - a + 1) / (b - a + 1), 6))
        t0, t1 = t_ass(fr(k)), t_ass(fr(k + 1))
        for shp, col, al in ((shapes_dim, "&HFFFFFF&", "&HB0&"), (shapes_done, "&HFFFFFF&", "&H30&"),
                             (shapes_red, BRAND, "&H00&")):
            if shp:
                ev.append(rf"Dialogue: 6,{t0},{t1},Draw,,0,0,0,,{{\an7\pos(0,0)\p1\bord0"
                          rf"\shad0\c{col}\alpha{al}}}{' '.join(shp)}{{\p0}}")


def build_ass(path, classic=False):
    subs = json.load(open(os.path.join(AUDIO, "subtitles.json"), encoding="utf-8"))
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Noto Sans Devanagari,78,&H00FFFFFF,&H00FFFFFF,&H00101010,&H8C000000,1,0,0,0,100,100,0,0,1,4.2,2.2,2,90,130,470,1
Style: Label,Cinzel,64,&H00F2F2F2,&H00FFFFFF,&H00141414,&H64000000,1,0,0,0,100,100,6,0,1,2,1,8,90,130,250,1
Style: Small,Inter,34,&H00D8D8D8,&H00FFFFFF,&H00141414,&H64000000,0,0,0,0,100,100,2,0,1,1.6,0,8,90,130,330,1
Style: Stage,Inter,30,&H00FFFFFF,&H00FFFFFF,&H00101010,&H64000000,1,0,0,0,100,100,4,0,1,1.8,0,8,90,130,240,1
Style: Day,Cinzel,62,&H00FFFFFF,&H00FFFFFF,&H00101010,&H64000000,1,0,0,0,100,100,6,0,1,2.2,1,8,90,130,292,1
Style: Title,Cinzel,92,&H00FFFFFF,&H00FFFFFF,&H000A0A0A,&H78000000,1,0,0,0,100,100,8,0,1,2.5,2,8,90,130,300,1
Style: Card,Inter,44,&H00E9F4FF,&H00FFFFFF,&H000A0A0A,&H78000000,1,0,0,0,100,100,5,0,1,2.2,1,8,90,130,650,1
Style: Callout,Inter,40,&H00FFFFFF,&H00FFFFFF,&H00101010,&H78000000,1,0,0,0,100,100,4,0,1,2.2,1.2,7,0,0,0,1
Style: CalloutHi,Noto Sans Devanagari,40,&H00D9D9D9,&H00FFFFFF,&H00101010,&H78000000,0,0,0,0,100,100,0,0,1,2.0,1,7,0,0,0,1
Style: CalloutBox,Noto Sans Devanagari,36,&H00FFFFFF,&H00FFFFFF,&H50141414,&H00000000,0,0,0,0,100,100,0,0,3,6,0,7,0,0,0,1
Style: Draw,Inter,20,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for i, s in enumerate(subs):
        hi = highlight(s["hi"], KEY_HI)
        en = highlight(s["en"], KEY_EN, base="&HDDDDDD&", pop=108)
        size = r"\fs90" if i == 0 else ""    # the cold-open question hits bigger
        pop = (r"\fscx135\fscy135\t(0,160,\fscx100\fscy100)" if i == 0 else
               r"\fscx94\fscy94\t(0,130,\fscx100\fscy100)")
        txt = (rf"{{\fad(70,110)\blur0.6{size}{pop}}}" + hi
               + r"\N{\fnInter\fs40\b0\c&HDDDDDD&\fscx100\fscy100}" + en)
        ev.append(f"Dialogue: 0,{t_ass(s['start'])},{t_ass(s['end'])},Sub,,0,0,0,,{txt}")
    if classic:
        ev.append(f"Dialogue: 2,{t_ass(fr(1290))},{t_ass(fr(1345))},Small,,0,0,0,,"
                  r"{\fad(250,250)\an8\pos(540,250)}EXIT HOLE  •  ~1 mm")
    # species card (scene 2) with a hairline rule that draws on
    ev.append(f"Dialogue: 1,{t_ass(fr(232))},{t_ass(fr(330))},Label,,0,0,0,,"
              r"{\fad(200,300)\i1\fsp22\t(0,500,\fsp6)\clip(160,0,160,1920)"
              r"\t(0,550,0.7,\clip(160,0,920,1920))}SITOPHILUS ORYZAE")
    ev.append(f"Dialogue: 1,{t_ass(fr(240))},{t_ass(fr(330))},Small,,0,0,0,,"
              r"{\fad(400,300)}RICE WEEVIL  •  ADULT LENGTH 2–4 mm")
    ev.append(f"Dialogue: 1,{t_ass(fr(236))},{t_ass(fr(330))},Small,,0,0,0,,"
              r"{\fad(200,300)\an7\pos(390,318)\p1\bord0\shad0\c" + BRAND + r"\fscx0"
              r"\t(0,450,\fscx100)}m 0 0 l 300 0 l 300 4 l 0 4{\p0}")
    # life-cycle tracker: egg -> larva -> pupa -> adult; the active stage pops when it changes
    stages = ["EGG", "LARVA", "PUPA", "ADULT"]
    spans = [(590, 676, 0), (676, 998, 1), (998, 1104, 2), (1104, 1345, 3)]
    slots = [202, 427, 652, 877]
    labels = [f"{i + 1} {nm}" for i, nm in enumerate(stages)]
    widths = [text_w(t, 30, 4) + 30 for t in labels]
    for a, b, k in spans:
        fad = r"\fad(250,0)" if a == 590 else (r"\fad(0,300)" if b == 1345 else "")
        for i, t in enumerate(labels):
            if i == k:
                style = r"\c&HFFFFFF&\alpha&H00&\fscx122\fscy122\t(80,380,\fscx100\fscy100)"
            else:
                style = r"\c&HFFFFFF&\alpha&H70&" if i < k else r"\c&HFFFFFF&\alpha&HA8&"
            ev.append(rf"Dialogue: 3,{t_ass(fr(a))},{t_ass(fr(b))},Stage,,0,0,0,,"
                      rf"{{\an5\pos({slots[i]},258)\bord1.2\shad0{fad}{style}}}{t}")
        for i in range(3):
            ev.append(rf"Dialogue: 3,{t_ass(fr(a))},{t_ass(fr(b))},Stage,,0,0,0,,"
                      rf"{{\an5\pos({(slots[i] + slots[i + 1]) // 2},256)\alpha&HA0&{fad}}}›")
    # the pill glides to the new stage with a little overshoot
    prev = 0
    for a, b, k in spans:
        for f in range(a, b):
            u = (f - a) / 10.0
            e = ease(u) + (0.06 * math.sin(math.pi * min(1.0, u * 1.25)) if 0 < u < 1 else 0)
            src = prev if a != 590 else k
            cx = slots[src] + (slots[k] - slots[src]) * e
            wd = widths[src] + (widths[k] - widths[src]) * ease(u)
            grow = ease((f - 590) / 8.0) if a == 590 else 1.0
            fade = ease((1345 - f) / 9.0)
            al = f"&H{int(255 * (1 - min(grow, fade))):02X}&"
            hw, hh = wd / 2 * (0.6 + 0.4 * grow), 22
            ev.append(rf"Dialogue: 2,{t_ass(fr(f))},{t_ass(fr(f + 1))},Draw,,0,0,0,,"
                      rf"{{\an7\pos(0,0)\p1\bord0\shad0\c{BRAND}\alpha{al}}}"
                      rf"{pill_shape(cx, 257, hw, hh)}{{\p0}}")
        prev = k
    # day counter (approximate development at ~28 °C): egg ~4 d, larva ~20 d, pupa ~6 d,
    # the new adult hardens inside the grain for a few days before it chews its way out
    days = [(590, 0), (662, 4), (990, 24), (1105, 30), (1290, 33), (1345, 33)]
    prev, start = None, 590
    for k in range(590, 1346):
        d = int(round(float(_interp(k, days))))
        if d != prev:
            if prev is not None:
                ev.append(_day(start, k, prev))
            prev, start = d, k
    ev.append(_day(start, 1346, prev, last=True))
    for k in range(590, 1346):
        dd = float(_interp(k, days)) / 33.0
        al = int(255 * (1 - min(ease((k - 590) / 8.0), ease((1345 - k) / 9.0))))
        a1, a2 = f"&H{al:02X}&", f"&H{min(255, al + 150):02X}&"
        t0, t1 = t_ass(fr(k)), t_ass(fr(k + 1))
        ev.append(rf"Dialogue: 2,{t0},{t1},Draw,,0,0,0,,{{\an7\pos(0,0)\p1\bord0\shad0"
                  rf"\c&HFFFFFF&\alpha{a2}}}{rect(390, 366, 300, 3)}{{\p0}}")
        ev.append(rf"Dialogue: 2,{t0},{t1},Draw,,0,0,0,,{{\an7\pos(0,0)\p1\bord0\shad0"
                  rf"\c{BRAND}\alpha{a1}}}{rect(390, 365, 300 * dd, 5)}{{\p0}}")
        ev.append(rf"Dialogue: 2,{t0},{t1},Draw,,0,0,0,,{{\an7\pos(0,0)\p1\bord3\blur3\shad0"
                  rf"\c&HFFFFFF&\3c{BRAND}\alpha{a1}}}{circle(390 + 300 * dd, 367.5, 4)}{{\p0}}")
    ev.append(f"Dialogue: 2,{t_ass(fr(596))},{t_ass(fr(700))},Small,,0,0,0,,"
              r"{\fad(300,300)\an8\pos(540,382)\fs26\alpha&H40&}APPROX. AT ~28 °C")
    if not classic:  # tracked scientific callouts (one at a time)
        callout(ev, "rostrum", 304, 352, (900, 820), "ROSTRUM", "लंबी सूंड — सिरे पर जबड़े",
                align=9)
        callout(ev, "drill", 462, 516, (930, 900), "CHEWING A HOLE", "जबड़ों से दाने में छेद",
                align=9)
        callout(ev, "egg", 592, 628, (880, 800), "EGG  •  ~0.7 mm", "दाने के अंदर एक अंडा",
                align=9)
        callout(ev, "larva", 704, 900, (170, 620), "LARVA  •  4 INSTARS",
                "दाने के अंदर 4 चरणों में बढ़ता है")
        callout(ev, "pupa", 1006, 1062, (900, 760), "PUPA", "आँखें सबसे पहले गहरी होती हैं",
                align=9)
        callout(ev, "adult5", 1110, 1190, (640, 700), "NEW ADULT",
                "धीरे-धीरे सख्त और गहरा होता है", align=9)
        callout(ev, "exit", 1292, 1345, (840, 800), "EXIT HOLE  •  ~1 mm", "बाहर निकलने का छेद",
                align=9)
    if not classic:  # brand motion graphics: chapter tag + progress, every frame
        chapter_hud(ev)
    if not classic:  # holographic HUD: four restrained moments, never alongside a callout
        hud_lock(ev, "body2", 194, 236, "SPECIMEN DETECTED")
        hud_scale(ev, "body2", 238, 330)
        hud_scan(ev, 936, 996)
        hud_scale(ev, "exit", 1350, 1404, units=((1.0, "1 mm"), (5.0, "5 mm")))
    # title + takeaway (cinematic: the title itself is 3D metal rendered in Cycles, scene S7)
    if classic:
        ev.append(f"Dialogue: 3,{t_ass(fr(1413))},{t_ass(50.0)},Title,,0,0,0,,"
                  r"{\fad(400,0)\blur6\fsp30\t(0,500,\blur0.8\fsp8)}THE INVISIBLE\NINVADER")
    ev.append(f"Dialogue: 3,{t_ass(fr(1425))},{t_ass(50.0)},Small,,0,0,0,,"
              + (r"{\fad(500,0)\an8\pos(540,560)}" if classic else
                 r"{\fad(500,0)\an8\pos(540,470)\fsp9\t(0,700,\fsp2)}")
              + "HOW A TINY WEEVIL DESTROYS YOUR RICE")
    ev.append(f"Dialogue: 3,{t_ass(fr(1440))},{t_ass(50.0)},Card,,0,0,0,,"
              r"{\fad(300,0)\fscx90\fscy90\t(0,200,\fscx100\fscy100)}STORE GRAINS DRY.\N"
              r"{\c" + AMBER + r"}INSPECT REGULARLY.")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(head + "\n".join(ev) + "\n")


def _interp(x, pts):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return pts[-1][1]


def _day(k0, k1, d, last=False):
    fad = r"\fad(250,300)" if (k0 == 590 or last) else ""
    milestone = d in (0, 4, 24, 30, 33)
    pop = (r"\fscx118\fscy118\t(0,220,\fscx100\fscy100)" if milestone and k0 != 590 else "")
    col = r"\c" + AMBER if milestone else ""
    return (f"Dialogue: 2,{t_ass(fr(k0))},{t_ass(fr(k1))},Day,,0,0,0,,{{{fad}}}"
            rf"{{\fs34\fsp8\alpha&H30&}}DAY  {{\fs62\fsp6\alpha&H00&{pop}{col}}}{d}")


# --------------------------------------------------------------------------- classic edit
def segment(name, f0, f1, fin, fout, preview=False):
    os.makedirs(SEGS, exist_ok=True)
    out = os.path.join(SEGS, f"{name}.mp4")
    redo = [a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--redo=")]
    if "--reuse-segments" in sys.argv and os.path.exists(out) and name not in sum(redo, []):
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


def classic():
    preview = "--preview" in sys.argv
    segs = [segment(n, a, b, i, o, preview) for n, a, b, i, o in SCENES]
    lst = os.path.join(SEGS, "list.txt")
    with open(lst, "w") as fh:
        for s in segs:
            fh.write(f"file '{s}'\n")
    ass = os.path.join(FINAL, "subtitles.ass")
    build_ass(ass, classic=True)
    out = os.path.join(FINAL, "the_invisible_invader_50s.mp4")
    vf = (f"ass='{ass}':fontsdir='{FONTS}':shaping=complex,fade=t=out:st=49.55:d=0.45,"
          f"format=yuv420p")
    af = "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
         "-i", os.path.join(AUDIO, "mix.wav"), "-filter_complex",
         f"[0:v]{vf}[v];[1:a]{af}[a]", "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "17",
         "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-t", "50", "-movflags", "+faststart",
         out])
    print("FINAL", out)


# --------------------------------------------------------------------------- cinematic edit
def cinematic():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import finish
    rng = [a.split("=", 1)[1] for a in sys.argv if a.startswith("--range=")]
    k0, k1 = (map(int, rng[0].split(","))) if rng else (1, finish.N_OUT)
    ass = os.path.join(FINAL, "subtitles.ass")
    build_ass(ass)
    if rng:
        out = os.path.join(ROOT, "renders", "preview", f"finish_{k0:04d}_{k1:04d}.mp4")
        os.makedirs(os.path.dirname(out), exist_ok=True)
    else:
        out = os.path.join(FINAL, "the_invisible_invader_50s.mp4")
    t0, dur = (k0 - 1) / FPS, (k1 - k0 + 1) / FPS
    import brand
    if not os.path.exists(brand.OUT):
        brand.main()
    bx, by = brand.BUG_POS
    # the Just KnowIt badge goes on after the grade (crisp, true brand colour), under the type
    vf = (f"[0:v]{GRADE.format(w=W, h=H)},setpts=PTS+{t0}/TB[gv];"
          f"[2:v]setpts=PTS-STARTPTS+{t0}/TB,format=rgba[bug];"
          f"[gv][bug]overlay={bx}:{by}:eof_action=pass:format=auto,"
          f"ass='{ass}':fontsdir='{FONTS}':shaping=complex,setpts=PTS-STARTPTS,"
          f"fade=t=out:st={49.55 - t0}:d=0.45,format=yuv420p[v]")
    af = (f"[1:a]atrim=start={t0}:duration={dur},asetpts=PTS-STARTPTS,"
          "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{finish.W}x{finish.H}", "-r", str(FPS), "-i", "-",
           "-i", os.path.join(AUDIO, "mix.wav"), "-ss", f"{t0}", "-i", brand.OUT,
           "-filter_complex", f"{vf};{af}",
           "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-profile:v", "high",
           "-preset", "slow", "-crf", "17", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k",
           "-t", f"{dur}", "-movflags", "+faststart", out]
    print("encoding", out, flush=True)
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(int(os.environ.get("JOBS", "4"))) as pool:
        for i, buf in enumerate(pool.imap(finish.compose_bytes, range(k0, k1 + 1), chunksize=4)):
            enc.stdin.write(buf)
            if i % 100 == 0:
                print("frame", k0 + i, flush=True)
    enc.stdin.close()
    if enc.wait():
        raise SystemExit("ffmpeg failed")
    print("FINAL", out)


if __name__ == "__main__":
    os.makedirs(FINAL, exist_ok=True)
    classic() if "--classic" in sys.argv else cinematic()
