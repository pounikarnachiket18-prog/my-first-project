"""
Graphics pass + final encode for the reel.

Takes the Cycles frames (720x1280), upscales them to 1080x1920 and draws:
  * the cold-open typography (hook), Devanagari subtitles with highlighted key words,
  * science labels that track their 3D anchors (anchors.json), a five-step explanation tracker,
  * the "signal strength" meter for coin / belt / bigger object, the alarm edge pulse,
  * the Mindset Mode | Explainers brand bug and end card.
Everything stays inside the Instagram Reels safe area (top ~230 px, bottom ~420 px, right ~120 px kept clear).

    python post.py --frames FRAMES_DIR --timeline build/timeline.json --anchors build/anchors.json \
                   --audio build/mix.wav --out out.mp4
    python post.py ... --png PREVIEW_DIR --only 30,600,1000      # write a few finished frames as PNG instead
"""
import argparse, json, math, os, re, subprocess, sys
from functools import lru_cache
from multiprocessing import Pool

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cuts import FPS, END, CUT, ALARM, BLINK, LABELS, STEPS, METER, HOOK_TEXT, END_CARD

W, H = 1080, 1920
DEVA_B = "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf"
DEVA_R = "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf"
INTER = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
WHITE = (255, 255, 255)
HIL = (255, 210, 64)                # highlighted words
VIOLET = (124, 92, 255)
VIOLET_L = (196, 182, 255)
COL = {"white": (235, 240, 250), "cyan": (70, 205, 255), "amber": (255, 165, 50), "rose": (255, 95, 155)}
SUB_Y = 1312                         # subtitle centre line
SAFE_TOP, SAFE_BOTTOM, SAFE_L, SAFE_R = 250, 1180, 50, 960


@lru_cache(None)
def font(path, size):
    return ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)


def inter(weight, size):
    return font(INTER.format(weight), size)


def ease_out(t):
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def ease_back(t, k=1.6):
    t = min(max(t, 0.0), 1.0) - 1
    return 1 + (k + 1) * t ** 3 + k * t ** 2


def parse(phrase):
    """'*a b*, c' -> [(text, highlighted, space_before)]; highlights may span words, punctuation stays attached."""
    out, base = [], 0
    for part in re.split(r"(\*[^*]+\*)", phrase):
        hl = len(part) > 2 and part.startswith("*") and part.endswith("*")
        body, off = (part[1:-1], base + 1) if hl else (part, base)
        for m in re.finditer(r"\S+", body):
            i = off + m.start()
            j = i - 1
            while j >= 0 and phrase[j] == "*":
                j -= 1
            out.append((m.group(), hl, bool(out) and j >= 0 and phrase[j].isspace()))
        base += len(part)
    return out


@lru_cache(64)
def text_block(phrase, size, maxw=900, fill=WHITE, stroke=7, shadow=True, path=DEVA_B, hi=HIL, lh=1.28):
    """Render a (possibly two-line) phrase with highlights, stroke and soft shadow to an RGBA image."""
    words = parse(phrase)
    f = font(path, size)
    space = f.getlength(" ")
    wl = [f.getlength(w) for w, _, _ in words]
    def width(idx):
        return sum(wl[i] for i in idx) + sum(space for j, i in enumerate(idx) if j > 0 and words[i][2])
    lines = [list(range(len(words)))]
    if width(lines[0]) > maxw and len(words) > 1:
        best = None
        for k in range(1, len(words)):
            if not words[k][2]:
                continue
            m = max(width(range(k)), width(range(k, len(words))))
            if best is None or m < best[0]:
                best = (m, k)
        if best:
            lines = [list(range(best[1])), list(range(best[1], len(words)))]
    widths = [width(ln) for ln in lines]
    lh_px = int(size * lh)
    pad = stroke + 24
    bw, bh = int(max(widths)) + pad * 2, lh_px * len(lines) + pad * 2
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    for li, ln in enumerate(lines):
        x = (bw - widths[li]) / 2; y = pad + li * lh_px + lh_px / 2
        for j, i in enumerate(ln):
            w, h_, sp = words[i]
            if j > 0 and sp:
                x += space
            d.text((x, y), w, font=f, fill=hi if h_ else fill, anchor="lm", stroke_width=stroke, stroke_fill=(8, 8, 14))
            x += wl[i]
    if shadow:
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        sh.putalpha(img.getchannel("A").filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.55)))
        base = Image.new("RGBA", img.size, (0, 0, 0, 0)); base.alpha_composite(sh, (0, 6)); base.alpha_composite(img)
        img = base
    return img


