const cianParser = require('./cian-parser');
const write = require('./write');
const normalize = require('./normalize');
const merge = require('./merge');
const filter = require('./filter');

const data = require('./data/data.json');
const offer = data[7];
const createVkPost = require('./create-vk-post');
createVkPost(offer);
return;

cianParser()
  .then(normalize)
  .then(merge)
  .then(filter)
  .then(write); // Not a Promise
