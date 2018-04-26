var express = require('express');
var router = express.Router();
const fs = require('fs');

let data = JSON.parse(fs.readFileSync('../data/data.json'));
// let data = JSON.parse(fs.readFileSync('../data/data-filtered.json'));
data.sort((a,b) => a.address.localeCompare(b.address));

data = Object.values(data.reduce((res, apt) => {
    let key = apt.address.replace(/\s/g, '-');

    res[key] = [...(res[key] || []), apt];

    return res;
}, {}));

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { groupedByAddress: data });
});

module.exports = router;
