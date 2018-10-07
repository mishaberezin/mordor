const db = require('./db');
const fixup = require('./fixup');
const dedup = require('./dedup');

const processOffers = async () => {
    const rawOffers = await db.getRawOffers();
    let offers = await fixup(rawOffers)
        .then(dedup)

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

    setTimeout(processOffers, 3 * 1000 * 60);
};

try {
    processOffers();
} catch(err) {
    console.error(err);
    process.exit(1);
}

// module.exports = processOffers;
