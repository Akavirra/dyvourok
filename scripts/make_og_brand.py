"""Загальна картинка для поширення сайту (og:image, 1200×630): заголовок бренду + 3D-вишивка з першого екрана.
Запуск:  python scripts/make_og_brand.py  →  public/img/site/og-brand.jpg"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PUB = os.path.join(ROOT, 'public')
BRAND = os.path.join(ROOT, '..', 'den-movy', 'brand')
W, H = 1200, 630
PAPER, INK, INK2, RED, RED_DARK, YELLOW = '#FBF6EC', '#2A1714', '#4B3A33', '#C8341F', '#A92A18', '#F2B530'


def font(weight, size):
    f = ImageFont.truetype(os.path.join(BRAND, 'src', 'Nunito-VF.ttf'), size)
    f.set_variation_by_axes([weight])
    return f


img = Image.new('RGBA', (W, H), PAPER)
d = ImageDraw.Draw(img)

# праворуч: рваний папір і 3D-вишивка з маскотами — знімки сцени першого екрана
# (scene3d/og/bg.webp — шари фону scripts/make_hoop_bg.py, scene3d/og/hoop.webp — прозорий кадр js/hoop.js)
def place(path, size, cx, cy):
    im = Image.open(os.path.join(ROOT, 'scene3d', 'og', path)).convert('RGBA')
    im = im.resize((size, size), Image.LANCZOS)
    img.alpha_composite(im, (int(cx - size / 2), int(cy - size / 2)))


place('bg.webp', 800, 930, 330)
place('hoop.webp', 600, 912, 320)

# вишита смуга знизу (як .stitch на сайті)
for x in range(0, W, 14):
    for y0, dx in ((H - 22, 0), (H - 15, 7)):
        d.polygon([(x + dx, y0 + 4), (x + dx + 4, y0), (x + dx + 8, y0 + 4), (x + dx + 4, y0 + 8)], fill=RED)

# логотип
logo = Image.open(os.path.join(BRAND, 'kit', 'dyvourok-logo.png')).convert('RGBA')
lw = 250
logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
img.alpha_composite(logo, (60, 52))

# заголовок: «Уроки, які / оживають / на дошці»
x, y = 60, 150
h1 = font(1000, 70)
d.text((x, y), 'Уроки, які', font=h1, fill=INK)
y += 82
word = 'оживають'
bw = d.textlength(word, font=h1)
d.rounded_rectangle((x - 4, y + 58, x + bw + 4, y + 74), radius=4, fill=YELLOW)
d.text((x, y), word, font=h1, fill=RED)
y += 82
d.text((x, y), 'на дошці', font=h1, fill=INK)

# підзаголовок
y += 104
sub = font(800, 27)
d.text((x, y), 'Готові уроки-свята для дошки', font=sub, fill=INK2)
d.text((x, y + 36), 'і безкоштовні матеріали щоп’ятниці', font=sub, fill=INK2)

# пігулка «1–11 клас · НУШ»
y += 96
pill = font(900, 24)
t = '1–11 клас · НУШ'
tw = d.textlength(t, font=pill)
d.rounded_rectangle((x, y, x + tw + 40, y + 46), radius=23, fill=RED)
d.rounded_rectangle((x, y + 40, x + tw + 40, y + 50), radius=5, fill=RED_DARK)
d.rounded_rectangle((x, y, x + tw + 40, y + 44), radius=22, fill=RED)
d.text((x + 20, y + 6), t, font=pill, fill='white')

out = os.path.join(PUB, 'img', 'site', 'og-brand.jpg')
img.convert('RGB').save(out, quality=88)
print(out, os.path.getsize(out) // 1024, 'KB')
