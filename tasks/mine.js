const mine = require('../lib/mine');
const fixup = require('../lib/fixup');
const dedup = require('../lib/dedup');
const filter = require('../lib/filter');
const db = require('../lib/db');

mine()
    .then(fixup) // Нормализация и добавление производных данных
    .then(dedup) // Удаляем дубли
    .then(filter) // Оставляем подходящие по цене и другим параметрам
    .then(offers => db.addOffers(offers))
    .then(res => {
        console.error('Объявления добавлены');
    });
    .catch(() => {
        console.error('Что-то пошло не так');
    });
