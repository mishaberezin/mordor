const prepare = require('./prepare');
const address = require('./address');
const maplink = require('./maplink');

module.exports = async offers => {
    await prepare(offers);
    await address(offers);

    for (let offer of offers) {
        await maplink(offer);
    }

    return offers;
}
