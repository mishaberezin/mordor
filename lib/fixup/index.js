const prepare = require('./prepare');
const address = require('./address');
const maplink = require('./maplink');

module.exports = async offers => {
    await prepare(offers);
    await address(offers);

    for (let offer of offers) {
        await maplink(offer);
    }

    return offers.map(o => {
        return Object.assign(o, {
            uniqueKey: `${o.phone}-${o.address.normal}-${o.price}`.replace(/[\s,\\\/]/g, '-')
        });
    });
}
