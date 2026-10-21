"""Каталог матеріалів /materialy: з catalog/catalog.json будує
public/materialy/index.html (вітрина з фільтрами) і public/materialy/<slug>.html (сторінка безкоштовного PDF),
а також дописує сторінки в sitemap.xml.
Запускати після кожної зміни каталогу:  python scripts/build_catalog.py"""
import hashlib
import json
import os
import re
from datetime import date
from html import escape

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PUB = os.path.join(ROOT, 'public')
SITE = 'https://dyvourok.com.ua'
DATA = json.load(open(os.path.join(ROOT, 'catalog', 'catalog.json'), encoding='utf-8'))['items']

SUBJECTS = {'math': 'Математика', 'lang': 'Мова і читання', 'world': 'Я досліджую світ',
            'class': 'Для класу', 'craft': 'Творчість'}
GRADES = [('1-4', '1–4 клас'), ('5-7', '5–7 клас'), ('8-11', '8–11 клас')]
KINDS = {'free': 'Безкоштовно', 'account': 'Безкоштовно після входу', 'paid': '', 'idea': 'Ідеї для уроку'}
MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня',
          'жовтня', 'листопада', 'грудня']
e = lambda s: escape(str(s), quote=True)


def plural(n, one, few, many):
    m10, m100 = n % 10, n % 100
    w = one if m10 == 1 and m100 != 11 else few if 2 <= m10 <= 4 and not 12 <= m100 <= 14 else many
    return f'<b>{n}</b> {w}'


def ver(path):
    return hashlib.sha1(open(os.path.join(PUB, path.lstrip('/')), 'rb').read()).hexdigest()[:10]


def human_size(path):
    b = os.path.getsize(os.path.join(PUB, path.lstrip('/')))
    return f'{b / 1048576:.1f} МБ'.replace('.', ',') if b > 1048576 else f'{round(b / 1024)} КБ'


def nice_date(d):
    y, m, dd = map(int, d.split('-'))
    return f'{dd} {MONTHS[m - 1]}'


def head(title, desc, url, image, extra_ld, kind='website'):
    css = f'/css/site.css?v={ver("css/site.css")}'
    css2 = f'/css/catalog.css?v={ver("css/catalog.css")}'
    return f'''<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#C8341F">
<link rel="canonical" href="{SITE}{url}">
<meta property="og:type" content="{kind}">
<meta property="og:site_name" content="Дивоурок">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{SITE}{url}">
<meta property="og:image" content="{SITE}{image}">
<meta property="og:locale" content="uk_UA">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icons/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preload" href="/fonts/Nunito.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="{css}">
<link rel="stylesheet" href="{css2}">
<script type="application/ld+json">{json.dumps(extra_ld, ensure_ascii=False)}</script>
</head>
<body class="cat-page" data-latest-friday="{fridays()[0]["date"] if fridays() else ""}">
<header class="header" id="top">
  <div class="wrap">
    <a class="logo" href="/" aria-label="Дивоурок — на головну"><img src="/brand/dyvourok-logo.svg" alt="Дивоурок" width="180" height="38"></a>
    <nav class="nav" aria-label="Головне меню">
      <a href="/materialy/" aria-current="page">Матеріали</a>
      <a href="/#nabory">Набори</a>
      <a href="/#yak">Як це працює</a>
      <a href="/#pytannia">Питання</a>
    </nav>
    <div class="actions">
      <a class="btn small ghost" href="/app/">Увійти</a>
      <a class="btn small" href="/app/#/demo">Спробувати</a>
    </div>
    <button class="burger" type="button" aria-label="Відкрити меню" aria-expanded="false"><span></span></button>
  </div>
</header>
'''


