const path = require("path");
const EventEmitter = require("events");
const { getOffersCursor } = require("../lib/db");
const config = require("config");
const once = require("lodash/once");
const range = require("lodash/range");
const shuffle = require("lodash/shuffle");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const retry = require("promise-retry");

const flatCache = require("flat-cache");
const cacheDir = path.resolve(__dirname, "cache");
const cache = flatCache.load("cian", cacheDir);

const {
  sleep,
  neverend,
  paralyze,
  adblocker,
  devtunnel,
  chromemod,
  screenshot
} = require("./utils");

class Cian extends EventEmitter {
  constructor(options) {
    super();
    this.init = once(this.init);
    this.options = Object.assign(this.defaults, options);
  }

  get defaults() {
    return {
      delay: 10000
    };
  }

  async init() {
    const browser = await puppeteer.launch({
      // headless: false,
      defaultViewport: null,
      args: ["--disable-infobars", '--js-flags="--max-old-space-size=500"'],
      ignoreHTTPSErrors: true
    });

    await chromemod(browser);

    const allPages = await browser.pages();
    const mainPage = allPages[0] || (await browser.newPage());

    await adblocker(mainPage);

    browser.on("targetchanged", async target => {
      const targetUrl = target.url();
      const isCaptcha = /^https:\/\/www.cian.ru\/captcha/.test(targetUrl);

      if (!isCaptcha) return;

      const targetPage = await target.page();
      paralyze(targetPage, async resolve => {
        await sleep(5000); // Подождем перед скриншотом
        this.emit("error", "Капча", {
          "📸": await screenshot(targetPage),
          "👉": targetUrl,
          "👾": await devtunnel(targetPage)
        });

        await targetPage
          .waitForNavigation({ timeout: 3600000 })
          .catch(error => {
            this.emit("error", "Капча не разгадана");
          })
          .finally(resolve);
      });
    });

    this.browser = browser;
    this.mainPage = mainPage;
  }

  async stop() {
    return this.browser.close();
  }

  async mine() {
    await this.init();

    for await (const offer of this.offers()) {
      await this.send(offer)
        .then(report => {
          console.log(`Отправили ${report.count}`);
        })
        .catch(error => {
          this.emit("error", "Не удалось отправить офферы", { error });
        });

      await sleep(this.options.delay);
    }
  }

  async send(offer) {
    const offers = Array.isArray(offer) ? offer : [offer];

    return retry(retry =>
      fetch(`${config.get("api.url")}/offer`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers })
      })
        .then(() => ({
          ok: true,
          count: offers.length
        }))
        .catch(retry)
    );
  }
}

class CianCrawler extends Cian {
  async *offers() {
    const mainPage = this.mainPage;
    const regions = shuffle(await this.getRegions());

    for (const region of neverend(regions)) {
      // На всякий случай больше 100 страниц в выдаче не бывает.
      for (const pageNumber of range(1, 100)) {
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
          this.emit("error", `Не удалось загрузить страницу`, {
            error,
            "👉": url
          });
          continue;
        }

        const pageUrl = mainPage.url();
        const pageParam = new URL(pageUrl).searchParams.get("p");

        if (pageParam === null) {
          this.emit("error", "Не удалось узнать реальный номер страницы", {
            "👉": pageUrl
          });
          break;
        }

        if (Number(pageParam) !== pageNumber) {
          break;
        }

        yield await this.page2data(mainPage);
      }
    }
  }

  async page2data(page) {
    const mapper = offer => ({
      sid: "cian",
      oid: offer.cianId,
      status: "active",
      timestamp: Date.now(),
      totalArea: offer.totalArea,
      roomsCount: offer.roomsCount,
      floor: offer.floorNumber,
      photos: offer.photos.map(photo => photo.fullUrl),
      description: offer.description,
      price: offer.bargainTerms.priceRur,
      phone: `${offer.phones[0].countryCode}${offer.phones[0].number}`,
      metro: Object(offer.geo.undergrounds.filter(u => u.isDefault)[0]).name,
      url: offer.fullUrl,
      isAgent: Object(offer.user).isAgent,
      address: (offer.geo.address || [])
        .filter(a => a.geoType !== "district" && a.geoType !== "underground")
        .map(a => a.name)
        .join(" ")
    });

    return await page
      .evaluate(() => window.__serp_data__.results.offers)
      .catch(async error => {
        this.emit("error", "Не нашли данные по офферам", {
          error,
          "📸": await screenshot(page),
          "👉": page.url()
        });

        return [];
      })
      .then(offers => offers.map(mapper))
      .catch(error => {
        this.emit("error", "Не удалось смапить офферы", { error });
        return [];
      });
  }

  async getRegions() {
    const useCache = Math.floor(Math.random() * 10) !== 1;

    if (useCache) {
      return cache.getKey("regions");
    }

    return retry(retry =>
      this.mainPage
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
  }
}

class CianChecker extends Cian {
  async *offers() {
    const mainPage = this.mainPage;
    const HOUR = 1000 * 60 * 60;
    const getYesterday = () => new Date(Date.now() - HOUR * 24);

    while (true) {
      const timer = sleep(HOUR);
      const offers = await getOffersCursor(
        {
          sid: "cian",
          status: "active",
          checkedAt: { $lt: getYesterday() }
        },
        "url"
      );

      for await (const { url } of offers) {
        try {
          await mainPage.goto(url, {
            waitUntil: "domcontentloaded"
          });

          yield await this.page2data(mainPage);
        } catch (e) {
          this.emit("error", "Не смогли обработать страницу", {
            "📸": await screenshot(mainPage),
            "👉": url
          });

          await sleep(HOUR);
          continue;
        }
      }

      await timer;
    }
  }

  async page2data(page) {
    const { offer, agent, priceChanges } = await page.evaluate(
      () =>
        window._cianConfig["offer-card"].find(
          item => item.key === "defaultState"
        ).value.offerData
    );

    return {
      sid: "cian",
      status: offer.status === "published" ? "active" : "closed",
      url: page.url(),
      oid: offer.cianId,
      address: (offer.geo.address || [])
        .filter(a => a.type !== "district" && a.type !== "underground")
        .map(a => a.fullName)
        .join(" "),
      roomsCount: offer.flatType === "studio" ? 0 : offer.roomsCount,
      floor: offer.floorNumber,
      photos: offer.photos.map(p => p.fullUrl),
      totalArea: offer.totalArea,
      timestamp: Date.now(),
      description: offer.description,
      phone: `${offer.phones[0].countryCode}${offer.phones[0].number}`,
      price: priceChanges[0].priceData.price,
      isAgent: agent.accountType !== null
    };
  }
}

module.exports = {
  CianCrawler,
  CianChecker
};
