/* Набір «Машина часу рідної мови» — День української писемності та мови, 1–4 клас.
   Кожна зупинка дає одну букву; разом вони складають слово WORD. */
(window.DYVO_PACKS = window.DYVO_PACKS || []).push({
  id: 'mova',
  title: 'Машина часу рідної мови',
  subtitle: 'День української писемності та мови · 1–4 клас',
  description: 'Заняття відповідає завданням мовно-літературної галузі НУШ, розширює знання учнів про українську писемність і знайомить із темами та постатями, які вони продовжать вивчати у 5–6 класах.',
  date: '27 жовтня',
  word: 'СЛОВО',
  versions: {"media/franko.mp4": "14ebd4f59e", "media/kyrylo.mp4": "a7fd183197", "media/lesya.mp4": "cc9ec12897", "media/nestor.mp4": "1cef886ebf", "media/shevchenko-full.mp4": "8fdb285211", "media/shevchenko.mp4": "5609d9ec27", "docs/robochi-arkushi.pdf": "46f41cfb9c", "img/cover-card.jpg": "c5660e5ef7", "img/franko-head.png": "237ec86192", "img/franko-poster.jpg": "4685dabb20", "img/handout-01.jpg": "0b5141a8e4", "img/handout-02.jpg": "ae479dd082", "img/handout-03.jpg": "f8233dacbe", "img/handout-04.jpg": "db9fbc2a90", "img/handout-05.jpg": "f25b27ae13", "img/handout-06.jpg": "652d45bcf9", "img/handout-07.jpg": "5cbdc03e02", "img/handout-08.jpg": "7769d9a4df", "img/handout-09.jpg": "3b734e73f8", "img/handout-10.jpg": "a25b0774a4", "img/handout-11.jpg": "3e473b5a19", "img/handout-12.jpg": "239a6e0cb9", "img/handout-13.jpg": "934d461fa8", "img/handout-14.jpg": "f6aed514a5", "img/handout-15.jpg": "d525eb2170", "img/handout-16.jpg": "baed947c65", "img/handout-17.jpg": "5d2a9022d3", "img/handout-18.jpg": "5baf123843", "img/kyrylo-head.png": "9230b66978", "img/kyrylo-poster.jpg": "4c96585f35", "img/lesya-head.png": "48df682c9c", "img/lesya-poster.jpg": "986d35fd15", "img/nestor-head.png": "e490fb8de2", "img/nestor-poster.jpg": "e8fb4b7126", "img/shevchenko-head.png": "051f350828", "img/shevchenko-poster.jpg": "dcdbaed8ab"},
  base: 'packs/mova/',
  cover: 'img/cover-card.jpg',

  stops: [
    {
      id: 'kyrylo',
      year: '863',
      who: 'Кирило і Мефодій',
      letter: 'С',
      portrait: 'img/kyrylo-head.png',
      video: 'media/kyrylo.mp4',
      poster: 'img/kyrylo-poster.jpg',
      intro: 'У IX столітті брати Кирило і Мефодій перекладали книги мовою слов\'ян. Кирило створив глаголицю — найдавнішу відому слов\'янську абетку. Кирилиця виникла пізніше в колі їхніх учнів і була названа на честь Кирила.',
      task: {
        type: 'cipher',
        title: 'Прочитай глаголицю',
        prompt: 'Це слово написане першою слов\'янською абеткою. Знайди кожну букву в ключі й склади слово.',
        word: ['Ⰿ', 'Ⱁ', 'Ⰲ', 'Ⰰ'],
        answer: 'МОВА',
        key: [['Ⰰ', 'А'], ['Ⰱ', 'Б'], ['Ⰲ', 'В'], ['Ⰳ', 'Г'], ['Ⰴ', 'Д'], ['Ⰾ', 'Л'], ['Ⰿ', 'М'], ['Ⱀ', 'Н'], ['Ⱁ', 'О'], ['Ⱄ', 'С']]
      }
    },
    {
      id: 'nestor',
      year: '≈1113',
      who: 'Нестор Літописець',
      letter: 'Л',
      portrait: 'img/nestor-head.png',
      video: 'media/nestor.mp4',
      poster: 'img/nestor-poster.jpg',
      intro: 'Чернець Києво-Печерського монастиря Нестор був літописцем. З його іменем традиційно пов\'язують одну з редакцій «Повісті минулих літ», укладену близько 1113 року. День української писемності та мови відзначаємо 27 жовтня — у день пам\'яті Нестора Літописця за новим церковним календарем.',
      task: {
        type: 'order',
        title: 'Склади літопис',
        prompt: 'Вітер розкидав аркуші літопису! Допоможіть Несторові: натискайте події від найдавнішої до найновішої.',
        items: [
          'За літописною легендою, Кий, Щек, Хорив і сестра Либідь засновують Київ',
          'Княгиня Ольга править Руссю',
          'За Ярослава Мудрого при Софійському соборі переписують і перекладають книги',
          'Близько 1113 року Нестор упорядковує літопис'
        ]
      }
    },
    {
      id: 'shevchenko',
      year: '1840',
      who: 'Тарас Шевченко',
      letter: 'О',
      portrait: 'img/shevchenko-head.png',
      video: 'media/shevchenko-full.mp4',
      demoVideo: 'media/shevchenko.mp4',
      poster: 'img/shevchenko-poster.jpg',
      intro: 'Тарас Шевченко народився в родині кріпаків. Змалку любив малювати, а виріс великим поетом і художником. 1840 року вийшла його книжка віршів «Кобзар».',
      task: {
        type: 'words',
        title: 'Збери рядок вірша',
        prompt: 'Вітер розсипав слова з вірша Тараса Шевченка. Натискай слова в правильному порядку.',
        rounds: [
          ['Садок', 'вишневий', 'коло', 'хати,'],
          ['Хрущі', 'над', 'вишнями', 'гудуть']
        ]
      }
    },
    {
      id: 'lesya',
      year: '1884',
      who: 'Леся Українка',
      letter: 'В',
      portrait: 'img/lesya-head.png',
      video: 'media/lesya.mp4',
      poster: 'img/lesya-poster.jpg',
      intro: 'Лариса Косач, яку ми знаємо як Лесю Українку, написала перший вірш у 9 років. У 1884 році в журналі «Зоря» надрукували її вірші «Конвалія» і «Сафо» — тоді вперше з\'явився підпис «Леся Українка». Вона знала багато мов і писала поезію, прозу та драматичні твори.',
      task: {
        type: 'pairs',
        title: 'Добери риму',
        prompt: 'Поети добирають слова, що римуються. Натисни два слова, які звучать схоже.',
        pairs: [['рука', 'ріка'], ['зірка', 'гірка'], ['сонце', 'віконце'], ['мак', 'рак']]
      }
    },
    {
      id: 'franko',
      year: '1899',
      who: 'Іван Франко',
      letter: 'О',
      portrait: 'img/franko-head.png',
      video: 'media/franko.mp4',
      poster: 'img/franko-poster.jpg',
      intro: 'Іван Франко був сином коваля, а сам «кував» слова. Його зібрання творів видали у 50 томах. 1899 року вийшла збірка казок для дітей «Коли ще звірі говорили», до якої увійшов «Фарбований Лис». У казці Лис Микита потрапляє в діжку із синьою фарбою.',
      task: {
        type: 'quiz',
        title: 'Казки Франка',
        prompt: 'Обери правильну відповідь.',
        questions: [
          { q: 'Хто потрапив у діжку із синьою фарбою і назвався «царем звірів»?', options: ['Лис Микита', 'Вовк Неситий', 'Ведмідь'], a: 0 },
          { q: 'Для кого Іван Франко уклав збірку «Коли ще звірі говорили»?', options: ['Для дітей', 'Для царя', 'Для вчителів'], a: 0 },
          { q: 'Ким був батько Івана Франка?', options: ['Рибалкою', 'Пекарем', 'Ковалем'], a: 2 }
        ]
      }
    }
  ],

  cartoons: [
    { title: 'Тарас Шевченко: хлопчик, який малював волю', file: 'media/shevchenko-full.mp4', ready: true },
    { title: 'Тарас Шевченко: «Коли я був малим…» (тизер)', file: 'media/shevchenko.mp4', ready: true, demo: true },
    { title: 'Кирило і Мефодій: таємниця першої абетки', file: 'media/kyrylo.mp4', ready: true },
    { title: 'Нестор Літописець: книга про минулі літа', file: 'media/nestor.mp4', ready: true },
    { title: 'Леся Українка: дівчинка, яка перемогла страх словом', file: 'media/lesya.mp4', ready: true },
    { title: 'Іван Франко: син коваля, що кував слова', file: 'media/franko.mp4', ready: true }
  ],

  handouts: [
    { title: 'Роздатка: паспорт мандрівника, аркуші-завдання, вертепні ляльки, наліпки, закладки, грамота', note: '19 сторінок A4 · PDF', file: 'docs/robochi-arkushi.pdf',
      previews: 18 }   // img/handout-01..18.jpg — зразки з водяним знаком для демо (scripts/make_handout_previews.py)
  ],

  sources: {
    checked: '27 вересня 2026 року',
    intro: 'Факти заняття звірено з офіційними документами, авторськими текстами, музейними колекціями та академічними виданнями. Біля кожного посилання зазначено, що саме воно підтверджує.',
    method: 'Спершу використовуємо закон або першоджерело, потім академічну довідку. Легенди позначаємо словами «за літописом» або «традиційно пов’язують». Деталі, яких немає в документах, не подаємо як встановлений факт.',
    groups: [
      {
        id: 'holiday', short: 'Свято', title: 'День писемності та мови',
        fact: 'Від 2023 року свято відзначають 27 жовтня. Радіодиктант приурочений до свята, але його точну дату щороку оголошують окремо.',
        items: [
          { type: 'official', label: 'Офіційне', title: 'Указ Президента України № 455/2023', detail: 'Змінює дату свята з 9 листопада на 27 жовтня.', url: 'https://zakon.rada.gov.ua/laws/show/455/2023' },
          { type: 'official', label: 'Офіційне', title: 'Календар Верховної Ради України', detail: 'Фіксує День української писемності та мови 27 жовтня.', url: 'https://zakon.rada.gov.ua/rada/main/uk-bg/day79' },
          { type: 'official', label: 'Офіційне', title: 'Українське Радіо: Радіодиктант національної єдності', detail: 'Підтверджує започаткування Радіодиктанту у 2000 році та окреме оголошення дати.', url: 'https://www.ukr.radio/news.html?newsID=105485' },
          { type: 'official', label: 'Офіційне', title: 'МОН: конкурс імені Петра Яцика', detail: 'Пояснює традицію починати конкурс у День української писемності та мови.', url: 'https://mon.gov.ua/osvita-2/zagalna-serednya-osvita/olimpiadi-ta-konkursi/konkursi/uchnivski-konkursi-ta-turniri/mizhnarodniy-konkurs-z-ukrainskoi-movi-imeni-petra-yatsika' },
          { type: 'official', label: 'Офіційне', title: 'Православна церква України: календар на 2026 рік', detail: 'Містить день пам’яті преподобного Нестора Літописця 27 жовтня.', url: 'https://www.pomisna.info/wp-content/uploads/2026/02/kalendar_2026.pdf' }
        ]
      },
      {
        id: 'alphabet', short: 'Абетка', title: 'Кирило, Мефодій і перша абетка',
        fact: 'Кирило створив глаголицю для слов’янських перекладів. Кирилиця сформувалася пізніше в середовищі учнів братів.',
        items: [
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Saint Cyril', detail: 'Місія 863 року, створення глаголиці та переклади богослужбових книг.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CS%5CA%5CSaintCyril.htm' },
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Cyrillic alphabet', detail: 'Походження кирилиці в Болгарії та її зв’язок з учнями Кирила і Мефодія.', url: 'https://www.encyclopediaofukraine.com/display.asp?AddButton=pages%5CC%5CY%5CCyrillicalphabet.htm' },
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Church Slavonic', detail: 'Походження старослов’янської писемної традиції та двох абеток.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CC%5CH%5CChurchSlavonic.htm' },
          { type: 'official', label: 'Стандарт', title: 'Unicode Consortium: Glagolitic', detail: 'Офіційна таблиця символів глаголиці, використаних у завданні.', url: 'https://www.unicode.org/charts/PDF/U2C00.pdf' }
        ]
      },
      {
        id: 'chronicle', short: 'Літопис', title: 'Нестор і «Повість минулих літ»',
        fact: 'Першу редакцію літопису традиційно пов’язують із Нестором. Оповідь про засновників Києва подається як літописна легенда.',
        items: [
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Nestor the Chronicler', detail: 'Біографічні відомості про Нестора та традиційне датування редакції літопису.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CN%5CE%5CNestorthechronicler.htm' },
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Chronicles', detail: 'Пояснює складне авторство, джерела та пізніші редакції літописів.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CC%5CH%5CChronicles.htm' },
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Povist vremennykh lit', detail: 'Описує три редакції «Повісті минулих літ» і датування першої близько 1113 року.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CP%5CO%5CPovisthDAvremennykhlitIT.htm' },
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Kyi', detail: 'Визначає Кия як напівлегендарну постать і переказує літописну легенду.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CK%5CY%5CKyi.htm' },
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Princess Olha', detail: 'Підтверджує регентство княгині Ольги під час малолітства Святослава.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CO%5CL%5COlhaPrincess.htm' },
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Yaroslav the Wise', detail: 'Підтверджує розвиток школи, книгозбірні, перекладання та переписування книг.', url: 'https://www.encyclopediaofukraine.com/pages/Y/A/YaroslavtheWise.htm' },
          { type: 'primary', label: 'Першоджерело', title: '«Повість минулих літ»: запис за 1037 рік', detail: 'Літописний текст про перекладачів, писарів і книги при Софії Київській.', url: 'https://litopys.org.ua/litop/lit08.htm' },
          { type: 'academic', label: 'Дослідження', title: 'Ярослав Ісаєвич: історія українського книговидання', detail: 'Академічний контекст перекладання, переписування й збереження книг у Київській Русі.', url: 'https://litopys.org.ua/isaevych/is02.htm' }
        ]
      },
      {
        id: 'shevchenko', short: 'Шевченко', title: 'Тарас Шевченко',
        fact: 'Шевченко народився у кріпацькій родині, отримав волю 1838 року, а перший «Кобзар» із вісьмома творами вийшов 1840 року.',
        items: [
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Taras Shevchenko', detail: 'Біографія, викуп із кріпацтва, «Кобзар», заслання та заборона писати й малювати.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CS%5CH%5CShevchenkoTaras.htm' },
          { type: 'museum', label: 'Музей', title: 'Національний музей Тараса Шевченка: цифрова колекція', detail: 'Архівні документи, мистецькі роботи та музейні матеріали про життя Шевченка.', url: 'https://collection.museumshevchenko.org.ua/about' },
          { type: 'official', label: 'Офіційне', title: 'Комітет Національної премії імені Тараса Шевченка', detail: 'Пояснює роль портрета Жуковського, написаного Карлом Брюлловим, у викупі поета.', url: 'https://knpu.gov.ua/den-narodzhennia-tarasa-shevchenka-tsikavi-fakty-pro-zhyttia-kobzaria/' },
          { type: 'primary', label: 'Першоджерело', title: 'Тарас Шевченко: «Садок вишневий коло хати…»', detail: 'Авторський текст рядків, використаних у завданні.', url: 'https://litopys.org.ua/shevchenko/shev201.htm' },
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Kobzar', detail: 'Підтверджує дату та склад першого видання «Кобзаря».', url: 'https://www.encyclopediaofukraine.com/display.asp?AddButton=pages%5CK%5CO%5CKobzarIT.htm' }
        ]
      },
      {
        id: 'lesya', short: 'Леся Українка', title: 'Леся Українка',
        fact: 'Лариса Косач написала «Надію» дев’ятирічною. Перші поезії під ім’ям Леся Українка надрукували 1884 року. «Лісова пісня» є драмою-феєрією.',
        items: [
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Lesia Ukrainka', detail: 'Біографія, освіта, мови та основні твори письменниці.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CU%5CK%5CUkrainkaLesia.htm' },
          { type: 'primary', label: 'Першоджерело', title: 'Леся Українка: «Надія»', detail: 'Текст, датування 1880 роком і примітка про заслання тітки Олени Косач.', url: 'https://www.l-ukrainka.name/uk/Verses/NaKrylachPisen/Nadija.html' },
          { type: 'academic', label: 'Дослідження', title: 'Хронологія життя Лесі Українки: 1884 рік', detail: 'Підтверджує перші публікації «Конвалії» та «Сафо» в журналі «Зоря».', url: 'https://www.l-ukrainka.name/uk/Studies/Kryvynjuk/Chronology/1884.html' },
          { type: 'primary', label: 'Першоджерело', title: 'Леся Українка: «Лісова пісня»', detail: 'Авторське жанрове визначення твору: «драма-феєрія».', url: 'https://l-ukrainka.name/uk/Dramas/LisovaPisnja.html' },
          { type: 'primary', label: 'Першоджерело', title: 'Лист Лесі Українки від 16 липня 1911 року', detail: 'Авторська згадка про початок роботи над «Лісовою піснею».', url: 'https://l-ukrainka.name/uk/Corresp/1911/19110716.html' }
        ]
      },
      {
        id: 'franko', short: 'Франко', title: 'Іван Франко',
        fact: 'Батько Франка був ковалем. У «Фарбованому Лисі» Лис Микита стає синім, а викриває його власний голос, не дощ.',
        items: [
          { type: 'academic', label: 'Академічне', title: 'Internet Encyclopedia of Ukraine: Ivan Franko', detail: 'Біографія письменника та відомості про родину сільського коваля.', url: 'https://www.encyclopediaofukraine.com/display.asp?linkpath=pages%5CF%5CR%5CFrankoIvan.htm' },
          { type: 'museum', label: 'Музей', title: 'Дім Франка: Франкова кузня', detail: 'Матеріали про Якова Франка, батька письменника, та родинну кузню.', url: 'https://dimfranka.lviv.ua/wp-content/uploads/2023/10/%D0%92%D0%B8%D0%BF%D1%83%D1%81%D0%BA-4_%D0%A4%D1%80%D0%B0%D0%BD%D0%BA%D0%BE%D0%B2%D0%B0-%D0%BA%D1%83%D0%B7%D0%BD%D1%8F_%D0%A2%D0%B8%D0%B7%D0%B5%D1%80.pdf' },
          { type: 'primary', label: 'Першоджерело', title: '«Коли ще звірі говорили»: відомості про видання', detail: 'Підтверджує перше окреме видання збірки 1899 року.', url: 'https://www.i-franko.name/uk/Prose/KolyScheZviriGovoryly.html' },
          { type: 'primary', label: 'Першоджерело', title: 'Іван Франко: «Фарбований Лис»', detail: 'Повний текст про синю олійну фарбу та справжній фінал казки.', url: 'https://www.i-franko.name/uk/Prose/KolyScheZviriGovoryly/17FarbovanijLis.html' },
          { type: 'academic', label: 'Видання', title: 'Електронна бібліотека творів Івана Франка', detail: 'Відомості про 50-томне зібрання, видане у 1976–1986 роках.', url: 'https://www.i-franko.name/' },
          { type: 'academic', label: 'Дослідження', title: 'Микола Жулинський: про зібрання творів Франка', detail: 'Уточнює історію 50-томного видання та додаткових томів.', url: 'https://www.i-franko.name/uk/Studies/Zhulynsky.html' }
        ]
      }
    ]
  },

  teacher: {
    minutes: [
      ['0–3 хв', 'Ранкове коло: «Яке сьогодні свято?» Запустіть Машину часу на дошці.'],
      ['3–10 хв', '1 зупинка: Кирило і Мефодій. Розшифровуємо глаголицю всім класом.'],
      ['10–16 хв', '2 зупинка: Нестор. Діти виходять до дошки й розставляють події.'],
      ['16–24 хв', '3 зупинка: Шевченко. Мультфільм і рядок вірша. Хвилинка каліграфії: записати рядок у зошит.'],
      ['24–31 хв', '4 зупинка: Леся Українка. Рими. Бонус: придумати свою риму до слова «мова».'],
      ['31–38 хв', '5 зупинка: Франко. Вікторина командами.'],
      ['38–45 хв', 'Фінал: складаємо слово, відкриваємо скриню, вручаємо дипломи.']
    ],
    tips: [
      'Для 1–2 класу читайте завдання вголос і дозвольте відповідати хором.',
      'На дистанційному уроці покажіть екран у Meet чи Zoom — завдання можна виконувати, диктуючи відповіді.',
      'Кожна зупинка працює окремо: можна пройти одну на урок протягом тижня.'
    ],
    answers: [
      'Глаголиця: МОВА.',
      'Літопис: легенда про Кия, Щека, Хорива й Либідь → княгиня Ольга → книжна справа за Ярослава Мудрого → близько 1113 року Нестор упорядковує літопис.',
      'Шевченко: «Садок вишневий коло хати, / Хрущі над вишнями гудуть».',
      'Рими: рука — ріка, зірка — гірка, сонце — віконце, мак — рак.',
      'Франко: Лис Микита; для дітей; ковалем.',
      'Фінальне слово: СЛОВО.'
    ]
  }
});
