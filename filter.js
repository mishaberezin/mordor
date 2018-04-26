const STOP_WORDS = require('./stop-words');

module.exports = data => {
    return new Promise(resolve => {
        let filtered = data.filter(o => {
            var res = !STOP_WORDS.filter(w => {
                return ~o.description.toLocaleLowerCase().indexOf(w);
            }).length;

            return res;
        });

        console.log(`Total – ${data.length }`)
        console.log(`Agents slang free – ${filtered.length}`)

        resolve(filtered);
    });
};


