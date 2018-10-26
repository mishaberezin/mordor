const geodata = require('./geodata');
const clone = arr => arr.map(o => ({...o}));

module.exports = async origOffers => {
    const offers = clone(origOffers);
    
    await geodata(offers);

    return offers;
}