def foot():
    return f'''
<footer class="footer">
  <div class="wrap">
    <div class="grid">
      <div>
        <img class="logo" src="/brand/dyvourok-logo-white.svg" alt="Дивоурок" width="190" height="40">
        <p class="small">Інтерактивні уроки-свята й матеріали для школи. Зроблено в Україні.</p>
      </div>
      <div>
        <h4>Сайт</h4>
        <ul>
          <li><a href="/materialy/">Каталог матеріалів</a></li>
          <li><a href="/#nabory">Набори</a></li>
          <li><a href="/den-pysemnosti-2026">Ідеї до 27 жовтня і Радіодиктант 2026</a></li>
          <li><a href="/app/">Увійти в застосунок</a></li>
        </ul>
      </div>
      <div>
        <h4>Контакти</h4>
        <ul>
          <li><a href="mailto:info@dyvourok.com.ua">info@dyvourok.com.ua</a></li>
          <li><a href="https://www.facebook.com/dyvourok/" target="_blank" rel="noopener">Facebook</a></li>
          <li><a href="https://www.instagram.com/dyvourok/" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="https://www.tiktok.com/@dyvourok" target="_blank" rel="noopener">TikTok</a></li>
          <li><a href="/pryvatnist">Політика конфіденційності</a></li>
        </ul>
      </div>
    </div>
    <div class="bottom"><span>© <span id="year">2026</span> Дивоурок</span><span>Зроблено з любов'ю до дітей</span></div>
  </div>
</footer>
<script src="/js/site.js?v={ver("js/site.js")}"></script>
<script src="/js/catalog.js?v={ver("js/catalog.js")}"></script>
</body>
</html>
'''


ICON = {
    'arrow': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    'down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    'print': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
    'link': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    'tg': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.4 4.1 2.9 11.2c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.3-.5-1.9-1.4-1.5ZM9.6 14.2l8.6-7.6-6.7 8.6-.3 3.3-1.6-4.3Z"/></svg>',
    'viber': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8c5.5 0 8.6 2.2 8.6 7.7 0 5.6-3.1 7.6-8.6 7.6l-3.6 3V18c-3.2-.9-5-3-5-7.5 0-5.5 3.1-7.7 8.6-7.7Z"/><path d="M9.2 7.8c.4 2.8 2.2 4.7 5 5.2M12.4 7.4c1.6.2 2.6 1.2 2.8 2.8"/></svg>',
    'fb': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z"/></svg>',
}


def badge(it):
    if it['kind'] == 'paid':
        return f'<span class="badge paid">{it["price"]} ₴</span>'
    return f'<span class="badge {it["kind"]}">{KINDS[it["kind"]]}</span>'


def href(it):
    return f'/materialy/{it["slug"]}' if it['kind'] == 'free' else it['url']


def card(it, newest=False, level=3):
    tape = ' tape-' + str(sum(map(ord, it['slug'])) % 3)
    pos = f' style="object-position:{it["cover_pos"]}"' if it.get('cover_pos') else ''
    fri = f'<span class="fri-flag">Безкоштовна п’ятниця #{it["friday"]}</span>' if it.get('friday') else ''
    new = '<span class="new-flag">Нове</span>' if newest else ''
    cta = it.get('cta') or 'Завантажити'
    return f'''<article class="m-card{tape}" data-kind="{it["kind"]}" data-grades="{" ".join(it["grades"])}" data-subject="{it["subject"]}">
  <div class="pic"><img src="{e(it["cover"])}" alt="" width="1320" height="570" loading="lazy"{pos}>{new}</div>
  <div class="body">
    <div class="row">{badge(it)}{fri}</div>
    <h{level}><a class="stretch" href="{e(href(it))}">{e(it["title"])}</a></h{level}>
    <p>{e(it["short"])}</p>
    <div class="meta"><span>{e(it["grade_label"])}</span><span>{e(SUBJECTS[it["subject"]])}</span><span>{e(it["format"])}</span></div>
    <span class="go" aria-hidden="true">{e(cta)} {ICON["arrow"]}</span>
  </div>
</article>'''


def fridays():
    return sorted((i for i in DATA if i.get('friday')), key=lambda i: i['friday'], reverse=True)


