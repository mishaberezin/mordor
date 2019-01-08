const config = require("config");
const TELEGRAM_KEY = config.get("telegram.key");
const TELEGRAM_CHAT = config.get("telegram.chat");

const Slimbot = require("slimbot");
const mordobot = new Slimbot(TELEGRAM_KEY);

mordobot.startPolling();

const sendMessage = str => {
  mordobot.sendMessage(TELEGRAM_CHAT, str);
};

const sendPhoto = async inputFile => {
  return mordobot.sendPhoto(TELEGRAM_CHAT, inputFile);
};

module.exports = {
  sendMessage,
  sendPhoto
};
