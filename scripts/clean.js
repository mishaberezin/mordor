// Removing old offers

const db = require('../lib/db');

const clean = async () => {
    const offers = db.getOffers({status: 'active'})
};

clean();