def build_index():
    items = sorted(DATA, key=lambda i: i['date'], reverse=True)
    latest = fridays()[0] if fridays() else None
    subj = [s for s in SUBJECTS if any(i['subject'] == s for i in items)]
    chips_kind = ''.join(f'<button type="button" class="chip" data-f="kind" data-v="{k}" aria-pressed="{"true" if k == "all" else "false"}">{t}</button>'
                         for k, t in [('all', 'Усе'), ('free', 'Безкоштовне'), ('paid', 'Набори'), ('idea', 'Ідеї')])
    chips_grade = ''.join(f'<button type="button" class="chip" data-f="grade" data-v="{k}" aria-pressed="{"true" if k == "all" else "false"}">{t}</button>'
                          for k, t in [('all', 'Усі класи')] + GRADES)
    chips_subj = ''.join(f'<button type="button" class="chip" data-f="subject" data-v="{k}" aria-pressed="{"true" if k == "all" else "false"}">{t}</button>'
                         for k, t in [('all', 'Усі теми')] + [(s, SUBJECTS[s]) for s in subj])
    spot = ''
    if latest:
        spot = f'''
  <section class="friday" aria-labelledby="fri-h">
    <div class="wrap">
      <div class="fri-box">
        <div class="fri-text">
          <span class="kicker">Безкоштовна п’ятниця</span>
          <h2 id="fri-h" class="h2">Щоп’ятниці — новий матеріал у подарунок</h2>
          <p class="lead">Робочі аркуші, плакати й вирізалки в стилі Дивоуроку. Без реєстрації: відкрили, надрукували, провели.</p>
          <a class="fri-latest" href="/materialy/{latest["slug"]}">
            <img src="{e(latest["cover"])}" alt="" width="1320" height="570">
            <span><small>Цього тижня · #{latest["friday"]}</small><b>{e(latest["title"])}</b><em>{e(latest["grade_label"])} · {e(SUBJECTS[latest["subject"]])}</em></span>
            <i class="fri-go">{ICON["down"]}</i>
          </a>
        </div>
        <div class="tearoff" aria-live="polite">
          <div class="ring" aria-hidden="true"></div>
          <div class="sheet">
            <span class="t-top">Наступний подарунок</span>
            <b class="t-day" data-next-day>—</b>
            <span class="t-month" data-next-month>п’ятниця</span>
            <span class="t-left" data-next-left></span>
          </div>
          <a class="btn gold small" href="https://www.facebook.com/dyvourok/" target="_blank" rel="noopener">{ICON["fb"]} Стежити у Facebook</a>
        </div>
      </div>
    </div>
  </section>'''
    cards = '\n'.join(card(it, newest=(latest is not None and it is latest)) for it in items)
    ld = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Каталог матеріалів Дивоурок',
          'url': f'{SITE}/materialy/', 'inLanguage': 'uk',
          'mainEntity': {'@type': 'ItemList', 'itemListElement': [
              {'@type': 'ListItem', 'position': n + 1, 'url': SITE + href(it), 'name': it['title']} for n, it in enumerate(items)]}}
    page = head('Матеріали для вчителя: безкоштовні робочі аркуші й готові уроки | Дивоурок',
                'Каталог Дивоуроку: безкоштовні робочі аркуші для друку щоп’ятниці, готові уроки-свята для дошки й ідеї для заходів. 1–11 клас, НУШ.',
                '/materialy/', latest['og'] if latest else '/img/site/og.jpg', ld) + f'''
<main>
  <section class="cat-hero">
    <div class="village" aria-hidden="true"><img src="/img/materialy/hero-village.webp" alt="" width="1584" height="672" fetchpriority="high"></div>
    <div class="wrap">
      <div class="paper-label">
        <span class="kicker">Каталог матеріалів</span>
        <h1>Матеріали, які хочеться <span class="accent">друкувати</span></h1>
        <p class="lead">Безкоштовні аркуші щоп’ятниці, готові уроки-свята для дошки та ідеї для заходів — у теплому паперовому стилі, з перевіреними фактами.</p>
        <div class="hero-stats"><span>{plural(sum(1 for i in DATA if i["kind"] in ("free", "account")), "безкоштовний матеріал", "безкоштовні матеріали", "безкоштовних матеріалів")}</span><span>{plural(sum(1 for i in DATA if i["kind"] == "paid"), "готовий урок-свято", "готові уроки-свята", "готових уроків-свят")}</span><span><b>1–11</b> клас</span></div>
      </div>
    </div>
  </section>
{spot}
  <section class="section cat" id="katalog" style="padding-top:clamp(40px,6vw,72px)">
    <div class="wrap">
      <div class="cat-head">
        <h2 class="h2">Усі матеріали</h2>
        <p class="count" data-count aria-live="polite">{re.sub("</?b>", "", plural(len(items), "матеріал", "матеріали", "матеріалів"))}</p>
      </div>
      <div class="filters" role="group" aria-label="Фільтри">
        <div class="chips" aria-label="Тип">{chips_kind}</div>
        <div class="chips" aria-label="Клас">{chips_grade}</div>
        <div class="chips" aria-label="Тема">{chips_subj}</div>
      </div>
      <div class="grid-cards" data-grid>
{cards}
      </div>
      <div class="empty" data-empty hidden>
        <img src="/img/site/star-gold.webp" alt="" width="64" height="64">
        <p><b>Тут поки порожньо.</b> Але щоп’ятниці з’являється щось нове — <button type="button" class="linkish" data-reset>показати все</button>.</p>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="wish">
        <img src="/img/site/flower-tulip.webp" alt="" width="72" height="72">
        <div><h2>Чого вам бракує на уроках?</h2><p>Напишіть тему, клас і формат — найпопулярніші побажання стануть наступними безкоштовними п’ятницями.</p></div>
        <a class="btn" href="https://m.me/dyvourok" target="_blank" rel="noopener">Написати в Messenger</a>
      </div>
    </div>
  </section>
</main>
''' + foot()
    os.makedirs(os.path.join(PUB, 'materialy'), exist_ok=True)
    open(os.path.join(PUB, 'materialy', 'index.html'), 'w', encoding='utf-8').write(page)


