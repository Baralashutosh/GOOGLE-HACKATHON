"""
Generate photographs of paper stock registers.

This is the last-mile problem made concrete. Most primary facilities across
BRICS never file a digital stock count, they keep a bound paper register, and
that register is the only record that exists. Every logistics platform ever
built has asked those facilities to start typing instead. They did not, which is
why national dashboards show green while the shelf is empty.

MedMesh reads the register they already keep. So the demo needs registers that
look like what a pharmacist would actually photograph: a printed form, filled in
by hand, shot at an angle under bad light, slightly out of true.

Each image is written with a GROUND TRUTH json beside it, so extraction accuracy
is measured rather than asserted.

Run:  python data/generator/registers.py
"""

from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "data" / "catalog"
OUT = ROOT / "public" / "samples"

SEED = 4242
W, H = 1500, 1580

# Windows ships a genuine handwriting face; the printed form uses a serif.
HAND = "C:/Windows/Fonts/Inkfree.ttf"
HAND_ALT = "C:/Windows/Fonts/segoesc.ttf"
PRINT = "C:/Windows/Fonts/times.ttf"
PRINT_BOLD = "C:/Windows/Fonts/timesbd.ttf"

# Per-country register: the header a real form carries, and its column titles.
FORMS = {
    "IN": {
        "title": "PRIMARY HEALTH CENTRE, STOCK REGISTER",
        "subtitle": "Essential Drugs | Form 7-A | National Health Mission",
        "place": "PHC Kanti, Block Kanti, District Muzaffarpur, Bihar",
        "month": "Month: AUGUST 2026",
        "cols": ["S.No", "Name of Drug", "Batch No.", "Expiry", "Opening", "Recd.", "Issued", "Balance"],
        "sign": "Signature of Pharmacist",
        "signer": "R. Kumari",
        "lang": "en/hi",
    },
    "BR": {
        "title": "UNIDADE BÁSICA DE SAÚDE, CONTROLE DE ESTOQUE",
        "subtitle": "Medicamentos Essenciais | RENAME | Secretaria Municipal de Saúde",
        "place": "UBS Itacoatiara Centro, Itacoatiara, Amazonas",
        "month": "Mês: AGOSTO 2026",
        "cols": ["N°", "Medicamento", "Lote", "Validade", "Saldo Ant.", "Entrada", "Saída", "Saldo"],
        "sign": "Assinatura do Farmacêutico",
        "signer": "M. Oliveira",
        "lang": "pt",
    },
    "ZA": {
        "title": "PRIMARY HEALTH CARE CLINIC, STOCK CONTROL SHEET",
        "subtitle": "Essential Medicines List | Department of Health | KwaZulu-Natal",
        "place": "Mtubatuba Clinic, uMkhanyakude District, KZN",
        "month": "Month: AUGUST 2026",
        "cols": ["No", "Medicine", "Batch", "Expiry", "Opening", "Recd", "Issued", "Balance"],
        "sign": "Pharmacist Assistant Signature",
        "signer": "N. Zulu",
        "lang": "en/zu",
    },
}

# Left edge of each column. The last column must still end inside the right
# rule at W-60, or four-digit balances get guillotined by the page edge.
COL_X = [60, 140, 520, 700, 850, 990, 1120, 1270]
RIGHT = 1440


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default(size)


def fit_font(draw, text: str, max_w: float, path: str, size: int) -> ImageFont.FreeTypeFont:
    """
    Shrink the pen until the words fit the box.

    Pharmacists squeeze long drug names into narrow columns rather than let
    them run into the next one, so the model should be asked to read cramped
    writing, not writing that has politely overflowed into the batch column.
    """
    f = font(path, size)
    while size > 17 and draw.textlength(text, font=f) > max_w:
        size -= 2
        f = font(path, size)
    return f


