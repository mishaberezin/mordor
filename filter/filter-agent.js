// const STOP_WORDS = require('./stop-words');

// const filterStopWords = offer => {
//     return !STOP_WORDS.filter(w => {
//         return ~offer.description.toLocaleLowerCase().indexOf(w);
//     }).length;
// };

const filterAgent = offer => !offer.isAgent;

module.exports = data => {
    return new Promise(resolve => {
        // let filtered = data.filter(filterStopWords);

        // console.log(`Total – ${data.length }`)
        // console.log(`Agents slang free – ${filtered.length}`)

        let filtered = data.filter(filterAgent);

        resolve(filtered);
    });
};


