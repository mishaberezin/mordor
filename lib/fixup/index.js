const prepare = require('./prepare');
const address = require('./address');
const maplink = require('./maplink');
const chunk = require('lodash/chunk');

module.exports = async rawOffers => {
    const offers = [];
    const chunks = chunk(rawOffers, 200);

    for await (const c of chunks) {
        const processed = await address(c);
        offers.push(...processed.map(maplink));
    }

    offers.forEach(offer => {
        offer.uniqueKey = `${offer.sourceId}-${offer.offerId}`;
    });

    return offers;
}