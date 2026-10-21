"""Збирає 3D-сцену першого екрана: scene3d/hoop.js + three.js (tree-shaking, мінімізація) → public/js/hoop.js.
three.js r160 лежить у scene3d/vendor (MIT). Потрібен esbuild: шукаємо в PATH або в кеші npx (його приносить wrangler).
Запуск:  python scripts/build_hoop.py"""
import glob
import os
import shutil
import subprocess

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
exe = shutil.which('esbuild') or next(iter(sorted(glob.glob(os.path.join(
    os.environ.get('LOCALAPPDATA', ''), 'npm-cache', '_npx', '*', 'node_modules', '@esbuild', '*', 'esbuild.exe')))), None)
if not exe:
    raise SystemExit('esbuild не знайдено: npx esbuild --version або npm i -g esbuild')
out = os.path.join(ROOT, 'public', 'js', 'hoop.js')
subprocess.run([exe, os.path.join(ROOT, 'scene3d', 'hoop.js'), '--bundle', '--minify', '--format=esm',
                '--target=es2020', '--legal-comments=eof', f'--outfile={out}'], check=True)
print('public/js/hoop.js', os.path.getsize(out) // 1024, 'KB')
