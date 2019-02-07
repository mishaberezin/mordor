const config = require("config");
const express = require("express");
const bodyParser = require("body-parser");
const db = require("../lib/db");
// const Sentry = require("@sentry/node");

// Sentry.init({ dsn: config.get("sentry.dsn") });

const app = express();

// Sentry requestHandler must be the 1st middleware
// app.use(Sentry.Handlers.requestHandler());

app.use(bodyParser.json({ limit: "50mb", extended: true }));

// Sentry errorHandler must be before any other error middleware
// app.use(Sentry.Handlers.errorHandler());

app.post("/offers", (req, res) => {
  db.addRawOffers(req.body.offers)
    .then(() => {
      res.status(200).send("OK");
    })
    .catch(error => {
      console.log(error);
      res.status(500).send();
    });
});

app.get("/offers/missing/:sid", (req, res) => {
  db.getMissingOffers(req.params.sid)
    .then(offers => {
      res.status(200).send(offers);
    })
    .catch(error => {
      console.log(error);
      res.status(500).send();
    });
});

app.use((req, res, next) => {
  res.status(404).send("Fin!");
});

module.exports = () => {
  const port = config.get("api.port");

  app.listen(port);
  console.log(`API started on port ${port}`);
};
