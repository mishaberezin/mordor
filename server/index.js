const config = require('config');
const express = require('express');
const bodyParser = require('body-parser')
const Sentry = require('@sentry/node');

const run = () => {
    Sentry.init({ dsn: config.get('sentry.dsn') });

    const offer = require('./offer');

    const PORT = 3000;

    const app = express();

    // Sentry requestHandler must be the 1st middleware
    app.use(Sentry.Handlers.requestHandler());

    app.use(bodyParser.json({ limit: '50mb', extended: true }));

    // Sentry errorHandler must be before any other error middleware
    app.use(Sentry.Handlers.errorHandler());

    app.post('/offer', offer.add);

    app.use((req, res, next) => {
        res.status(404).send("Fin!")
    });

    app.listen(3000);
    console.log('Express started on port 3000');
}

module.exports = run;