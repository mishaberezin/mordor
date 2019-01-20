const config = require("config");
const TELEGRAM_KEY = config.get("telegram.key");
const TELEGRAM_CHAT = config.get("telegram.chat");

const Slimbot = require("slimbot");
const mordobot = new Slimbot(TELEGRAM_KEY);

const options = {
  parse_mode: "HTML"
};

const sendMessage = async message => {
  return mordobot.sendMessage(TELEGRAM_CHAT, message, options).catch(error => {
    console.error(error);
  });
};

const sendPhoto = async inputFile => {
  return mordobot.sendPhoto(TELEGRAM_CHAT, inputFile).catch(error => {
    console.error(error);
  });
};

const sendReport = async (message, { error, ...extra } = {}) => {
  await sendMessage(
    [
      message,
      ...Object.entries(extra).map(([key, val]) => `${key} ${val}`),
      error && `<pre>${error}</pre>`
    ]
      .filter(Boolean)
      .join("\n")
  );
};

module.exports = {
  sendMessage,
  sendPhoto,
  sendReport
};
