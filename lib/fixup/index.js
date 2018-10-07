const prepare = require('./prepare');
const address = require('./address');
const maplink = require('./maplink');
const chunk = require('lodash/chunk');

module.exports = async rawOffers => {
    let offers = [];
    let chunks = chunk(rawOffers, 200);

    for await (const c of chunks) {
        const processed = await address(c);

        offers = [
            ...offers,
            ...processed
                .map(maplink)
        ]
    }

    return offers.map(o => {
        return Object.assign(o, {
            uniqueKey: `${o.source}-${o.offerId}`
        });
    });
}
