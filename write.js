const fs = require('fs');

module.exports = data => {
    return fs.writeFileSync('./data/data.json', JSON.stringify(data, null, 4));
}
