const _ = require('lodash');

const cian = require('./cian-w-auth');
// const avito = require('./avito');
// const realty = require('./realty');

const providers = [
    cian,
    // avito,
    // realty
];

module.exports = (callback) => {
    providers.map(provider => provider(callback));
}
