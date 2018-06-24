const _ = require('lodash');

const cian = require('./cian-w-auth');
const avito = require('./avito');
const realty = require('./realty');

const providers = [
    cian,
    avito
];

module.exports = async () => {
    const offers = await Promise.all(
        providers.map(provider => provider().catch(e => {
            console.error(e);
            return [];
        }))
    );

    return _.flatten(offers);
}
