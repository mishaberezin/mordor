const _ = require('lodash');

const cian = require('./cian');
const avito = require('./avito');
const realty = require('./realty');

const providers = [
    cian
];

module.exports = async () => {
    const offers = await Promise.all(
        providers.map(provider => provider().catch(() => {
            console.error('Провайдер ошибся');
            return [];
        }))
    );

    return _.flatten(offers);
}
