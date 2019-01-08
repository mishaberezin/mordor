require("dotenv").config(); // .env 🛫

module.exports = {
  db: {
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    host: "localhost",
    name: "apt-finder",
    authSource: "admin"
  },
  sentry: {
    key: process.env.SENTRY_KEY,
    project: process.env.SENTRY_PROJECT
  },
  telegram: {
    key: process.env.TELEGRAM_KEY,
    chat: process.env.TELEGRAM_CHAT
  }
};
