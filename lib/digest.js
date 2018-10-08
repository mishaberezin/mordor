const db = require('./db');
const fixup = require('./fixup');
const dedup = require('./dedup');

const TIMEOUT = 3 * 1000 * 60;

const run = async () => {
    const rawOffers = await db.getRawOffers();

    const offers = await fixup(rawOffers).then(dedup);

    await db.addOffers(offers.add);
    await db.addPostOffers(offers.add);
    await db.updateOffers(offers.update.map(o => ({
        filter: { _id: o._id },
        patch: o
    })));
    await db.clearRawOffers({
        _id: { $in: rawOffers.map(offer => offer._id) } 
    });

    console.log(`${new Date()} Removed ${rawOffers.length} raw offers`)

    setTimeout(run, TIMEOUT);
};

module.exports = run;