"""Відбиток версії для медіа наборів: pack.js отримує versions {шлях: хеш}, а застосунок додає ?v=хеш до адреси.
Змінився файл — змінилася адреса, тож браузер і service worker одразу беруть нову версію.
Запускати перед кожною викладкою:  python scripts/stamp_versions.py"""
import hashlib
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'packs')

for pack in os.listdir(ROOT):
    base = os.path.join(ROOT, pack)
    pj = os.path.join(base, 'pack.js')
    if not os.path.isfile(pj):
        continue
    vers = {}
    for sub in ('media', 'docs', 'img'):
        d = os.path.join(base, sub)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            h = hashlib.sha1(open(os.path.join(d, f), 'rb').read()).hexdigest()[:10]
            vers[f'{sub}/{f}'] = h
    s = open(pj, encoding='utf-8').read()
    line = '  versions: ' + json.dumps(vers, ensure_ascii=False) + ',\n'
    if re.search(r'^  versions: .*,\n', s, flags=re.M):
        s = re.sub(r'^  versions: .*,\n', lambda m: line, s, flags=re.M)
    else:
        s = s.replace("  base: ", line + "  base: ", 1)
    open(pj, 'w', encoding='utf-8').write(s)
    print(pack, len(vers), 'files stamped')
