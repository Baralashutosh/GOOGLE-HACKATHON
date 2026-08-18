"""
Team and product marks.

The mark has to carry the idea at 48 pixels on a submission portal and at
2 metres on a Demo Day screen: two things that cannot see each other, and the
link between them. Amber is stock about to expire, red is a shelf about to run
dry, teal is the transfer that resolves both.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(__file__).parent
INK, AMBER, RED, TEAL, PAPER = (11, 15, 26), (245, 165, 36), (255, 77, 94), (45, 212, 167), (248, 250, 252)


def mark(size=1024, bg=INK, pad_ratio=0.17):
    """Two nodes joined by an arc. Legible when shrunk to a favicon."""
    S, img = size, Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg:
        d.rounded_rectangle([0, 0, S, S], radius=int(S * 0.22), fill=bg)

    p = S * pad_ratio
    left, right, mid = (p, S * 0.62), (S - p, S * 0.62), S * 0.30
    r = S * 0.078

    # The connecting arc, drawn thick so it survives downscaling.
    d.arc([left[0], mid, right[0], S * 0.94], start=180, end=360,
          fill=TEAL, width=int(S * 0.045))

    for (cx, cy), col in ((left, AMBER), (right, RED)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    return img


def wordmark(text="TWO CLOCKS", sub="", w=1900, h=430):
    img = Image.new("RGBA", (w, h), INK + (255,))
    d = ImageDraw.Draw(img)
    icon = mark(int(h * 0.66), bg=None, pad_ratio=0.14)
    img.alpha_composite(icon, (int(h * 0.10), int(h * 0.16)))
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", int(h * 0.20))
        fs = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", int(h * 0.078))
    except OSError:
        f = fs = ImageFont.load_default()
    x = int(h * 0.10) + int(h * 0.66) + int(h * 0.10)
    d.text((x, h * 0.34), text, font=f, fill=PAPER)
    if sub:
        d.text((x, h * 0.58), sub, font=fs, fill=(148, 163, 184))
    return img


if __name__ == "__main__":
    mark(1024).save(OUT / "logo-dark-1024.png")
    mark(1024, bg=PAPER).save(OUT / "logo-light-1024.png")
    mark(1024, bg=None).save(OUT / "logo-transparent-1024.png")
    mark(512).save(OUT / "logo-512.png")
    mark(256).save(OUT / "logo-256.png")
    wordmark("TWO CLOCKS", "surplus to shortage, before either becomes waste").save(OUT / "wordmark-twoclocks.png")
    wordmark("MedMesh", "the module every supply system is missing").save(OUT / "wordmark-medmesh.png")
    print("wrote:", *sorted(p.name for p in OUT.glob("*.png")), sep="\n  ")
