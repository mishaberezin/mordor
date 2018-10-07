const db = require('./db/index');
const fixup = require('./fixup');
const dedup = require('./dedup');

const processOffers = async () => {
    const rawOffers = await db.getRawOffers();

    let offers = await fixup(rawOffers)
        .then(dedup)

    const addResult = await db.addOffers(offers.add);
    const addPostResult = await db.addPostOffers(offers.add);
    const updateResult = await db.updateOffers(offers.update.map(o => ({
        filter: { _id: o._id },
        patch: o
    })));

    await db.clearRawOffers();

    console.log(`${new Date()} Removed raw offers`)

    setTimeout(processOffers, 5 * 1000 * 60); // 10 minutes

    return offers;
};

processOffers();

// module.exports = processOffers;
