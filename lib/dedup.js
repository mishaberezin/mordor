// Объединить дубли.
const uniqBy = require('lodash/uniqBy');
const db = require('../lib/db');

const removeByUniqueKey = offers => {
    return uniqBy(offers, 'uniqueKey');
};

module.exports = async offers => {
    let filtered = removeByUniqueKey(offers);

    console.log(filtered.map(({ uniqueKey }) => ({uniqueKey})))

    const addedOffers = await db.getOffers({
        '$or': filtered.map(({ uniqueKey }) => ({uniqueKey}))
    });

    const addedOffersKeys = addedOffers.map(({ uniqueKey }) => uniqueKey);

    return filtered.filter(o => !~addedOffersKeys.indexOf(o.uniqueKey));
};
