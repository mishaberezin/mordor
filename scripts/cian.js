require('../miners/cian.js')().catch(err => {
    console.error(err);
    process.exit(1);
});