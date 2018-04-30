const cian = require('./cian-parser');

module.exports = () => Promise.all([
  cian()
]).then(res => [].concat.apply(...res));
