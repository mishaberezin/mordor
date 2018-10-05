const db = require('../lib/db');

const add = (req, res) => {

    console.log('===========================');
    console.log('GOT SOMETHING!');
    console.log('===========================');

    db.addRawOffers(req.body.offers)
        .then(() => {
            res.status(200).send('OK')
        })
        .catch(err => {
            res.status(500).send({ error: err.toString() });
        });
}

module.exports = { add }