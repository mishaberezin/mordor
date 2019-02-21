const utils = require("../../utils");
const adblocker = require("./adblocker");
const devtunnel = require("./devtunnel");
const chromemod = require("./chromemod");
const screenshot = require("./screenshot");
const paralyze = require("./paralyze");
const getudd = require("./getudd");
const everpage = require("./everpage");

// Ждет появление элемента с заданным селектором и кликает по нему.
const waitAndClick = async (page, selector) => {
  // Если использовать ElementHandle, возвращаемый из waitForSelector,
  // К примеру: await (await page.waitForSelector(selector)).click();
  // можно столкнуться с ошибкой "Error: Node is detached from document",
  // такое бывает если Реакт перерендерил компонент или что-то подобное.
  // Поэтому отдельно ждем и отдельно кликаем.
  await page.waitForSelector(selector);
  await page.click(selector);
};

module.exports = {
  ...utils,
  waitAndClick,
  paralyze,
  adblocker,
  devtunnel,
  chromemod,
  screenshot,
  getudd,
  everpage
};
