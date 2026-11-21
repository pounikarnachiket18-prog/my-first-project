"""Draws the woman-feature overlay (hair, lashes, lips, bindi, blush) in the
coordinates of the 720x1280 reference frame at t=9.0s. Returns RGBA."""
from PIL import Image, ImageDraw, ImageFilter

W, H, SS = 720, 1280, 4
CX = 362  # face centre x
HAIR = (42, 34, 36, 255)
HAIR_HI = (78, 62, 58, 255)


def mirror(pts):
    return [(2 * CX - x, y) for x, y in pts]


def smooth(pts, n=3, closed=True):
    """Chaikin corner-cutting for soft cartoon curves."""
    for _ in range(n):
        out = []
        m = len(pts) if closed else len(pts) - 1
        for i in range(m):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
            out += [(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1), (0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1)]
        pts = out if closed else [pts[0]] + out + [pts[-1]]
    return pts


def P(pts):
    return [(x * SS, y * SS) for x, y in pts]


def build():
    img = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # --- long hair side panels (fall past the shoulders) ---
    left = [(312, 226), (288, 252), (274, 292), (266, 345), (262, 400), (259, 455),
            (260, 505), (265, 545), (280, 562), (300, 556), (316, 532), (318, 494),
            (313, 460), (305, 432), (298, 404), (294, 374), (295, 344), (297, 316),
            (303, 291), (316, 268), (336, 251)]
    for poly in (left, mirror(left)):
        d.polygon(P(smooth(poly)), fill=HAIR)
    # --- rounded crown with a soft centre-parted fringe ---
    import math
    top = [(CX + 80 * math.cos(a), 284 + 80 * math.sin(a))
           for a in [math.pi + i * math.pi / 24 for i in range(25)]]
    fringe = [(442, 300), (428, 280), (408, 266), (384, 259), (367, 262), (362, 257),
              (357, 262), (340, 259), (316, 266), (296, 280), (282, 300)]
    d.polygon(P(top + smooth(fringe, 2, closed=False)), fill=HAIR)
    # parting + highlight strands
    d.line(P([(362, 208), (362, 257)]), fill=(110, 80, 66, 255), width=int(2.5 * SS))
    for strand in ([(301, 300), (294, 380), (291, 470)], [(277, 330), (271, 430), (273, 520)]):
        d.line(P(smooth(strand, 2, closed=False)), fill=HAIR_HI, width=2 * SS, joint="curve")
        d.line(P(smooth(mirror(strand), 2, closed=False)), fill=HAIR_HI, width=2 * SS, joint="curve")
    for arc in ([(352, 214), (330, 224), (310, 246)],):
        d.line(P(smooth(arc, 2, closed=False)), fill=HAIR_HI, width=2 * SS, joint="curve")
        d.line(P(smooth(mirror(arc), 2, closed=False)), fill=HAIR_HI, width=2 * SS, joint="curve")

    # --- lashes / eyeliner (eyes at ~(329,340) and (396,340)) ---
    for ex, flick in ((329, -1), (396, 1)):
        d.arc([(ex - 13) * SS, (334 - 1) * SS, (ex + 13) * SS, (346 + 6) * SS], 190, 350,
              fill=(20, 10, 8, 255), width=int(2.6 * SS))
        ox = ex + flick * 12
        d.line(P([(ox, 337), (ox + flick * 6, 332)]), fill=(20, 10, 8, 255), width=int(2.4 * SS))
        d.line(P([(ox - flick * 4, 335), (ox + flick * 1, 329)]), fill=(20, 10, 8, 255), width=2 * SS)

    # --- lips (mouth at ~(362,395)) ---
    d.ellipse(P([(345, 389), (379, 402)]), fill=(160, 56, 70, 255))
    d.polygon(P([(345, 395), (352, 389), (362, 392), (372, 389), (379, 395)]), fill=(140, 44, 58, 255))
    d.line(P([(346, 395), (378, 395)]), fill=(70, 20, 24, 255), width=int(1.6 * SS))
    d.ellipse(P([(357, 397), (366, 400)]), fill=(200, 110, 118, 200))

    # --- bindi ---
    d.ellipse(P([(358.5, 318), (365.5, 325)]), fill=(200, 16, 46, 255))

    img = img.resize((W, H), Image.LANCZOS)

    # --- soft blush (separate blurred layer) ---
    blush = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(blush)
    for bx in (310, 414):
        bd.ellipse([bx - 13, 372, bx + 13, 390], fill=(225, 110, 110, 70))
    blush = blush.filter(ImageFilter.GaussianBlur(4))
    out = Image.alpha_composite(blush, img)
    return out


if __name__ == "__main__":
    import sys
    base = Image.open(sys.argv[1]).convert("RGBA")
    ov = build()
    comp = Image.alpha_composite(base, ov)
    comp.save(sys.argv[2])
    comp.crop((180, 140, 540, 600)).resize((540, 690), Image.LANCZOS).save(sys.argv[3])
