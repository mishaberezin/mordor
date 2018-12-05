const db = require('../lib/db');

(async function run() {
    const activeOffers = await db.getOffers({status: 'active'});

    await db.addReport({
        timestamp: Date.now(),
        activeOffers: activeOffers.length
    });

    setTimeout(run, 60000);
})();
