"""Субтитри мультфільмів -> pack.js (поле subs). Плеєр показує їх поверх кадру за бажанням учителя.

Вихідні файли — subs/<pack>/<відео>.vtt (їх пишуть рендери в den-movy: *_anim.py --no-subs).
У pack.js, а не окремими файлами: так субтитри працюють і в офлайн-архіві (file://), і в демо без коду.
Запускати після оновлення .vtt, перед stamp_versions.py:  python scripts/embed_subs.py
"""
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SUBS = os.path.join(ROOT, 'subs')
PACKS = os.path.join(ROOT, 'public', 'packs')


def parse_vtt(path):
    def sec(ts):
        h, m, s = ts.split(':')
        return round(int(h) * 3600 + int(m) * 60 + float(s), 2)
    cues = []
    for block in re.split(r'\n\s*\n', open(path, encoding='utf-8').read().replace('\r', '')):
        lines = [l for l in block.strip().split('\n') if l]
        for i, l in enumerate(lines):
            m = re.match(r'([\d:.]+)\s*-->\s*([\d:.]+)', l)
            if m:
                cues.append([sec(m.group(1)), sec(m.group(2)), ' '.join(lines[i + 1:])])
                break
    return cues


for pack in sorted(os.listdir(SUBS)):
    pj = os.path.join(PACKS, pack, 'pack.js')
    subs = {f'media/{f[:-4]}.mp4': parse_vtt(os.path.join(SUBS, pack, f))
            for f in sorted(os.listdir(os.path.join(SUBS, pack))) if f.endswith('.vtt')}
    s = open(pj, encoding='utf-8').read()
    line = '  subs: ' + json.dumps(subs, ensure_ascii=False, separators=(',', ':')) + ',\n'
    if re.search(r'^  subs: .*,\n', s, flags=re.M):
        s = re.sub(r'^  subs: .*,\n', lambda m: line, s, flags=re.M)
    else:
        s = s.replace('  base: ', line + '  base: ', 1)
    open(pj, 'w', encoding='utf-8').write(s)
    print(pack, {k: len(v) for k, v in subs.items()})
