// Выгружает, фильтрует и кладет в базу свежие офферы.

const _ = require('lodash');

const providers = require('../lib/providers');
const normalize = require('../lib/normalize');
const deduplicate = require('../lib/deduplicate');
const filter = require('../lib/filter');
const base = require('../lib/base');

Promise.all(
        providers.map(provider => provider().then(normalize))
    )
    .then(_.flatten)
    .then(deduplicate)
    .then(filter)
    .then(base.addOffers)
    .then(res => {
        console.log('Добавлено ' + res.length);
        process.exit();
    })
    .catch(err => {
        console.error(err)
        process.exit();
    })