def build_free(it):
    url = f'/materialy/{it["slug"]}'
    size = human_size(it['file'])
    shots = it['previews']
    cur = ' aria-current="true"'
    thumbs = ''.join(f'<button type="button" class="thumb" data-i="{n}" aria-label="Сторінка {n + 1}"{cur if n == 0 else ""}><img src="{e(s["src"])}" alt="" width="794" height="1123" loading="lazy"></button>'
                     for n, s in enumerate(shots))
    inside = ''.join(f'<li>{e(x)}</li>' for x in it['inside'])
    ideas = ''.join(f'<div class="idea"><span class="n">{n + 1}</span><h3>{e(x["t"])}</h3><p>{e(x["d"])}</p></div>' for n, x in enumerate(it['ideas']))
    others = [o for o in sorted(DATA, key=lambda i: i['date'], reverse=True) if o is not it][:3]
    more = '\n'.join(card(o) for o in others)
    share_text = f'{it["title"]} — безкоштовно від Дивоурок'
    fri = f'<span class="kicker">Безкоштовна п’ятниця #{it["friday"]} · {nice_date(it["date"])}</span>' if it.get('friday') else '<span class="kicker">Безкоштовний матеріал</span>'
    ld = {'@context': 'https://schema.org', '@type': 'LearningResource', 'name': it['title'],
          'description': it['seo_description'], 'url': SITE + url, 'image': SITE + it['og'], 'inLanguage': 'uk',
          'learningResourceType': 'Worksheet', 'educationalLevel': it['grade_label'],
          'about': SUBJECTS[it['subject']], 'isAccessibleForFree': True, 'datePublished': it['date'],
          'audience': {'@type': 'EducationalAudience', 'educationalRole': 'teacher'},
          'publisher': {'@type': 'Organization', 'name': 'Дивоурок', 'url': SITE + '/'},
          'encoding': {'@type': 'MediaObject', 'encodingFormat': 'application/pdf', 'contentUrl': SITE + it['file']}}
    page = head(it['seo_title'] + ' | Дивоурок', it['seo_description'], url, it['og'], ld, 'article') + f'''
<main class="wrap item">
  <nav class="crumbs" aria-label="Навігація"><a href="/materialy/">Матеріали</a><span aria-hidden="true">›</span><a href="/materialy/?tema={it["subject"]}#katalog">{e(SUBJECTS[it["subject"]])}</a></nav>
  <div class="item-top">
    <div class="gallery">
      <button type="button" class="main-shot" data-zoom aria-label="Збільшити сторінку">
        <img src="{e(shots[0]["src"])}" alt="{e(shots[0]["alt"])}" width="794" height="1123" data-main>
        <span class="zoom-hint">Натисніть, щоб збільшити</span>
      </button>
      <div class="thumbs" data-shots='{e(json.dumps(shots, ensure_ascii=False))}'>{thumbs}</div>
    </div>
    <div class="info">
      {fri}
      <h1>{e(it["title"])}</h1>
      <div class="tags"><span>{e(it["grade_label"])}</span><span>{e(SUBJECTS[it["subject"]])}</span><span>{e(it["format"])}</span></div>
      <p class="lead">{e(it["about"])}</p>
      <div class="dl-box">
        <a class="btn big-dl" href="/api/dl/{it["slug"]}" data-dl="{it["slug"]}">{ICON["down"]} Завантажити PDF <small>{size}</small></a>
        <p class="dl-note">{ICON["print"]} Без реєстрації. Друкуйте для свого класу й діліться з колегами.</p>
      </div>
      <div class="share" data-share data-url="{SITE}{url}" data-text="{e(share_text)}">
        <span>Поділитися з колегами:</span>
        <a class="sh tg" href="https://t.me/share/url?url={SITE}{url}" target="_blank" rel="noopener" aria-label="Надіслати в Telegram">{ICON["tg"]}</a>
        <a class="sh vb" href="viber://forward?text={SITE}{url}" aria-label="Надіслати у Viber">{ICON["viber"]}</a>
        <a class="sh fb" href="https://www.facebook.com/sharer/sharer.php?u={SITE}{url}" target="_blank" rel="noopener" aria-label="Поділитися у Facebook">{ICON["fb"]}</a>
        <button type="button" class="sh cp" data-copy aria-label="Скопіювати посилання">{ICON["link"]}</button>
      </div>
    </div>
  </div>

  <div class="stitch gold item-stitch" aria-hidden="true"></div>

  <section class="item-sec two">
    <div class="paper-card">
      <h2>Що всередині</h2>
      <ul class="checks">{inside}</ul>
    </div>
    <div>
      <h2>Як використати на уроці</h2>
      <div class="ideas">{ideas}</div>
    </div>
  </section>

  <section class="item-sec">
    <div class="next-fri">
      <div class="tearoff mini" aria-hidden="true"><div class="ring"></div><div class="sheet"><b class="t-day" data-next-day>—</b><span class="t-month" data-next-month>п’ятниця</span></div></div>
      <div><h2>Наступна безкоштовна п’ятниця — <span data-next-left>уже скоро</span></h2><p>Підпишіться на сторінку Дивоуроку, щоб не пропустити новий матеріал.</p></div>
      <a class="btn gold" href="https://www.facebook.com/dyvourok/" target="_blank" rel="noopener">{ICON["fb"]} Стежити у Facebook</a>
    </div>
  </section>

  <section class="item-sec">
    <div class="cat-head"><h2 class="h2">Вам також сподобається</h2><a class="all-link" href="/materialy/">Увесь каталог {ICON["arrow"]}</a></div>
    <div class="grid-cards">
{more}
    </div>
  </section>
</main>

<dialog class="zoom" data-dialog aria-label="Перегляд сторінки">
  <img src="" alt="" data-zoom-img>
  <button type="button" class="z-prev" data-prev aria-label="Попередня сторінка">‹</button>
  <button type="button" class="z-next" data-next aria-label="Наступна сторінка">›</button>
  <button type="button" class="z-close" data-close aria-label="Закрити">✕</button>
</dialog>
''' + foot()
    open(os.path.join(PUB, 'materialy', f'{it["slug"]}.html'), 'w', encoding='utf-8').write(page)


