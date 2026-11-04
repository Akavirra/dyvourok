"""«Що на моїй тарілці?»: зразки слайдів для демо (img/slide-NN.jpg, з водяним знаком) і обкладинка набору (img/cover-card.*).
Слайди знімаємо з веб-презентації в den-movy (headless Chrome), водяний знак — як у make_handout_previews.py.
Запуск:  python scripts/make_tarilka_previews.py   (потім stamp_versions.py)"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_handout_previews import watermark  # noqa: E402

DECK = Path(r"C:\CProjects\11\den-movy\kharchuvannia\prezentaciya\index.html")
IMG = Path(__file__).resolve().parent.parent / "public" / "packs" / "tarilka" / "img"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
TEMP = Path(os.environ["TEMP"])
SLIDES = [1, 3, 4, 7, 9, 10, 12, 15, 17]


def shot(n, out):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1600,900",
                    "--virtual-time-budget=3000", f"--user-data-dir={TEMP / 'tarilka-prev'}", f"--screenshot={out}",
                    f"{DECK.as_uri()}?all#{n}"], check=True, capture_output=True)


try:
    for f in IMG.glob("slide-*.jpg"):
        f.unlink()
    raw = TEMP / "tarilka_slide.png"
    for i, n in enumerate(SLIDES, 1):
        shot(n, raw)
        im = Image.open(raw).convert("RGB").resize((960, 540), Image.LANCZOS)
        watermark(im, "Демо · повна презентація — з кодом доступу · dyvourok.com.ua").save(IMG / f"slide-{i:02d}.jpg", quality=66, optimize=True)
        if n == 1:
            full = Image.open(raw).convert("RGB")
            w, h = full.size                      # 1600×900 → 1320×570 (як cover-card інших наборів)
            k = 1320 / w
            cov = full.resize((1320, round(h * k)), Image.LANCZOS)
            top = (cov.height - 570) // 2
            cov = cov.crop((0, top, 1320, top + 570))
            cov.save(IMG / "cover-card.jpg", quality=82, optimize=True)
            cov.save(IMG / "cover-card.webp", quality=78)
    raw.unlink()
    print(len(SLIDES), "slides + cover")
finally:
    shutil.rmtree(TEMP / "tarilka-prev", ignore_errors=True)
    for d in TEMP.glob("scoped_dir*"):
        shutil.rmtree(d, ignore_errors=True)