def paste_center(canvas, img, cx, cy, alpha=1.0, scale=1.0):
    if scale != 1.0:
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.BICUBIC)
    if alpha < 1.0:
        img = img.copy(); img.putalpha(img.getchannel("A").point(lambda v: int(v * alpha)))
    canvas.alpha_composite(img, (int(cx - img.width / 2), int(cy - img.height / 2)))


# --------------------------------------------------------------------------- #
@lru_cache(None)
def vignette():
    m = Image.radial_gradient("L").resize((W, H))            # 0 centre -> 255 edge
    return m.point(lambda v: int(max(0, v - 120) * 0.42))


@lru_cache(None)
def red_edge():
    m = Image.radial_gradient("L").resize((W, H))
    a = m.point(lambda v: int(max(0, v - 150) * 0.75))
    img = Image.new("RGBA", (W, H), (255, 30, 20, 0)); img.putalpha(a)
    return img


@lru_cache(None)
def brand_bug():
    img = Image.new("RGBA", (560, 70), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([4, 6, 62, 64], 14, fill=VIOLET + (235,))
    d.text((33, 36), "M", font=inter("ExtraBold", 36), fill=WHITE, anchor="mm")
    x = 78
    d.text((x, 36), "Mindset Mode", font=inter("Bold", 30), fill=WHITE, anchor="lm", stroke_width=2, stroke_fill=(0, 0, 0, 120))
    x += inter("Bold", 30).getlength("Mindset Mode") + 12
    d.text((x, 36), "|  Explainers", font=inter("Medium", 28), fill=VIOLET_L, anchor="lm", stroke_width=2, stroke_fill=(0, 0, 0, 120))
    return img


@lru_cache(64)
def pill(hi, en, colour):
    c = COL[colour]
    fh, fe = font(DEVA_B, 44), inter("SemiBold", 26)
    tw = max(fh.getlength(hi), fe.getlength(en.upper()) + 2 * len(en))
    w, h = int(tw) + 64, 118
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, h - 1], 22, fill=(10, 12, 20, 205), outline=c + (255,), width=3)
    d.rounded_rectangle([0, 0, 12, h - 1], 6, fill=c + (255,))
    d.text((34, 44), hi, font=fh, fill=WHITE, anchor="lm")
    d.text((36, 92), en.upper(), font=fe, fill=c, anchor="lm")
    return img


def draw_label(canvas, f, lab, anchors):
    a, b, anc, hi, en, colour, (dx, dy) = lab
    pos = anchors.get(str(f), {}).get(anc)
    if pos is None:
        return
    ax, ay = pos[0] * W, pos[1] * H
    if not (-50 < ax < W + 50 and -50 < ay < H + 50):
        return
    p = pill(hi, en, colour)
    px = min(max(ax + dx - p.width / 2, SAFE_L), SAFE_R - p.width)
    py = min(max(ay + dy - p.height / 2, SAFE_TOP + 200), SAFE_BOTTOM - p.height)   # below the step tracker
    t_in, t_out = (f - a) / 6, (b - f) / 4
    k = min(1.0, t_in, t_out)
    if k <= 0:
        return
    c = COL[colour]
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    # leader line from the anchor dot to the nearest pill edge
    ex = min(max(ax, px + 20), px + p.width - 20); ey = py + p.height if ay > py + p.height else (py if ay < py else ay)
    lt = ease_out(t_in * 1.4)
    lx, ly = ax + (ex - ax) * lt, ay + (ey - ay) * lt
    alpha = int(255 * min(1.0, k))
    d.line([(ax, ay), (lx, ly)], fill=c + (alpha,), width=4)
    r = 9
    d.ellipse([ax - r, ay - r, ax + r, ay + r], fill=c + (alpha,), outline=(255, 255, 255, alpha), width=3)
    canvas.alpha_composite(lay)
    pk = ease_out((f - a - 3) / 6)
    if pk > 0:
        img = p.copy(); img.putalpha(img.getchannel("A").point(lambda v: int(v * min(pk, t_out))))
        canvas.alpha_composite(img, (int(px), int(py + (1 - pk) * 18)))