def update_home():
    """Головна: три найновіші безкоштовні матеріали між <!-- catalog:latest --> і <!-- /catalog:latest -->."""
    p = os.path.join(PUB, 'index.html')
    s = open(p, encoding='utf-8').read()
    free = [i for i in sorted(DATA, key=lambda i: i['date'], reverse=True) if i['kind'] in ('free', 'account')][:3]
    latest = fridays()[0] if fridays() else None
    block = ('<!-- catalog:latest -->\n      <div class="grid-cards">\n'
             + '\n'.join(card(it, newest=it is latest) for it in free)
             + '\n      </div>\n<!-- /catalog:latest -->')
    s = re.sub(r'<!-- catalog:latest -->.*?<!-- /catalog:latest -->', lambda m: block, s, flags=re.S)
    s = re.sub(r'css/catalog\.css(\?v=\w+)?"', f'css/catalog.css?v={ver("css/catalog.css")}"', s)
    open(p, 'w', encoding='utf-8').write(s)


def update_sitemap():
    p = os.path.join(PUB, 'sitemap.xml')
    s = open(p, encoding='utf-8').read()
    s = re.sub(r'  <url><loc>https://dyvourok\.com\.ua/materialy/[^\n]*\n', '', s)
    today = date.today().isoformat()
    rows = [f'  <url><loc>{SITE}/materialy/</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>\n']
    rows += [f'  <url><loc>{SITE}/materialy/{i["slug"]}</loc><lastmod>{i["date"]}</lastmod><priority>0.7</priority></url>\n'
             for i in DATA if i['kind'] == 'free']
    s = s.replace('</urlset>', ''.join(rows) + '</urlset>')
    open(p, 'w', encoding='utf-8').write(s)


if __name__ == '__main__':
    build_index()
    for it in DATA:
        if it['kind'] == 'free':
            build_free(it)
    update_sitemap()
    update_home()
    print('catalog:', len(DATA), 'items,', sum(i['kind'] == 'free' for i in DATA), 'free pages')
