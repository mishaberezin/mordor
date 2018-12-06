const db = require('../lib/db');

(async function run() {
    const activeOffersCount = await db.countOffers({status: 'active'});

    await db.addReport({
        timestamp: Date.now(),
        activeOffers: activeOffersCount
    });

    setTimeout(run, 60000);
})();