def draw_steps(canvas, f):
    a0, a1 = STEPS[0][0], STEPS[-1][1]
    k = min(1.0, (f - a0) / 8, (a1 - f) / 8)
    if k <= 0:
        return
    cur = max(i for i, s in enumerate(STEPS) if f >= s[0])
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    y, x0, x1 = 338, 190, 890
    xs = [x0 + (x1 - x0) * i / (len(STEPS) - 1) for i in range(len(STEPS))]
    al = int(255 * k)
    d.rounded_rectangle([x0 - 110, y - 46, x1 + 110, y + 78], 30, fill=(8, 10, 18, int(150 * k)))
    d.line([(xs[0], y), (xs[-1], y)], fill=(255, 255, 255, int(90 * k)), width=4)
    d.line([(xs[0], y), (xs[cur], y)], fill=VIOLET + (al,), width=6)
    fnt = font(DEVA_B, 30)
    for i, (x, (s0, s1, name)) in enumerate(zip(xs, STEPS)):
        if i < cur:
            d.ellipse([x - 16, y - 16, x + 16, y + 16], fill=VIOLET + (al,))
            d.text((x, y), "✓", font=inter("Bold", 22), fill=(255, 255, 255, al), anchor="mm")
        elif i == cur:
            pulse = 1 + 0.12 * math.sin((f - s0) / FPS * 2 * math.pi * 1.2)
            r = 24 * pulse
            d.ellipse([x - r - 8, y - r - 8, x + r + 8, y + r + 8], fill=VIOLET + (int(70 * k),))
            d.ellipse([x - r, y - r, x + r, y + r], fill=VIOLET + (al,), outline=(255, 255, 255, al), width=3)
            d.text((x, y), str(i + 1), font=inter("ExtraBold", 26), fill=(255, 255, 255, al), anchor="mm")
        else:
            d.ellipse([x - 16, y - 16, x + 16, y + 16], fill=(20, 22, 32, al), outline=(255, 255, 255, int(150 * k)), width=3)
            d.text((x, y), str(i + 1), font=inter("Bold", 20), fill=(255, 255, 255, int(170 * k)), anchor="mm")
        d.text((x, y + 52), name, font=fnt, fill=(255, 255, 255, al if i == cur else int(150 * k)), anchor="mm",
               stroke_width=2, stroke_fill=(0, 0, 0, al))
    canvas.alpha_composite(lay)


def draw_meter(canvas, f):
    for a, b, item, lvl in METER:
        if a <= f < b:
            break
    else:
        return
    first = f - METER[0][0]; last = METER[-1][1] - f
    k = min(1.0, first / 5, last / 5)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    x0, y0, w, h = 120, 1010, 840, 140
    al = int(255 * k)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 26, fill=(8, 10, 18, int(200 * k)), outline=(255, 255, 255, int(60 * k)), width=2)
    d.text((x0 + 30, y0 + 40), "सिग्नल", font=font(DEVA_B, 34), fill=(255, 255, 255, int(170 * k)), anchor="lm")
    d.text((x0 + w - 30, y0 + 40), item, font=font(DEVA_B, 38), fill=HIL + (al,), anchor="rm")
    shown = min(lvl, (f - a) / 1.2)
    for i in range(10):
        c = (60, 230, 120) if i < 4 else ((255, 165, 40) if i < 7 else (255, 60, 50))
        bx = x0 + 30 + i * 79
        on = i < shown
        d.rounded_rectangle([bx, y0 + 76, bx + 66, y0 + 116], 8, fill=c + (al if on else int(40 * k),))
    canvas.alpha_composite(lay)


def draw_hook(canvas, f):
    for a, b, lines in HOOK_TEXT:
        if not (a <= f < b):
            continue
        out = min(1.0, (b - f) / 4) if b < 90 or f > 85 else 1.0
        if lines[-1] == "*कैसे?*":
            k = ease_out((f - a) / 5)
            img1 = text_block(lines[0], 96, 900, stroke=8)
            img2 = text_block(lines[1], 210, 900, stroke=12)
            paste_center(canvas, img1, W / 2, 700, k * out)
            paste_center(canvas, img2, W / 2, 880, k * out, 1.0 + 0.35 * (1 - ease_back((f - a) / 7)))
        else:
            for i, ln in enumerate(lines):
                t = (f - a - i * 9) / 7
                if t <= 0:
                    continue
                k = ease_out(t)
                img = text_block(ln, 88, 940, stroke=8)
                paste_center(canvas, img, W / 2, 470 + i * 118 + (1 - k) * 30, k * out)


def draw_subs(canvas, f, phrases):
    t = f / FPS
    for p in phrases:
        if p["start"] <= t < p["end"]:
            img = text_block(p["text"], 70, 880)
            age = (t - p["start"]) * FPS
            s = 0.9 + 0.1 * ease_back(age / 5)
            paste_center(canvas, img, W / 2, SUB_Y, min(1.0, age / 3 + 0.25), s)
            return


