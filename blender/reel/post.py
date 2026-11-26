"""
Graphics pass + final encode for the reel.

Takes the Cycles frames (720x1280), upscales them to 1080x1920 and draws:
  * the cold-open typography (hook), Hinglish (or English, see cuts.CAPTIONS) subtitles with highlighted key words,
  * science labels that track their 3D anchors (anchors.json), a five-step explanation tracker,
  * the "signal strength" meter for coin / belt / bigger object, the alarm edge pulse,
  * Just KnowIt branding: the logo in the corner of every frame (white, slightly see-through), a red brand wipe from the
    hook into the story, lower-third step titles, and the logo ending (iris transition into the full logo).
Everything stays inside the Instagram Reels safe area (top ~230 px, bottom ~420 px, right ~120 px kept clear).

    python post.py --frames FRAMES_DIR --timeline build/timeline.json --anchors build/anchors.json \
                   --audio build/mix.wav --out out.mp4
    python post.py ... --png PREVIEW_DIR --only 30,600,1000      # write a few finished frames as PNG instead
"""
import argparse, json, math, os, re, subprocess, sys
from functools import lru_cache
from multiprocessing import Pool

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cuts import (FPS, END, CUT, ALARM, BLINK, LABELS, STEPS, METER, HOOK_TEXT, CAPTIONS, END_CTA, LOGO_IN, LOGO_HIT,
                  OUT_END, STEP_SUB)
import brand

W, H = 1080, 1920
INTER = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
CAP = INTER.format("ExtraBold")      # caption face (Latin script)
WHITE = (255, 255, 255)
HIL = (255, 210, 64)                # highlighted words
BR = brand.RED                       # Just KnowIt red
BR_L = brand.RED_LIGHT
COL = {"white": (235, 240, 250), "cyan": (70, 205, 255), "amber": (255, 165, 50), "rose": (255, 95, 155)}
SUB_Y = 1312                         # subtitle centre line
SHOW_TRACKER = False                 # the five-step tracker along the top (off; the lower-third step titles remain)
SAFE_TOP, SAFE_BOTTOM, SAFE_L, SAFE_R = 250, 1180, 50, 960


@lru_cache(None)
def font(path, size):
    return ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)


def inter(weight, size):
    return font(INTER.format(weight), size)


def ease_out(t):
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def ease_io(t):
    t = min(max(t, 0.0), 1.0)
    return 3 * t * t - 2 * t * t * t


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
def text_block(phrase, size, maxw=900, fill=WHITE, stroke=7, shadow=True, path=CAP, hi=HIL, lh=1.28):
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


# --------------------------------------------------------------------------- #
# Just KnowIt corner logo, on every frame until it flies into the logo ending: the white logo, slightly see-through,
# with a soft shadow so it reads on light and dark shots without a solid badge behind it
BUG_X, BUG_Y, BUG_H = 44, 232, 56
BUG_MARK = 50
BUG_ALPHA = 0.78


