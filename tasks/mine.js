const mine = require('../lib/mine');
const fixup = require('../lib/fixup');
const dedup = require('../lib/dedup');
const filters = require('../lib/filters');
const db = require('../lib/db');

mine()
    // .then(fixup) // Нормализация и добавление производных данных
    // .then(dedup) // Удаляем дубли
    // .then(filters) // Оставляем подходящие по цене и другим параметрам
    // .then(offers => db.addOffers(offers))
    // .then(res => {
        // console.log('Объявления добавлены', res.length);
        // console.log(res.map(o => o.uniqueKey));
        // process.exit();
    // })
    // .catch(e => {
        // console.error('Что-то пошло не так');
        // console.error(e)
        // process.exit();
    // });