def jitter_text(draw, xy, text, fnt, rng, fill=(28, 32, 68), spread=1.6):
    """
    Draw text with per-character wobble.

    Real handwriting does not sit on the baseline. Without this the model is
    reading a screenshot of a spreadsheet, and the demo proves nothing about
    whether it can read what a pharmacist actually wrote.
    """
    x, y = xy
    for ch in text:
        dy = rng.uniform(-spread, spread)
        dx = rng.uniform(-0.4, 0.9)
        draw.text((x + dx, y + dy), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + rng.uniform(-0.3, 0.7)


def paper(rng: random.Random) -> Image.Image:
    """Aged off-white stock with faint fibre noise."""
    img = Image.new("RGB", (W, H), (252, 250, 242))
    px = img.load()
    for _ in range(int(W * H * 0.02)):
        x, y = rng.randrange(W), rng.randrange(H)
        v = rng.randint(-14, 6)
        r, g, b = px[x, y]
        px[x, y] = (max(0, r + v), max(0, g + v), max(0, b + v))
    return img


def build_page(code: str, drugs: list[dict], rng: random.Random):
    cfg = FORMS[code]
    img = paper(rng)
    d = ImageDraw.Draw(img)

    f_title = font(PRINT_BOLD, 34)
    f_sub = font(PRINT, 21)
    f_col = font(PRINT_BOLD, 22)
    f_hand = font(HAND, 34)
    f_hand_sm = font(HAND, 30)

    # --- printed form ---
    d.text((70, 55), cfg["title"], font=f_title, fill=(20, 20, 20))
    d.text((70, 100), cfg["subtitle"], font=f_sub, fill=(60, 60, 60))
    d.text((70, 132), cfg["place"], font=f_sub, fill=(60, 60, 60))
    d.text((1080, 132), cfg["month"], font=f_sub, fill=(60, 60, 60))
    d.line([(60, 170), (RIGHT, 170)], fill=(30, 30, 30), width=3)

    top = 190
    row_h = 78
    for i, c in enumerate(cfg["cols"]):
        d.text((COL_X[i] + 6, top + 12), c, font=f_col, fill=(25, 25, 25))
    d.line([(60, top + 52), (RIGHT, top + 52)], fill=(30, 30, 30), width=2)

    n_rows = 14
    body_top = top + 52
    for r in range(n_rows + 1):
        y = body_top + r * row_h
        d.line([(60, y), (RIGHT, y)], fill=(175, 180, 190), width=1)
    for x in COL_X[1:]:
        d.line([(x - 10, top), (x - 10, body_top + n_rows * row_h)], fill=(175, 180, 190), width=1)
    d.line([(60, top), (60, body_top + n_rows * row_h)], fill=(30, 30, 30), width=2)
    d.line([(RIGHT, top), (RIGHT, body_top + n_rows * row_h)], fill=(30, 30, 30), width=2)

    # --- handwritten entries ---
    truth = []
    chosen = rng.sample(drugs, n_rows)
    today = date(2026, 8, 17)

    for i, drug in enumerate(chosen):
        y = body_top + i * row_h + 18
        name = drug["localNames"].get(code, drug["inn"])
        batch = f"{rng.choice('ABCDEFGH')}{rng.randint(10,99)}{rng.randint(100,999)}"
        expiry = today + timedelta(days=rng.randint(-40, 640))
        opening = rng.randrange(40, 4000)
        recd = rng.choice([0, 0, rng.randrange(100, 2500)])
        issued = min(opening + recd, rng.randrange(20, 1800))
        balance = opening + recd - issued

        name_font = fit_font(d, name, COL_X[2] - COL_X[1] - 24, HAND, 30)
        jitter_text(d, (COL_X[0] + 12, y), str(i + 1), f_hand, rng)
        jitter_text(d, (COL_X[1] + 8, y), name, name_font, rng)
        jitter_text(d, (COL_X[2] + 4, y), batch, f_hand_sm, rng)
        jitter_text(d, (COL_X[3] + 4, y), expiry.strftime("%m/%y"), f_hand_sm, rng)
        jitter_text(d, (COL_X[4] + 8, y), str(opening), f_hand_sm, rng)
        jitter_text(d, (COL_X[5] + 8, y), str(recd) if recd else "Nil", f_hand_sm, rng)
        jitter_text(d, (COL_X[6] + 8, y), str(issued), f_hand_sm, rng)
        jitter_text(d, (COL_X[7] + 8, y), str(balance), f_hand_sm, rng)

        truth.append({
            "row": i + 1,
            "drugId": drug["id"],
            "writtenName": name,
            "batchNo": batch,
            "expiry": expiry.strftime("%Y-%m"),
            "balance": balance,
        })

    foot = body_top + n_rows * row_h + 40
    d.text((70, foot), cfg["sign"], font=f_sub, fill=(60, 60, 60))
    jitter_text(d, (400, foot - 14), cfg["signer"], font(HAND, 40), rng, fill=(20, 30, 110), spread=2.4)
    d.line([(390, foot + 40), (700, foot + 40)], fill=(120, 120, 120), width=1)

    return img, truth


def photograph(img: Image.Image, rng: random.Random) -> Image.Image:
    """
    Make it look shot on a phone rather than exported from a printer.

    Perspective skew, uneven lighting and compression noise are exactly the
    conditions the model has to survive in a real clinic. A clean render would
    flatter the demo and tell us nothing.
    """
    # Slight perspective, as if held at an angle.
    m = 0.012
    dx = W * m * rng.uniform(0.4, 1.0)
    dy = H * m * rng.uniform(0.2, 0.7)
    coeffs = find_coeffs(
        [(0, 0), (W, 0), (W, H), (0, H)],
        [(dx, dy), (W - dx * 0.5, dy * 0.4), (W - dx * 0.2, H - dy), (dx * 0.7, H - dy * 0.3)])
    img = img.transform((W, H), Image.PERSPECTIVE, coeffs, Image.BICUBIC,
                        fillcolor=(235, 233, 226))
    img = img.rotate(rng.uniform(-1.6, 1.6), resample=Image.BICUBIC,
                     fillcolor=(235, 233, 226))

    # Uneven light: brighter one side, shadow the other.
    grad = Image.new("L", (W, H))
    gd = ImageDraw.Draw(grad)
    for x in range(0, W, 4):
        gd.rectangle([x, 0, x + 4, H], fill=int(215 + 40 * (x / W)))
    img = Image.composite(img, Image.new("RGB", (W, H), (196, 193, 186)), grad)

    img = img.filter(ImageFilter.GaussianBlur(0.45))
    return img


def find_coeffs(src, dst):
    import numpy as np
    matrix = []
    for s, t in zip(src, dst):
        matrix.append([t[0], t[1], 1, 0, 0, 0, -s[0] * t[0], -s[0] * t[1]])
        matrix.append([0, 0, 0, t[0], t[1], 1, -s[1] * t[0], -s[1] * t[1]])
    A = np.matrix(matrix, dtype=float)
    B = np.array(src).reshape(8)
    return np.array(np.linalg.solve(A, B)).reshape(8)


def main() -> None:
    rng = random.Random(SEED)
    OUT.mkdir(parents=True, exist_ok=True)
    drugs = json.loads((CATALOG / "drugs.json").read_text(encoding="utf-8"))

    index = []
    for code in FORMS:
        img, truth = build_page(code, drugs, rng)
        img = photograph(img, rng)
        name = f"register_{code.lower()}"
        img.save(OUT / f"{name}.jpg", quality=76, optimize=True)
        (OUT / f"{name}.truth.json").write_text(
            json.dumps({"country": code, "rows": truth}, indent=2, ensure_ascii=False),
            encoding="utf-8")
        index.append({"country": code, "image": f"/samples/{name}.jpg",
                      "truth": f"/samples/{name}.truth.json", "rows": len(truth)})
        print(f"  {name}.jpg  ({len(truth)} rows)  {FORMS[code]['place']}")

    build_damaged()
    index.append({"country": "IN", "image": "/samples/register_in_damaged.jpg",
                  "truth": "/samples/register_in_damaged.truth.json",
                  "rows": 14, "damaged": True})

    (OUT / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"\nwrote {len(index)} registers to public/samples/")




def degrade(img: Image.Image, rng: random.Random) -> Image.Image:
    """
    Wreck a page the way a real one gets wrecked.

    Every sample so far comes back at 100% confidence, which makes the review
    threshold look like decoration. It is not: the point of the confidence gate
    is that the system knows when it cannot read something and hands that row to
    a human rather than shipping medicine on a guess. To show the gate working,
    there has to be a page it genuinely struggles with.

    Damp, ink bleed, a mug ring and a crease. Nothing exotic, just a register
    that has lived in a clinic for a year.
    """
    d = ImageDraw.Draw(img, "RGBA")

    # Tea ring, the universal punctuation of a working register.
    cx, cy, r = rng.randint(700, 1100), rng.randint(500, 900), rng.randint(110, 150)
    for i in range(4):
        d.ellipse([cx - r + i * 3, cy - r + i * 3, cx + r - i * 3, cy + r - i * 3],
                  outline=(past := (150, 110, 60, 40 + i * 12)), width=6)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(160, 120, 70, 26))

    # Damp patches that bleed the ink into the paper.
    for _ in range(3):
        bx, by = rng.randint(80, 1200), rng.randint(300, 1200)
        bw, bh = rng.randint(150, 320), rng.randint(70, 160)
        d.ellipse([bx, by, bx + bw, by + bh], fill=(120, 130, 150, 30))

    # A hard crease down the page.
    fold = rng.randint(500, 900)
    d.line([(fold, 0), (fold + rng.randint(-20, 20), H)], fill=(90, 90, 100, 55), width=3)

    # Smudge a few cells outright so those digits are genuinely ambiguous.
    for _ in range(5):
        sx, sy = rng.randint(850, 1400), rng.randint(280, 1300)
        d.ellipse([sx, sy, sx + rng.randint(50, 90), sy + rng.randint(22, 34)],
                  fill=(70, 75, 105, 120))

    img = img.filter(ImageFilter.GaussianBlur(1.5))
    return img


def build_damaged() -> None:
    """Emit a degraded Indian register alongside the clean set."""
    rng = random.Random(SEED + 7)
    drugs = json.loads((CATALOG / "drugs.json").read_text(encoding="utf-8"))
    img, truth = build_page("IN", drugs, rng)
    img = degrade(img, rng)
    img = photograph(img, rng)
    img.save(OUT / "register_in_damaged.jpg", quality=52, optimize=True)
    (OUT / "register_in_damaged.truth.json").write_text(
        json.dumps({"country": "IN", "damaged": True, "rows": truth},
                   indent=2, ensure_ascii=False), encoding="utf-8")
    print("  register_in_damaged.jpg  (14 rows, degraded)")


if __name__ == "__main__":
    main()
