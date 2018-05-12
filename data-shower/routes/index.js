var express = require('express');
var router = express.Router();
const fs = require('fs');

const base = require('../../lib/base');

// let data = JSON.parse(fs.readFileSync('../data/data.json'));
// // let data = JSON.parse(fs.readFileSync('../data/data-filtered.json'));
// data.sort((a,b) => a.address.localeCompare(b.address));

// data = Object.values(data.reduce((res, apt) => {
    // let key = apt.address.replace(/\s/g, '-');

    // res[key] = [...(res[key] || []), apt];

    // return res;
// }, {}));

/* GET home page. */
router.get('/', async function(req, res, next) {
    let data = await base.getOffers({});
    res.render('index', { data });
});

module.exports = router;
