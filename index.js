const cianParser = require('./cian-parser');
const write = require('./write');
const setAddresses = require('./set-addresses');
const mergeOffers = require('./merge-offers');
const filter = require('./filter');

cianParser()
    .then(setAddresses)
    .then(mergeOffers)
    // .then(filter)
    .then(write); // Not a Promise
