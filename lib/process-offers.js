const db = require('./db/index');
const fixup = require('./fixup');
const dedup = require('./dedup');

const process = async () => {
    const rawOffers = await db.getRawOffers();

    let offers = await fixup(rawOffers)
        .then(dedup)

    const addResult = await db.addOffers(offers.add);
    const updateResult = await db.updateOffers(offers.update.map(o => ({
        filter: { _id: o._id },
        patch: o
    })));

    await db.clearRawOffers();

    console.log('Removed raw offers')

    setTimeout(process, 10 * 1000 * 60); // 10 minutes

    return offers;
};

module.exports = process;
