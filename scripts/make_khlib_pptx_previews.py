"""Зразки слайдів презентацій PowerPoint для набору «Шлях зернини» для демо-перегляду на сайті.
Беремо експортовані слайди з C:/CProjects/11/den-movy/khlib/prezentacii/png
і зберігаємо з водяним знаком у public/packs/khlib/img/
"""
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_handout_previews import ROOT, watermark

PNG_DIR = r'C:\CProjects\11\den-movy\khlib\prezentacii\png'
WIDTH = 960
NOTE = 'Демо · повна презентація PowerPoint — у наборі «Шлях зернини» · dyvourok.com.ua'

SLIDES = {
    '1-4': ([1, 3, 4, 5, 7, 8, 9, 11, 14], 'pptx14-'),
    '5-7': ([1, 2, 3, 5, 6, 7, 8, 10], 'pptx57-'),
    '8-11': ([1, 2, 4, 5, 6, 7, 8], 'pptx811-'),
}

img_dir = os.path.join(ROOT, 'packs', 'khlib', 'img')
os.makedirs(img_dir, exist_ok=True)

for level, (nums, prefix) in SLIDES.items():
    # видаляємо старі прев'ю з цим префіксом
    for f in os.listdir(img_dir):
        if f.startswith(prefix) and f.endswith('.jpg'):
            try:
                os.remove(os.path.join(img_dir, f))
            except Exception:
                pass
    for n, num in enumerate(nums, 1):
        src_path = os.path.join(PNG_DIR, level, f's{num:02d}.png')
        if not os.path.exists(src_path):
            print(f'Warning: {src_path} not found')
            continue
        im = Image.open(src_path).convert('RGB')
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
        out_file = os.path.join(img_dir, f'{prefix}{n:02d}.jpg')
        watermark(im, NOTE).save(out_file, quality=68, optimize=True)
    print(level, len(nums), 'slides generated')
