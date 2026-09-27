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

# Код застосунку й сайту: ?v=хеш у <script>/<link> (зона Cloudflare тримає js/css у браузері 4 год)
PUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
for page in ('app/index.html', 'index.html'):
    hp = os.path.join(PUB, page)
    s = open(hp, encoding='utf-8').read()

    def bump(m):
        attr, path = m.group(1), m.group(2)
        f = os.path.join(PUB, path)
        if not os.path.isfile(f):
            return m.group(0)
        h = hashlib.sha1(open(f, 'rb').read()).hexdigest()[:10]
        return f'{attr}="{path}?v={h}"'
    s2 = re.sub(r'(src|href)="((?:js|css|packs/[a-z0-9-]+)/[^"?]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"', bump, s)
    if s2 != s:
        open(hp, 'w', encoding='utf-8').write(s2)
    print(page, 'stamped')
