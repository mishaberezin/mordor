require('../miners/realty.js')().catch(err => {
    console.error(err);
    process.exit(1);
});