const fs = require("fs");
const path = require("path");
const assert = require("assert").strict;
const EventEmitter = require("events");
const config = require("config");
const noop = require("lodash/noop");
const range = require("lodash/range");
const shuffle = require("lodash/shuffle");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const retry = require("promise-retry");
const tempy = require("tempy");
const flatCache = require("flat-cache");

const cache = flatCache.load("cian", path.resolve(__dirname, "cache"));

const mordobot = require("../lib/mordobot");
const { sleep, neverend, adblock, Tunnel } = require("./utils");

class Robot extends EventEmitter {
  async init() {
    const browser = await puppeteer.launch({
      // headless: false,
      defaultViewport: null,
      args: ["--disable-infobars", '--js-flags="--max-old-space-size=500"'],
      ignoreHTTPSErrors: true
    });

    const allPages = await browser.pages();
    const mainPage = allPages[0] || (await browser.newPage());
    const servicePage = await browser.newPage();
    const servicePageId = servicePage._target._targetInfo.targetId;

    browser.on("targetchanged", async target => {
      const isCaptcha = /^https:\/\/www.cian.ru\/captcha/.test(target.url());

      if (!isCaptcha || this.locked) return;

      this.lock(async resolve => {
        const targetPage = await target.page();

        await Promise.all([
          sleep(5000), // Даем targetPage прогрузиться перед скриншотом
          servicePage.goto(
            "https://www.cian.ru/captcha/?redirect_url=https://www.cian.ru"
          )
        ]).catch(noop);

        const tunnel = new Tunnel(browser.wsEndpoint());
        await tunnel.create();

        const screenshot = await this.screenshot(targetPage);
        await servicePage.bringToFront(); // Важно для удаленного дебага

        this.emit("error", "Капча", {
          screenshot,
          "👉": targetPage.url(),
          "🛠": tunnel.url,
          "👾": tunnel.pageUrl(servicePageId)
        });

        // Если капча разгадана, страница средиректит
        await servicePage.waitForNavigation({ timeout: 0 });
        await servicePage.goto("about:blank");
        tunnel.close();
        resolve();
      });
    });

    await adblock(mainPage);

    const regions = await retry(retry =>
      mainPage
        .goto("https://www.cian.ru/api/geo/get-districts-tree/?locationId=1")
        .then(res => res.json())
        .then(data => {
          return data.reduce((acc, reg) => {
            return acc.concat(reg.childs.map(child => child.id));
          }, []);
        })
        .then(result => {
          cache.setKey("regions", result);
          cache.save(true);
          return result;
        })
        .catch(retry)
    ).catch(error => {
      this.emit("error", "Не удалось скачать список регионов", { error });
      return cache.getKey("regions");
    });

    this.browser = browser;
    this.mainPage = mainPage;
    this.regions = shuffle(regions);
    this._inited = true;
  }

  async screenshot(page = this.mainPage) {
    const filepath = tempy.file();

    await page.screenshot({
      path: filepath,
      type: "jpeg",
      quality: 10
    });

    return filepath;
  }

  lock(callback) {
    this.locked = new Promise(resolve => {
      callback(resolve);
    }).finally(() => {
      this.locked = false;
    });
  }

  async stop() {
    return this.browser.close();
  }

  async wait() {
    const originalGoto = this.mainPage.goto;

    this.mainPage.goto = async (...args) => {
      await this.mainPage.evaluate(() => {
        window.released = false;
        window.release = () => {
          window.released = true;
        };
      });
      await this.mainPage.waitForFunction("window.released", {
        timeout: 0
      });

      this.mainPage.goto = originalGoto;
      return this.mainPage.goto(...args);
    };
  }

  async mine() {
    assert.ok(this._inited, "Робот не ициализирован [robot.init()]");

    const delay = 20000;

    for await (const offers of this.offers()) {
      await this.send(offers)
        .then(() => {
          console.log(`Отправили ${offers.length} штук офферов`);
        })
        .catch(error => {
          this.emit("error", "Не удалось отправить офферы", { error });
        });

      await sleep(delay);
    }
  }

  async *offers() {
    const robot = this;
    const { mainPage, regions, makeOffer } = this;

    for (const region of neverend(regions)) {
      // На всякий случай больше 100 страниц в выдаче не бывает.
      for (const pageNumber of range(1, 100)) {
        await this.locked;

        const url =
          `https://www.cian.ru/cat.php` +
          `?deal_type=rent&district%5B0%5D=${region}&engine_version=2&offer_type=flat&type=4&p=${pageNumber}`;

        try {
          await retry(retry =>
            mainPage
              .goto(url, {
                waitUntil: "domcontentloaded"
              })
              .catch(retry)
          );
        } catch (error) {
          robot.emit("error", `Не удалось загрузить страницу`, {
            error,
            "👉": url
          });
          continue;
        }

        const pageUrl = mainPage.url();
        const pageParam = new URL(pageUrl).searchParams.get("p");

        if (pageParam === null) {
          robot.emit("error", "Не удалось узнать реальный номер страницы", {
            "👉": pageUrl
          });
          break;
        }

        if (Number(pageParam) !== pageNumber) {
          break;
        }

        const offers = await mainPage
          .evaluate(() => window.__serp_data__.results.offers)
          .catch(async error => {
            robot.emit("error", "Не нашли данные по офферам", {
              error,
              screenshot: await this.screenshot(),
              "👉": mainPage.url()
            });

            return [];
          })
          .then(offers => offers.map(makeOffer))
          .catch(error => {
            robot.emit("error", "Не удалось обработать офферы", { error });
            return [];
          });

        if (offers.length) {
          yield offers;
        }

        await sleep(5000);
      }
    }
  }

  makeOffer(data) {
    const {
      description,
      bargainTerms: { priceRur },
      phones,
      fullUrl,
      cianId,
      photos,
      totalArea,
      roomsCount,
      floorNumber
    } = data;

    return {
      sid: "cian",
      oid: cianId,
      status: "active",
      timestamp: Date.now(),
      totalArea,
      roomsCount,
      floor: floorNumber,
      photos: photos.map(photo => photo.fullUrl),
      description,
      price: priceRur,
      phone: `${phones[0].countryCode}${phones[0].number}`,
      metro: Object(data.geo.undergrounds.filter(u => u.isDefault)[0]).name,
      url: fullUrl,
      isAgent: Object(data.user).isAgent,
      address: (data.geo.address || [])
        .filter(a => a.geoType !== "district" && a.geoType !== "underground")
        .map(a => a.name)
        .join(" ")
    };
  }

  async send(offers) {
    return retry(retry =>
      fetch(`${config.get("api.url")}/offer`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers })
      }).catch(retry)
    );
  }
}

module.exports = async () => {
  const robot = new Robot();

  robot.on("error", async (title, { error, screenshot, ...extra } = {}) => {
    const message = [`⛈ CIAN: ${title}`];

    if (error) {
      message.push("`" + error + "`");
    }
    if (screenshot) {
      await mordobot.sendPhoto(fs.createReadStream(screenshot));
    }
    if (extra) {
      await mordobot.sendMessage(
        Object.keys(extra).map(key => message.push(`${key}: ${extra[key]}`))
      );
    }
    await mordobot.sendMessage(message.join("\n"));
    console.error(title, error);
  });

  try {
    await robot.init();
    await robot.mine();
  } catch (error) {
    await mordobot.sendMessage(`🔥 CIAN: Упал \n ${error}`);
    console.error(error);
    setTimeout(() => {
      throw error; // Вызывает перезапуск процесса
    }, 5000);
  }
};
