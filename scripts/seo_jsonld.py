"""Структуровані дані для Google (JSON-LD) у public/index.html: організація, набір із ціною і часті питання.
FAQ береться з самої сторінки (<details><summary>…</summary><p>…</p></details>), тож після зміни FAQ чи ціни
просто запустіть знову:  python scripts/seo_jsonld.py
"""
import html
import io
import json
import os
import re
import time

PAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'index.html')
START, END = '<!-- seo:jsonld -->', '<!-- /seo:jsonld -->'
SITE = 'https://dyvourok.com.ua/'
# ціна для перших покупців 250 ₴ до 19.10.2026 включно, з 20.10 — 300 ₴. Після 20.10 запустіть скрипт знову.
EARLY = time.time() < 1792443600   # 2026-10-20 00:00 за Києвом
PRICE = '250' if EARLY else '300'

s = io.open(PAGE, encoding='utf-8').read()
plain = lambda t: html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', t))).strip()
faq = [{'@type': 'Question', 'name': plain(q), 'acceptedAnswer': {'@type': 'Answer', 'text': plain(a)}}
       for q, a in re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', s, re.S)]

graph = [
    {'@type': 'Organization', '@id': SITE + '#org', 'name': 'Дивоурок', 'url': SITE,
     'logo': SITE + 'icons/apple-touch-icon.png', 'email': 'info@dyvourok.com.ua',
     'sameAs': ['https://www.facebook.com/dyvourok', 'https://www.instagram.com/dyvourok', 'https://www.tiktok.com/@dyvourok']},
    {'@type': 'WebSite', '@id': SITE + '#site', 'name': 'Дивоурок', 'url': SITE, 'inLanguage': 'uk', 'publisher': {'@id': SITE + '#org'}},
    {'@type': 'Product', 'name': 'Машина часу рідної мови — урок до Дня української писемності та мови',
     'description': 'Готовий урок до 27 жовтня для 1–11 класу: інтерактивний квест для дошки, 5 мультфільмів про Кирила й Мефодія, '
                    'Нестора Літописця, Тараса Шевченка, Лесю Українку та Івана Франка, роздатка для друку й сценарій на 45 хвилин.',
     'image': SITE + 'img/site/og.jpg', 'brand': {'@id': SITE + '#org'},
     'audience': {'@type': 'EducationalAudience', 'educationalRole': 'teacher'},
     'offers': {'@type': 'Offer', 'price': PRICE, 'priceCurrency': 'UAH', **({'priceValidUntil': '2026-10-19'} if EARLY else {}), 'availability': 'https://schema.org/InStock',
                'url': SITE + '#cina', 'seller': {'@id': SITE + '#org'}}},
]
if faq:
    graph.append({'@type': 'FAQPage', 'mainEntity': faq})

block = (START + '\n<script type="application/ld+json">\n'
         + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=1).replace('</', '<\\/')
         + '\n</script>\n' + END)
if START in s:
    s = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda m: block, s, flags=re.S)
else:
    s = s.replace('</head>', block + '\n</head>', 1)
io.open(PAGE, 'w', encoding='utf-8').write(s)
print('ok: faq', len(faq))
