"""
Just KnowIt branding shared by the 3D scene (build_reel.py) and the graphics pass (post.py).

The logo comes from assets/justknowit_logo.png (white brain mark and wordmark on the brand red). The white artwork is
keyed out of the red so it can be laid on anything: a T-shirt, the ID card, the detector plate and the overlays.
"""
import os
from functools import lru_cache

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO_SRC = os.path.join(HERE, "assets", "justknowit_logo.png")
NAME = "Just KnowIt"
RED = (192, 2, 16)            # brand red, sRGB
RED_LIGHT = (255, 92, 100)    # for small text on dark backgrounds
RED_DARK = (120, 0, 10)
MARK_BOX = (552, 472, 734, 672)     # brain mark in the source logo (x0, y0, x1, y1)
WORD_BOX = (250, 708, 1032, 802)    # "Just KnowIt" wordmark


@lru_cache(None)
def _alpha():
    """White artwork as an alpha mask (the green channel is ~0 on the red and 255 on the white)."""
    g = Image.open(LOGO_SRC).convert("RGB").getchannel("G")
    return g.point(lambda v: max(0, min(255, int((v - 30) * 255 / 205))))


@lru_cache(None)
def part(which, colour=(255, 255, 255)):
    """'mark' (brain) or 'word' (wordmark) as an RGBA image in the given colour on transparency."""
    a = _alpha().crop(MARK_BOX if which == "mark" else WORD_BOX)
    img = Image.new("RGBA", a.size, colour + (255,))
    img.putalpha(a)
    return img


def fit(img, h):
    """Scale an RGBA image to height h."""
    return img.resize((max(1, round(img.width * h / img.height)), h), Image.LANCZOS)


def lockup(height, gap=0.28, colour=(255, 255, 255), stacked=False):
    """The logo as one RGBA image: mark beside (or above) the wordmark. height = mark height in px."""
    mark = fit(part("mark", colour), height)
    word = fit(part("word", colour), round(height * (0.5 if not stacked else 0.42)))
    if stacked:
        g = round(height * gap)
        w = max(mark.width, word.width); h = mark.height + g + word.height
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        img.alpha_composite(mark, ((w - mark.width) // 2, 0))
        img.alpha_composite(word, ((w - word.width) // 2, mark.height + g))
        return img
    g = round(height * gap)
    img = Image.new("RGBA", (mark.width + g + word.width, height), (0, 0, 0, 0))
    img.alpha_composite(mark, (0, 0))
    img.alpha_composite(word, (mark.width + g, (height - word.height) // 2 + round(height * 0.04)))
    return img
