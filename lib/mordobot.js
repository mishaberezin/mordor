const config = require("config");
const TELEGRAM_KEY = config.get("telegram.key");
const TELEGRAM_CHAT = config.get("telegram.chat");

const Slimbot = require("slimbot");
const mordobot = new Slimbot(TELEGRAM_KEY);

const sendMessage = async str => {
  return mordobot.sendMessage(TELEGRAM_CHAT, str).catch(error => {
    console.error(error);
  });
};

const sendPhoto = async inputFile => {
  return mordobot.sendPhoto(TELEGRAM_CHAT, inputFile).catch(error => {
    console.error(error);
  });
};

module.exports = {
  sendMessage,
  sendPhoto
};
