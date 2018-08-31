const express = require('express');
const bodyParser = require('body-parser')
const Raven = require('raven');

const db = require('../lib/db')

const run = () => {
    const app = express();

    Raven.config('https://a0c7bf7efcc64a918907855a88f501b1@sentry.io/1256061').install();

    app.use(Raven.requestHandler());

    app.use(bodyParser.json());

    app.post('/offers/add', function(req, res) {
        // Оборачивем в Raven.context, чтобы отловить любые непойманные ошибки внутри.
        Raven.context(function () {
            console.count('офферы');
            res.status(200).send('OK');


            // db.addRawOffers(req.body.offers)
            //     .then(() => res.status(200).send('OK'))
            //     .catch(error => {
            //         // Ошибки записи в базу ловим сами, добавляем контекст запроса.
            //         // Ошибки валидации обрабатываются тоже здесь.
            //         Raven.captureException(error, { req: req });
            //         // В ответе шлем текcт ошибки.
            //         res.status(500).send({ error: error.toString() });
            //     });
        });
    });

    app.get('/', function(req, res) {
        res.send('DDML');
    });

    app.use(Raven.errorHandler());

    app.listen(3000, function () {
        console.log('Ready');
    });
}

module.exports = run;