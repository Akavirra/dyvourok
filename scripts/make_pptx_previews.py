"""Зразки слайдів презентації PowerPoint для демо: лише зупинка «Тарас Шевченко» (вона й так безкоштовна в демо)
+ титул і карта подорожі, з тим самим водяним знаком «ЗРАЗОК», що й роздатка. Сам .pptx лишається за кодом доступу (R2).
Слайди беремо з PNG-експорту презентацій (den-movy/prezentacii: finish.ps1 -Png → png/<клас>/sNN.png).
Запускати після перезбирання презентацій:  python scripts/make_pptx_previews.py   (потім stamp_versions.py)"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_handout_previews import ROOT, watermark   # noqa: E402

PNG = r'C:\CProjects\11\den-movy\prezentacii\png'
WIDTH = 960              # px — щоб роздивитися слайд, але не показувати з проєктора
NOTE = 'Демо · повна презентація PowerPoint — з кодом доступу · dyvourok.com.ua'
# клас: (номери слайдів, префікс файлів у img/ — як preview у pack.js presentations)
SLIDES = {
    '1-4': ([1, 4, 17, 18, 19, 20, 21, 22, 23], 'pptx14-'),
    '5-7': ([1, 4, 17, 18, 19, 20, 21, 22, 23], 'pptx57-'),
    '8-11': ([1, 4, 26, 27, 28, 29, 30, 31, 32], 'pptx811-'),
}

img_dir = os.path.join(ROOT, 'packs', 'mova', 'img')
for level, (nums, prefix) in SLIDES.items():
    for f in os.listdir(img_dir):
        if f.startswith(prefix):
            os.remove(os.path.join(img_dir, f))
    for n, num in enumerate(nums, 1):
        im = Image.open(os.path.join(PNG, level, f's{num:02d}.png')).convert('RGB')
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
        watermark(im, NOTE).save(os.path.join(img_dir, f'{prefix}{n:02d}.jpg'), quality=64, optimize=True)
    print(level, len(nums), 'slides')
