const db = require('./db/index');
const fixup = require('./fixup');
const dedup = require('./dedup');

const process = async () => {
    const rawOffers = await db.getRawOffers();

    let offers = await fixup(rawOffers)
        .then(dedup)

    console.log('+++++++')
    console.log(offers)
    console.log('========')

    return [];
};

module.exports = process;
