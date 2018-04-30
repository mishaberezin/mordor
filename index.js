const cianParser = require('./cian-parser');
const write = require('./write');
const setAddresses = require('./set-addresses');
const mergeOffers = require('./merge-offers');
const filter = require('./filter');

const data = require('./data/data.json');
const offer = data[7];
const createVkPost = require('./create-vk-post');
createVkPost(offer);
return;

cianParser()
    .then(setAddresses)
    .then(mergeOffers)
    .then(filter)
    .then(write); // Not a Promise