@lru_cache(None)
def bug_parts():
    mark = brand.fit(brand.part("mark"), BUG_MARK)
    word = brand.fit(brand.part("word"), 25)
    w = mark.width + 12 + word.width
    art = Image.new("RGBA", (w, BUG_H), (0, 0, 0, 0))
    art.alpha_composite(word, (mark.width + 12, (BUG_H - word.height) // 2 + 1))
    def shadow_of(img):
        pad = 16
        sh = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
        a = Image.new("L", sh.size, 0); a.paste(img.getchannel("A"), (pad, pad + 2))
        sh.putalpha(a.filter(ImageFilter.GaussianBlur(5)).point(lambda v: int(v * 0.45)))
        return sh
    full = art.copy(); full.alpha_composite(mark, (0, (BUG_H - mark.height) // 2))
    return art, mark, shadow_of(full)


def bug_mark_centre():
    art, mark, _ = bug_parts()
    return BUG_X + mark.width / 2, BUG_Y + BUG_H / 2


def draw_bug(canvas, f):
    art, mark, shadow = bug_parts()
    if f >= LOGO_IN + 6:
        return
    k_in = ease_out(f / 12)                         # fades and slides in over the first 0.4 s
    out = 1.0 - ease_out((f - LOGO_IN) / 5)         # hands over to the flying brain at the logo ending
    a = BUG_ALPHA * k_in * out
    if a <= 0:
        return
    dx = int(-14 * (1 - k_in))
    sh = shadow.copy(); sh.putalpha(sh.getchannel("A").point(lambda v: int(v * k_in * out)))
    canvas.alpha_composite(sh, (BUG_X - 16 + dx, BUG_Y - 16))
    lay = Image.new("RGBA", art.size, (0, 0, 0, 0)); lay.alpha_composite(art)
    if f < LOGO_IN:     # the brain flies away on its own at the logo ending
        lay.alpha_composite(mark, (0, (BUG_H - mark.height) // 2))
    lay.putalpha(lay.getchannel("A").point(lambda v: int(v * a)))
    canvas.alpha_composite(lay, (BUG_X + dx, BUG_Y))


# --------------------------------------------------------------------------- #
# Labels: dark glass cards with a colour key, wiped open from the side the leader line arrives on, a leader line that
# draws itself out of a rippling anchor dot
@lru_cache(64)
def pill(title, sub, colour):
    c = COL[colour]
    ft, fs_ = inter("ExtraBold", 40), inter("Bold", 24)
    tw = max(ft.getlength(title) + 34, (fs_.getlength(sub.upper()) + 2.2 * len(sub)) if sub else 0)
    w, h = int(tw) + 60, 110 if sub else 78
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, h - 1], 18, fill=(10, 12, 20, 218), outline=c + (150,), width=2)
    d.rounded_rectangle([0, 0, w - 1, 7], 4, fill=c + (255,))                       # colour key along the top
    d.rounded_rectangle([3, 0, w - 4, 4], 2, fill=c + (255,))
    d.ellipse([28, 39 - 8, 44, 39 + 8], fill=c + (255,))
    d.text((56, 40), title, font=ft, fill=WHITE, anchor="lm")
    if sub:
        d.text((30, 84), " ".join(sub.upper().split()), font=fs_, fill=c, anchor="lm")
    # tiny brand tick in the corner
    if sub:
        mk = brand.fit(brand.part("mark", BR_L), 22)
        img.alpha_composite(mk, (w - mk.width - 12, h - mk.height - 10))
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
    py = min(max(ay + dy - p.height / 2, SAFE_TOP + (210 if SHOW_TRACKER else 90)), SAFE_BOTTOM - p.height)   # below the logo (and tracker)
    t_in, t_out = (f - a), (b - f)
    k_line = ease_out(t_in / 7) * min(1.0, t_out / 5)
    if k_line <= 0:
        return
    c = COL[colour]
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    ex = min(max(ax, px + 24), px + p.width - 24)
    ey = py + p.height if ay > py + p.height else (py if ay < py else ay)
    lx, ly = ax + (ex - ax) * k_line, ay + (ey - ay) * k_line
    al = int(255 * min(1.0, t_out / 4, (t_in + 1) / 3))
    d.line([(ax, ay), (lx, ly)], fill=c + (al,), width=4)
    # anchor: solid dot + two ripples
    for j in range(2):
        u = ((f - a) / 24 + j * 0.5) % 1.0
        r = 10 + 30 * u
        d.ellipse([ax - r, ay - r, ax + r, ay + r], outline=c + (int(al * (1 - u) * 0.8),), width=3)
    r = 9
    d.ellipse([ax - r, ay - r, ax + r, ay + r], fill=c + (al,), outline=(255, 255, 255, al), width=3)
    if k_line > 0.95:
        d.ellipse([ex - 6, ey - 6, ex + 6, ey + 6], fill=c + (al,))
    canvas.alpha_composite(lay)
    # card: wipes open from the side nearest the anchor, closes the same way
    k_card = min(ease_out((t_in - 4) / 7), ease_out(t_out / 5))
    if k_card <= 0:
        return
    wv = max(1, int(p.width * k_card))
    from_right = ax > px + p.width / 2
    crop = p.crop((p.width - wv, 0, p.width, p.height)) if from_right else p.crop((0, 0, wv, p.height))
    canvas.alpha_composite(crop, (int(px + (p.width - wv if from_right else 0)), int(py)))


# --------------------------------------------------------------------------- #
# Lower-third step title: red number tab + step name + Hinglish line, wiped in from the left
STEP_Y = 1238


@lru_cache(None)
def step_card(i, name):
    sub = STEP_SUB.get(name, "")
    fn, fs_ = inter("ExtraBold", 58), inter("SemiBold", 32)
    tw = max(fn.getlength(name.upper()), fs_.getlength(sub))
    w, h = int(tw) + 190, 128
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w - 1, h - 1], 24, fill=(10, 12, 20, 225))
    d.rounded_rectangle([0, 0, 128, h - 1], 24, fill=BR + (255,))
    d.rectangle([100, 0, 128, h - 1], fill=BR + (255,))
    d.text((64, h / 2), f"0{i + 1}", font=inter("ExtraBold", 56), fill=WHITE, anchor="mm")
    d.text((156, 48), name.upper(), font=fn, fill=WHITE, anchor="lm")
    d.text((158, 98), sub, font=fs_, fill=(225, 228, 238), anchor="lm")
    return img


def draw_step_card(canvas, f):
    for i, (s0, s1, name) in enumerate(STEPS):
        if s0 <= f < s0 + 48:
            break
    else:
        return
    img = step_card(i, name)
    t = f - s0
    k_in, k_out = ease_out(t / 9), ease_io((s0 + 48 - f) / 8)
    x = (W - img.width) / 2
    # a red streak runs ahead of the card
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    sx = -200 + (W + 400) * ease_io(t / 12)
    if t < 13:
        d.rounded_rectangle([sx - 220, STEP_Y + img.height / 2 - 4, sx, STEP_Y + img.height / 2 + 4], 4, fill=BR_L + (200,))
        canvas.alpha_composite(lay)
    wv = int(img.width * min(k_in, k_out))
    if wv > 1:
        canvas.alpha_composite(img.crop((0, 0, wv, img.height)), (int(x + 24 * (1 - k_in)), STEP_Y))


def draw_steps(canvas, f):
    a0, a1 = STEPS[0][0], STEPS[-1][1]
    k = min(1.0, (f - a0) / 8, (a1 - f) / 8)
    if k <= 0:
        return
    cur = max(i for i, s in enumerate(STEPS) if f >= s[0])
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    y, x0, x1 = 384, 190, 890
    xs = [x0 + (x1 - x0) * i / (len(STEPS) - 1) for i in range(len(STEPS))]
    al = int(255 * k)
    d.rounded_rectangle([x0 - 110, y - 46, x1 + 110, y + 78], 30, fill=(8, 10, 18, int(150 * k)))
    d.line([(xs[0], y), (xs[-1], y)], fill=(255, 255, 255, int(90 * k)), width=4)
    d.line([(xs[0], y), (xs[cur], y)], fill=BR + (al,), width=6)
    fnt = inter("Bold", 28)
    for i, (x, (s0, s1, name)) in enumerate(zip(xs, STEPS)):
        if i < cur:
            d.ellipse([x - 16, y - 16, x + 16, y + 16], fill=BR + (al,))
            d.text((x, y), "✓", font=inter("Bold", 22), fill=(255, 255, 255, al), anchor="mm")
        elif i == cur:
            pulse = 1 + 0.12 * math.sin((f - s0) / FPS * 2 * math.pi * 1.2)
            r = 24 * pulse
            d.ellipse([x - r - 8, y - r - 8, x + r + 8, y + r + 8], fill=BR + (int(70 * k),))
            d.ellipse([x - r, y - r, x + r, y + r], fill=BR + (al,), outline=(255, 255, 255, al), width=3)
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
    d.text((x0 + 30, y0 + 40), "SIGNAL", font=inter("Bold", 30), fill=(255, 255, 255, int(170 * k)), anchor="lm")
    d.text((x0 + w - 30, y0 + 40), item, font=inter("ExtraBold", 36), fill=HIL + (al,), anchor="rm")
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
        if len(lines) == 2:
            k = ease_out((f - a) / 5)
            img1 = text_block(lines[0], 100, 900, stroke=8)
            img2 = text_block(lines[1], 230, 960, stroke=12)
            paste_center(canvas, img1, W / 2, 700, k * out)
            paste_center(canvas, img2, W / 2, 880, k * out, 1.0 + 0.35 * (1 - ease_back((f - a) / 7)))
        else:
            for i, ln in enumerate(lines):
                t = (f - a - i * 8) / 7
                if t <= 0:
                    continue
                k = ease_out(t)
                img = text_block(ln, 82, 1000, stroke=8)
                paste_center(canvas, img, W / 2, 440 + i * 108 + (1 - k) * 30, k * out)


def draw_subs(canvas, f, phrases):
    if not CAPTIONS:
        return
    t = f / FPS
    for p in phrases:
        if p["start"] <= t < p["end"]:
            img = text_block(p[CAPTIONS], 64, 860)
            age = (t - p["start"]) * FPS
            s = 0.9 + 0.1 * ease_back(age / 5)
            paste_center(canvas, img, W / 2, SUB_Y, min(1.0, age / 3 + 0.25), s)
            return


# --------------------------------------------------------------------------- #
# Red brand wipe that carries the cut from the cold open into the story
WIPE_A, WIPE_B = CUT["S1"] - 8, CUT["S1"] + 8


def draw_wipe(canvas, f):
    if not (WIPE_A <= f <= WIPE_B):
        return
    u = ease_io((f - WIPE_A) / (WIPE_B - WIPE_A))
    slant = 520
    band = W * 1.9
    x = -band - slant + (W + band + 2 * slant) * u           # left edge of the band
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    d.polygon([(x + slant, 0), (x + band + slant, 0), (x + band, H), (x, H)], fill=BR + (255,))
    d.polygon([(x + band + slant, 0), (x + band + slant + 70, 0), (x + band + 70, H), (x + band, H)], fill=BR_L + (255,))
    d.polygon([(x + slant - 40, 0), (x + slant, 0), (x, H), (x - 40, H)], fill=brand.RED_DARK + (255,))
    # the brain rides through the middle of the band
    mk = brand.fit(brand.part("mark"), 260)
    cx = x + band / 2 + slant / 2
    if -mk.width < cx < W + mk.width:
        lay.alpha_composite(mk, (int(cx - mk.width / 2), int(H * 0.42 - mk.height / 2)))
    canvas.alpha_composite(lay)


# --------------------------------------------------------------------------- #
# Logo ending: the corner brain flies to the centre while a red iris opens out of it and fills the frame, the
# wordmark wipes in under it, a ring pulses out, and the follow line rises in. The last frame matches the logo.
END_MARK_H, END_MARK_Y, END_WORD_Y = 300, 820, 1062
IRIS = 16                     # frames for the iris to fill the frame


@lru_cache(None)
def end_bg():
    """Brand red with a soft lighter centre."""
    g = Image.radial_gradient("L").resize((W * 2, H * 2)).crop((W // 2, H // 2 - 300, W // 2 + W, H // 2 - 300 + H))
    base = Image.new("RGB", (W, H), BR)
    lite = Image.new("RGB", (W, H), (214, 22, 34))
    return Image.composite(base, lite, g.point(lambda v: min(255, int(v * 1.25)))).convert("RGBA")


@lru_cache(None)
def end_word():
    return brand.fit(brand.part("word"), 96)


@lru_cache(None)
def end_cta():
    img = Image.new("RGBA", (W, 200), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.text((W / 2, 40), END_CTA[0], font=inter("SemiBold", 44), fill=(255, 232, 232), anchor="mm")
    f2 = inter("ExtraBold", 50); tw = f2.getlength(END_CTA[1].upper())
    d.rounded_rectangle([W / 2 - tw / 2 - 44, 92, W / 2 + tw / 2 + 44, 170], 39, fill=WHITE)
    d.text((W / 2, 132), END_CTA[1].upper(), font=f2, fill=BR, anchor="mm")
    return img


def particles(f):
    """Slow white specks drifting up over the red."""
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for i in range(46):
        h1 = (i * 7919) % 1000 / 1000; h2 = (i * 104729) % 1000 / 1000; h3 = (i * 1299709) % 1000 / 1000
        x = h1 * W + 18 * math.sin(f / 30 + i)
        y = (h2 * H - (f - LOGO_IN) * (1.2 + 2.2 * h3)) % H
        r = 2 + 4 * h3
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, int(40 + 70 * h3)))
    return lay


def draw_logo_end(canvas, f):
    if f < LOGO_IN:
        return canvas
    t = f - LOGO_IN
    mx0, my0 = bug_mark_centre()
    u = ease_io(t / IRIS)
    # iris: a red circle grows from the corner brain and fills the frame
    if t < IRIS + 1:
        r = 30 + (math.hypot(W, H) + 40) * ease_io(t / IRIS) ** 1.15
        m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).ellipse([mx0 - r, my0 - r, mx0 + r, my0 + r], fill=255)
        canvas.paste(end_bg(), (0, 0), m)
        ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse([mx0 - r, my0 - r, mx0 + r, my0 + r], outline=BR_L + (220,), width=14)
        canvas.alpha_composite(ring)
    else:
        canvas = end_bg().copy()
        canvas.alpha_composite(particles(f))
    # the brain flies from the corner to the centre and grows, with a little overshoot
    cx = mx0 + (W / 2 - mx0) * u
    cy = my0 + (END_MARK_Y - my0) * u
    hmark = BUG_MARK + (END_MARK_H - BUG_MARK) * ease_back(t / (IRIS + 4), 1.2)
    hmark *= 1 + 0.015 * math.sin(max(0, t - IRIS) / FPS * 2 * math.pi * 0.8)        # breathing
    mk = brand.fit(brand.part("mark"), max(4, int(hmark)))
    canvas.alpha_composite(mk, (int(cx - mk.width / 2), int(cy - mk.height / 2)))
    # wordmark: wipes in left to right while rising a little
    tw = f - (LOGO_HIT - 8)
    if tw > 0:
        wd = end_word(); k = ease_out(tw / 10)
        wv = max(1, int(wd.width * k))
        canvas.alpha_composite(wd.crop((0, 0, wv, wd.height)), (int(W / 2 - wd.width / 2), int(END_WORD_Y + 20 * (1 - k))))
    # ring pulse when the wordmark lands
    tp = f - LOGO_HIT
    if 0 <= tp < 22:
        k = ease_out(tp / 22)
        r = 170 + 420 * k
        ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse([W / 2 - r, END_MARK_Y - r, W / 2 + r, END_MARK_Y + r], outline=(255, 255, 255, int(150 * (1 - k))), width=6)
        canvas.alpha_composite(ring)
    # follow line
    tc = f - (LOGO_HIT + 10)
    if tc > 0:
        k = ease_out(tc / 10)
        c = end_cta().copy(); c.putalpha(c.getchannel("A").point(lambda v: int(v * k)))
        canvas.alpha_composite(c, (0, int(1250 + 30 * (1 - k))))
    return canvas


# --------------------------------------------------------------------------- #
def compose(job):
    f, frames_dir, phrases, anchors = job
    src = os.path.join(frames_dir, f"f_{min(f, END - 1):04d}.png")     # the logo ending runs past the 3D
    if f >= LOGO_IN + IRIS + 1:
        canvas = Image.new("RGBA", (W, H))
        canvas = draw_logo_end(canvas, f)
        return f, canvas.convert("RGB").tobytes()
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
    if SHOW_TRACKER and STEPS[0][0] <= f < STEPS[-1][1]:
        draw_steps(canvas, f)
    draw_step_card(canvas, f)
    draw_meter(canvas, f)
    draw_wipe(canvas, f)
    draw_bug(canvas, f)
    canvas = draw_logo_end(canvas, f)
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
    frames = [int(x) for x in args.only.split(",")] if args.only else list(range(OUT_END))
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
