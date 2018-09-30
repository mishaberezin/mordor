const db = require('../lib/db');

const add = (req, res) => {

    console.log('Пришла порция');
    
    db.addRawOffers(req.body.offers)
        .then(() => {
            res.status(200).send('OK')
        })
        .catch(err => {
            console.log('===========================');
            console.log('500!!!!!!!!!!!!!');
            console.log('===========================');
            res.status(500).send({ error: err.toString() });
        });
}

module.exports = { add }