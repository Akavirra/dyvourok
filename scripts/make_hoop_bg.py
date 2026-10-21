"""Фон за 3D-вишивкою: мінімалістичні шари рваного паперу (SVG). Кожен шматок — кольоровий папір
з білим «зрізом» по рваному краю і м'якою тінню. Вставляє SVG у public/index.html між
<!-- hoop:bg --> і <!-- /hoop:bg -->.  Запуск:  python scripts/make_hoop_bg.py"""
import math
import os
import random
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PAGE = os.path.join(ROOT, 'public', 'index.html')


def blob(cx, cy, rx, ry, seed, rot=0.0, lumpy=.08, torn=.012, step=1.6):
    """Замкнений контур: плавна «органічна» форма + дрібний рваний край."""
    r = random.Random(seed)
    k = [(r.uniform(-1, 1), r.uniform(0, 6.3)) for _ in range(4)]
    pts = []
    a = 0.0
    while a < 360:
        t = math.radians(a)
        f = 1 + sum(amp * lumpy * math.sin((i + 2) * t + ph) for i, (amp, ph) in enumerate(k))
        f += r.uniform(-torn, torn) * (3 if r.random() < .08 else 1)
        x, y = rx * f * math.cos(t), ry * f * math.sin(t)
        c, s = math.cos(rot), math.sin(rot)
        pts.append(f'{cx + x * c - y * s:.1f},{cy + x * s + y * c:.1f}')
        a += r.uniform(step * .5, step * 1.5)
    return 'M' + ' L'.join(pts) + 'Z'


def piece(cls, d_rim, d_paper, fill, depth):
    return (f'<g class="bg-piece {cls}" style="--d:{depth}" filter="url(#bgsh)">'
            f'<path d="{d_rim}" fill="#FFFDF8"/><path d="{d_paper}" fill="{fill}"/></g>')


def layer(cls, cx, cy, rx, ry, seed, rot, fill, depth):
    # білий зріз: та сама форма, трохи більша — виглядає з-під кольорового шару як волокна паперу
    return piece(cls, blob(cx, cy, rx * 1.025, ry * 1.025, seed, rot, torn=.02), blob(cx, cy, rx, ry, seed, rot), fill, depth)


svg = f'''<svg class="hoop-bg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs>
    <filter id="bgsh" x="-10%" y="-10%" width="125%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -.35 .2" result="g"/>
      <feComposite in="g" in2="SourceGraphic" operator="in" result="gi"/>
      <feBlend in="SourceGraphic" in2="gi" mode="multiply" result="tex"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="9"/>
      <feOffset dx="4" dy="12" result="o"/>
      <feComponentTransfer in="o" result="s"><feFuncA type="linear" slope=".22"/></feComponentTransfer>
      <feMerge><feMergeNode in="s"/><feMergeNode in="tex"/></feMerge>
    </filter>
  </defs>
  {layer('p1', 520, 520, 430, 400, 11, .2, '#F3E7D3', .2)}
  {layer('p2', 790, 210, 210, 150, 23, -.5, '#DDE5F0', .5)}
  {layer('p3', 300, 840, 230, 150, 37, .4, '#F5D6CB', .7)}
  {layer('p4', 560, 545, 300, 280, 41, -.1, '#FBF6EC', .35)}
</svg>'''

s = open(PAGE, encoding='utf-8').read()
block = f'<!-- hoop:bg -->\n        {svg}\n        <!-- /hoop:bg -->'
if '<!-- hoop:bg -->' in s:
    s = re.sub(r'<!-- hoop:bg -->.*?<!-- /hoop:bg -->', lambda m: block, s, flags=re.S)
else:
    s = s.replace('      <div class="hoop-wrap">\n', '      <div class="hoop-wrap">\n        ' + block + '\n', 1)
open(PAGE, 'w', encoding='utf-8').write(s)
print('hoop bg:', len(svg) // 1024, 'KB')
