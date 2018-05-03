const invalid = require('./invalid');
const stopwords = require('./stopwords');

module.exports = offers => offers.filter(offer => {
    return offer;
    return invalid(offer) || stopwords(offer) ; // || ...
});
