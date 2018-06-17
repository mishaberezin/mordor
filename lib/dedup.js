// Объединить дубли.

const db = require('../lib/db');

module.exports = async offers => {
    const addedOffers = await db.getOffers({
        '$or': offers.map(({ uniqueKey }) => ({uniqueKey}))
    });

    const addedOffersKeys = addedOffers.map(({ uniqueKey }) => uniqueKey);

    return offers.filter(o => !~addedOffersKeys.indexOf(o.uniqueKey));
};
