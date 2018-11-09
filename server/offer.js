const db = require('../lib/db');

const add = (req, res) => {


    db.addRawOffers(req.body.offers)
        .then(() => {
            res.status(200).send('OK')
        })
        .catch(err => {
            console.log(err);
            res.status(500).send();
        });
}

module.exports = { add }
