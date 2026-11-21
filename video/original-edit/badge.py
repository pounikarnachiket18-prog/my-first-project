"""'Mindset Mode Explainers' badge: white pill, blue M disc, reference-style blue."""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONT, OUT = sys.argv[1], sys.argv[2]
SS = 4
W, H = 720, 1280
BLUE = (42, 63, 214, 255)
INK = (21, 23, 28, 255)
f = ImageFont.truetype(FONT, 25 * SS)
fm = ImageFont.truetype(FONT, 26 * SS)
words = [("Mindset ", INK), ("Mode", BLUE), (" Explainers", INK)]
tw = sum(f.getlength(w) for w, _ in words)
disc = 36 * SS
pad = 10 * SS
pw, ph = int(pad + disc + 10 * SS + tw + 18 * SS), 50 * SS
x0, y0 = (W * SS - pw) // 2, 40 * SS
img = Image.new("RGBA", (W * SS, 140 * SS), (0, 0, 0, 0))
# soft shadow
sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
ImageDraw.Draw(sh).rounded_rectangle([x0, y0 + 4 * SS, x0 + pw, y0 + ph + 4 * SS], radius=ph // 2, fill=(20, 30, 60, 70))
sh = sh.filter(ImageFilter.GaussianBlur(6 * SS))
img = Image.alpha_composite(img, sh)
d = ImageDraw.Draw(img)
d.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], radius=ph // 2, fill=(255, 255, 255, 240))
cx, cy = x0 + pad + disc // 2, y0 + ph // 2
d.ellipse([cx - disc // 2, cy - disc // 2, cx + disc // 2, cy + disc // 2], fill=BLUE)
d.text((cx, cy + 1 * SS), "M", font=fm, fill=(255, 255, 255, 255), anchor="mm")
x = x0 + pad + disc + 10 * SS
for w, c in words:
    d.text((x, cy + 1 * SS), w, font=f, fill=c, anchor="lm")
    x += f.getlength(w)
full = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
full.paste(img, (0, 0))
full.resize((W, H), Image.LANCZOS).save(OUT)
