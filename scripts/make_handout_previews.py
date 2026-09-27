"""Прев'ю роздатки для демо: сторінки PDF → JPG низької роздільності з щільним водяним знаком «ЗРАЗОК».
Справжній PDF лишається за кодом доступу; прев'ю лежать у img/ (відкриті) і годяться лише щоб роздивитися.
Запускати після кожної зміни PDF:  python scripts/make_handout_previews.py   (потім stamp_versions.py)"""
import math
import os

import pymupdf
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
FONT = os.path.join(ROOT, 'fonts', 'Nunito.ttf')
PACKS = {
    # набір: (PDF, сторінки без прев'ю — відповіді для вчителя не показуємо)
    'mova': ('docs/robochi-arkushi.pdf', {18}),
}
LONG_SIDE = 760          # px — досить, щоб роздивитися, замало для друку
RED = (200, 52, 31)


def font(size):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_axes([900])
    except Exception:
        pass
    return f


def watermark(im):
    w, h = im.size
    base = im.convert('RGBA')
    # 1) щільна діагональна сітка тексту на всю сторінку
    diag = int(math.hypot(w, h)) + 40
    layer = Image.new('RGBA', (diag, diag), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(max(18, w // 22))
    text = 'ЗРАЗОК · ДИВОУРОК · '
    tw = d.textlength(text, font=f)
    step = int(f.size * 2.1)
    for row, y in enumerate(range(0, diag, step)):
        x = -(row % 2) * tw / 2
        while x < diag:
            d.text((x, y), text, font=f, fill=RED + (115,))
            x += tw
    layer = layer.rotate(32, resample=Image.BICUBIC)
    base.alpha_composite(layer, (-(diag - w) // 2, -(diag - h) // 2))
    # 2) великий штамп по центру
    stamp = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(stamp)
    big = font(int(min(w, h) * 0.2))
    d.text((w / 2, h / 2), 'ЗРАЗОК', font=big, anchor='mm', fill=RED + (175,),
           stroke_width=max(3, big.size // 14), stroke_fill=(255, 255, 255, 200))
    stamp = stamp.rotate(32, resample=Image.BICUBIC, center=(w / 2, h / 2))
    base.alpha_composite(stamp)
    # 3) смуга внизу
    d = ImageDraw.Draw(base)
    bh = max(28, h // 16)
    d.rectangle((0, h - bh, w, h), fill=RED + (235,))
    note = 'Демо · версія для друку — з кодом доступу · dyvourok.com.ua'
    size = max(11, bh // 3)
    while size > 9 and d.textlength(note, font=font(size)) > w * 0.94:
        size -= 1
    d.text((w / 2, h - bh / 2), note, font=font(size), anchor='mm', fill=(255, 255, 255, 255))
    return base.convert('RGB')


for pack, (pdf, skip) in PACKS.items():
    base = os.path.join(ROOT, 'packs', pack)
    doc = pymupdf.open(os.path.join(base, pdf))
    for f in os.listdir(os.path.join(base, 'img')):
        if f.startswith('handout-'):
            os.remove(os.path.join(base, 'img', f))
    n = 0
    for i, page in enumerate(doc):
        if i in skip:
            continue
        zoom = LONG_SIDE / max(page.rect.width, page.rect.height)
        pm = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        im = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
        n += 1
        watermark(im).save(os.path.join(base, 'img', f'handout-{n:02d}.jpg'), quality=62, optimize=True)
    print(pack, n, 'previews')
