const prepare = require('./prepare');
const address = require('./address');

module.exports = async offers => {
    await prepare(offers);
    await address(offers);
    // ... (metro, description)

    return offers;
}
