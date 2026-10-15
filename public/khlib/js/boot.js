'use strict';
// Запуск окремим файлом: політика безпеки сайту забороняє вбудовані скрипти.
const g = +new URLSearchParams(location.search).get('g'); if (g >= 1 && g <= 3) { State.grade = g; Store.set('grade', g); }
View.resize(); renderTop();
const startAt = location.hash.slice(1);
Menu.open();
if (startAt === 'lesson') { Panel.close(); Lesson.start(0); }
requestAnimationFrame(frame);
