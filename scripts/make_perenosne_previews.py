"""«Робот Буквалик і чарівні окуляри»: демо-зразки для застосунку (з водяним знаком) і обкладинка.

  img/pptx-NN.jpg   — слайди PowerPoint (експорт D:\\perenosne-pptx\\png\\sNN.png після finish.ps1 -Png);
  img/slide-NN.jpg  — екрани уроку на дошці (public/packs/perenosne/prez, Playwright + системний Chrome);
  img/cover-card.jpg/.webp — обкладинка 1320×570 для бібліотеки й сайту.
Запуск:  python scripts/make_perenosne_previews.py   (потім stamp_versions.py)"""
import os
import sys
from pathlib import Path

from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_handout_previews import watermark  # noqa: E402

PACK = Path(__file__).resolve().parent.parent / "public" / "packs" / "perenosne"
IMG = PACK / "img"
PPTX_PNG = Path(r"D:\perenosne-pptx\png")
PPTX = [1, 4, 5, 6, 9, 13, 14, 16, 17]          # титул, каліграфія, тема, правило… (без службового слайда 21)
BOARD = [1, 4, 7, 8, 10, 11, 13, 14, 16]        # екрани дошки
W = 1280


def save(im, name):
    im = im.convert("RGB")
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    watermark(im).save(IMG / name, quality=64, optimize=True)


def pptx():
    for f in IMG.glob("pptx-*.jpg"):
        f.unlink()
    for i, n in enumerate(PPTX, 1):
        save(Image.open(PPTX_PNG / f"s{n:02d}.png"), f"pptx-{i:02d}.jpg")


def board():
    from playwright.sync_api import sync_playwright
    for f in IMG.glob("slide-*.jpg"):
        f.unlink()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        for i, n in enumerate(BOARD, 1):
            pg.goto((PACK / "prez" / "index.html").as_uri() + f"?all&r={n}#{n}")
            pg.wait_for_timeout(1500)
            if n == 8:   # «Окуляри»: показати справжнє значення
                pg.click(".scene.on .ln-btn"); pg.wait_for_timeout(800)
            if n == 14:  # квіз: одна відповідь
                pg.click(".scene.on .qz-btn.gold"); pg.wait_for_timeout(600)
            tmp = IMG / "_tmp.png"
            pg.screenshot(path=str(tmp))
            save(Image.open(tmp), f"slide-{i:02d}.jpg")
            tmp.unlink()
        b.close()


def cover():
    """Клас (Codex) + Буквалик, окуляри, Сова; праворуч світла смуга під назву на сайті не потрібна — назва в картці."""
    bg = Image.open(r"D:\perenosne-pptx\v3\assets\bg_class.jpg").convert("RGB")
    W0, H0 = 1320, 570
    k = W0 / bg.width
    bg = bg.resize((W0, round(bg.height * k)), Image.LANCZOS)
    top = (bg.height - H0) // 2
    c = bg.crop((0, top, W0, top + H0)).convert("RGBA")
    def put(path, h, x, yb):
        im = Image.open(path).convert("RGBA")
        im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
        sh = Image.new("RGBA", im.size, (40, 20, 5, 0)); sh.putalpha(im.getchannel("A").point(lambda v: v * 0.35))
        sh = sh.filter(ImageFilter.GaussianBlur(10))
        c.alpha_composite(sh, (x + 8, yb - h + 16)); c.alpha_composite(im, (x, yb - h))
    put(r"D:\perenosne-mult\shared\img\sova.png", 360, 250, 560)
    put(r"D:\perenosne-mult\shared\img\bukvalyk.png", 470, 640, 560)
    gl = r"D:\perenosne-pptx\v3\assets\glasses.png"
    im = Image.open(gl).convert("RGBA"); im = im.resize((300, round(im.height * 300 / im.width)), Image.LANCZOS).rotate(-8, expand=True, resample=Image.BICUBIC)
    c.alpha_composite(im, (960, 120))
    c = c.convert("RGB")
    c.save(IMG / "cover-card.jpg", quality=84, optimize=True)
    c.save(IMG / "cover-card.webp", "WEBP", quality=80, method=6)


if __name__ == "__main__":
    IMG.mkdir(exist_ok=True)
    pptx(); board(); cover()
    print("ok", len(list(IMG.glob("pptx-*"))), len(list(IMG.glob("slide-*"))))
