"""«Що на моїй тарілці?»: зразки екранів уроку на дошці для демо (img/slide-NN.jpg, з водяним знаком).
Знімаємо нову дошку (public/packs/tarilka/prez/, file:// — CSP не заважає) у режимі ?all (кроки відкриті).
Водяний знак — як у make_handout_previews.py. Обкладинку (img/cover-card.*) робимо окремо, з ілюстрації Codex.
Запуск:  python scripts/make_tarilka_previews.py   (потім stamp_versions.py)"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_handout_previews import watermark  # noqa: E402

PACK = Path(__file__).resolve().parent.parent / "public" / "packs" / "tarilka"
DECK = PACK / "prez" / "index.html"
IMG = PACK / "img"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
TEMP = Path(os.environ["TEMP"])
SCREENS = [1, 3, 4, 5, 7, 8, 11, 13, 15]


def shot(n, out):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080",
                    "--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required",
                    "--virtual-time-budget=6000", f"--user-data-dir={TEMP / 'tarilka-prev'}", f"--screenshot={out}",
                    f"{DECK.as_uri()}?all#{n}"], check=True, capture_output=True)


try:
    for f in IMG.glob("slide-*.jpg"):
        f.unlink()
    raw = TEMP / "tarilka_slide.png"
    for i, n in enumerate(SCREENS, 1):
        shot(n, raw)
        im = Image.open(raw).convert("RGB").resize((960, 540), Image.LANCZOS)
        watermark(im, "Демо · повний урок на дошці — з кодом доступу · dyvourok.com.ua").save(IMG / f"slide-{i:02d}.jpg", quality=66, optimize=True)
    raw.unlink()
    print(len(SCREENS), "screens")
finally:
    shutil.rmtree(TEMP / "tarilka-prev", ignore_errors=True)
    for d in TEMP.glob("scoped_dir*"):
        shutil.rmtree(d, ignore_errors=True)