@lru_cache(None)
def end_card():
    img = Image.new("RGBA", (W, 700), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    cx = W / 2
    d.rounded_rectangle([cx - 70, 40, cx + 70, 180], 34, fill=VIOLET + (255,))
    d.text((cx, 112), "M", font=inter("ExtraBold", 96), fill=WHITE, anchor="mm")
    d.text((cx, 270), "Mindset Mode", font=inter("ExtraBold", 100), fill=WHITE, anchor="mm")
    sub = "E X P L A I N E R S"
    d.text((cx, 360), sub, font=inter("SemiBold", 40), fill=VIOLET_L, anchor="mm")
    d.line([(cx - 260, 420), (cx + 260, 420)], fill=(255, 255, 255, 80), width=2)
    d.text((cx, 490), "ऐसे और एक्सप्लेनर्स के लिए", font=font(DEVA_B, 44), fill=WHITE, anchor="mm")
    d.text((cx, 556), "फ़ॉलो करें", font=font(DEVA_B, 52), fill=HIL, anchor="mm")
    return img


# --------------------------------------------------------------------------- #
def compose(job):
    f, frames_dir, phrases, anchors = job
    src = os.path.join(frames_dir, f"f_{f:04d}.png")
    im = Image.open(src).convert("RGB").resize((W, H), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=35, threshold=2))
    # gentle vignette
    im = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), im, vignette())
    canvas = im.convert("RGBA")
    # alarm edge pulse (synced with the red light), only on the two big alarm moments
    for a, b in (ALARM[0], ALARM[2]):
        if a <= f < min(b, a + 34) and (f - a) % BLINK < BLINK // 2:
            canvas.alpha_composite(red_edge())
    if f < CUT["S1"]:
        draw_hook(canvas, f)
    else:
        draw_subs(canvas, f, phrases)
    for lab in LABELS:
        if lab[0] <= f < lab[1]:
            draw_label(canvas, f, lab, anchors)
    if STEPS[0][0] <= f < STEPS[-1][1]:
        draw_steps(canvas, f)
    draw_meter(canvas, f)
    if CUT["S1"] <= f < END_CARD + 6:
        a = min(1.0, (f - CUT["S1"]) / 8, (END_CARD + 6 - f) / 6)
        b = brand_bug().copy(); b.putalpha(b.getchannel("A").point(lambda v: int(v * 0.92 * a)))
        canvas.alpha_composite(b, (44, 236))
    if f >= END_CARD:
        k = ease_out((f - END_CARD) / 10)
        dim = Image.new("RGBA", (W, H), (6, 6, 14, int(175 * k)))
        canvas.alpha_composite(dim)
        ec = end_card()
        paste_center(canvas, ec, W / 2, 900, k, 0.94 + 0.06 * k)
    return f, canvas.convert("RGB").tobytes()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", required=True)
    ap.add_argument("--timeline", required=True)
    ap.add_argument("--anchors", required=True)
    ap.add_argument("--audio")
    ap.add_argument("--out")
    ap.add_argument("--png")
    ap.add_argument("--only", default="")
    ap.add_argument("--jobs", type=int, default=4)
    args = ap.parse_args()
    tl = json.load(open(args.timeline))
    anchors = json.load(open(args.anchors))
    frames = [int(x) for x in args.only.split(",")] if args.only else list(range(END))
    jobs = [(f, args.frames, tl["phrases"], anchors) for f in frames]
    if args.png:
        os.makedirs(args.png, exist_ok=True)
        with Pool(args.jobs) as pool:
            for f, buf in pool.imap(compose, jobs):
                Image.frombytes("RGB", (W, H), buf).save(os.path.join(args.png, f"p_{f:04d}.png"))
        print("preview ->", args.png)
        return
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", args.audio, "-map", "0:v", "-map", "1:a",
           "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
           "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-level", "4.2",
           "-maxrate", "16M", "-bufsize", "32M", "-g", "60", "-bf", "2",
           "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
           "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest", "-movflags", "+faststart", args.out]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    with Pool(args.jobs) as pool:
        for i, (f, buf) in enumerate(pool.imap(compose, jobs, chunksize=4)):
            enc.stdin.write(buf)
            if i % 100 == 0:
                print(f"post {i}/{len(jobs)}", flush=True)
    enc.stdin.close()
    if enc.wait() != 0:
        sys.exit("ffmpeg failed")
    print("reel ->", args.out)


if __name__ == "__main__":
    main()
