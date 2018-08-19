const prepare = require('./prepare');
const address = require('./address');
const maplink = require('./maplink');
const chunk = require('lodash/chunk');

module.exports = async rawOffers => {
    let offers = [];
    let chunks = chunk(rawOffers.slice(0, 1), 200);

    for await (const c of chunks) {
        const processed = await address(c);

        offers = [
            ...offers,
            ...processed
                .map(maplink)
        ]
    }

    // const o = {
        // price: 10,
        // diff: [
            // {
                // ts: 212312,
                // price: prevVal
            // }
        // ]
    // };

    return offers.map(o => {
        return Object.assign(o, {
            uniqueKey: `${o.sourceId}-${o.offerId}`
        });
    });
}
