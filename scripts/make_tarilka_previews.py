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
# версії: ?g=2 → slide-, ?g=1 → slide14-, ?g=3 → slide811-  (запуск з аргументом 1 / 2 / 3 — лише ця версія)
SETS = {2: ("slide-", SCREENS), 1: ("slide14-", [1, 4, 7, 8, 9, 10, 11, 12]), 3: ("slide811-", [1, 2, 7, 8, 9, 10, 11, 12])}


def shot(n, out, g=2):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080",
                    "--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required",
                    "--virtual-time-budget=6000", f"--user-data-dir={TEMP / 'tarilka-prev'}", f"--screenshot={out}",
                    f"{DECK.as_uri()}?g={g}&all#{n}"], check=True, capture_output=True)


try:
    raw = TEMP / "tarilka_slide.png"
    for g, (pre, screens) in SETS.items():
        if sys.argv[1:] and str(g) not in sys.argv[1:]:
            continue
        for f in IMG.glob(f"{pre}[0-9]*.jpg"):
            f.unlink()
        for i, n in enumerate(screens, 1):
            shot(n, raw, g)
            im = Image.open(raw).convert("RGB").resize((960, 540), Image.LANCZOS)
            watermark(im, "Демо · повний урок на дошці — з кодом доступу · dyvourok.com.ua").save(IMG / f"{pre}{i:02d}.jpg", quality=66, optimize=True)
        print(pre, len(screens), "screens")
    raw.unlink(missing_ok=True)
finally:
    shutil.rmtree(TEMP / "tarilka-prev", ignore_errors=True)
    for d in TEMP.glob("scoped_dir*"):
        shutil.rmtree(d, ignore_errors=True)
