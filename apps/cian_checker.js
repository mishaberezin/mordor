require('../miners/cian_checker.js')().catch(err => {
    console.error(err);
    process.exit(1);
});
