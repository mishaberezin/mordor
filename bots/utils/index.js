const adblocker = require("./adblocker");
const devtunnel = require("./devtunnel");
const chromemod = require("./chromemod");
const screenshot = require("./screenshot");
const paralyze = require("./paralyze");

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

// Позволяет бесконечно итерироваться по массиву,
// За последним элементом следует первый и т.д.
const neverend = function*(arr) {
  for (let i = 0; true; i = (i + 1) % arr.length) {
    yield arr[i];
  }
};

const sleep = async ms => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

const timeloop = ms => {
  let loop = Promise.resolve();
  return async () => {
    const _loop = loop;
    return loop.then(() => {
      if (loop === _loop) {
        loop = sleep(ms);
      }
    });
  };
};

module.exports = {
  waitAndClick,
  neverend,
  sleep,
  timeloop,
  paralyze,
  adblocker,
  devtunnel,
  chromemod,
  screenshot
};
