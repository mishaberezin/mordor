const EventEmitter = require("events");
const { BotError } = require("./Bot");
const config = require("config");
const puppeteer = require("puppeteer");
const noop = require("lodash/noop");
const once = require("lodash/once");
const fetch = require("node-fetch");
const retry = require("promise-retry");

const {
  chromemod,
  getudd,
  timeloop,
  paralyze,
  sleep,
  screenshot,
  devtunnel
  //adblocker
} = require("./utils");

class Realty extends EventEmitter {
  constructor() {
    super();
    this.init = once(this.init);
  }

  async init() {
    const udd = await getudd("realty");
    const browser = await puppeteer.launch({
      // headless: false,
      defaultViewport: null,
      args: [
        "--disable-infobars",
        "--disable-session-crashed-bubble",
        '--js-flags="--max-old-space-size=500"'
      ],
      ignoreHTTPSErrors: true,
      userDataDir: udd.path
    });

    await chromemod(browser);
    // await adblocker(browser);

    browser.on("targetchanged", async target => {
      const url = target.url();

      if (this.getUrlInfo(url).type !== "captcha") {
        return;
      }

      const page = await target.page();
      paralyze(page, async resolve => {
        await sleep(5000); // Пауза перед скриншотом
        this.emit("error", "Капча", {
          "📸": await screenshot(page),
          "👉": url,
          "👾": await devtunnel(page)
        });

        await page
          .waitForNavigation({ timeout: 3600000 })
          .catch(error => {
            this.emit("error", "Капча не разгадана");
          })
          .finally(resolve);
      });
    });

    const allPages = await browser.pages();
    await Promise.all(allPages.map(page => page.close()));

    this.udd = udd;
    this.browser = browser;
  }

  async stop() {
    try {
      await this.browser.close().catch(noop);
      await this.udd.unlock().catch(noop);
    } catch (error) {
      return;
    }
  }

  async mine() {
    await this.init();

    const page = await this.browser.newPage();
    const interval = timeloop(10000);

    for await (const url of this.urls()) {
      await interval();
      try {
        await this.load(page, url)
          .then(page => this.grab(page))
          .then(data => this.send(data))
          .then(report => {
            console.log(`Отправили ${report.count}`);
          });
      } catch (error) {
        if (error instanceof BotError) {
          this.emit("error", error.message, error.data);
        } else {
          this.emit("error", `Не удалось обработать URL: ${url}`, { error });
        }
      }
    }
  }

  async load(page, url) {
    const response = await retry(retry =>
      page
        .goto(url, {
          waitUntil: "domcontentloaded" // DomCL недостаточно
        })
        .then(response => {
          const { type } = this.getUrlInfo(response.url());

          if (type !== "offer") {
            retry();
          } else if ([504, 500].includes(response.status())) {
            retry();
          } else {
            return response;
          }
        })
        .catch(retry)
    ).catch(error => ({ error }));

    const pageUrl = page.url();
    const pageType = this.getUrlInfo(pageUrl).type;

    if (response.error) {
      throw new BotError("Не смогли загрузить страницу оффера", {
        error: response.error,
        "👉": url,
        "👈": pageUrl
      });
    } else if (pageType !== "offer") {
      throw new BotError("Непонятный редирект при попытке загрузить оффер", {
        "👉": url,
        "👈": pageUrl
      });
    } else if (response.status() === 404) {
      throw new BotError("Страница оффера возвращает 404", {
        "👉": url,
        "👈": pageUrl
      });
    } else if (!response.ok()) {
      throw new BotError("Что-то странное при загрузке оффера", {
        "👉": url,
        "👈": pageUrl,
        status: response.status()
      });
    }

    return page;
  }

  async grab(page) {
    try {
      await page.bringToFront();

      // https://github.com/GoogleChrome/puppeteer/issues/4011
      // await page.click(".phones__button");
      // await page.waitForSelector(".helpful-info__contact-phones");
      const mainWorld = page.mainFrame()._mainWorld;
      await mainWorld.click(".phones__button");
      await mainWorld.waitForSelector(".helpful-info__contact-phones");

      return await page.evaluate(() => {
        const getElemOrNull = selector => {
          return document.querySelector(selector);
        };
        const getElemOrFail = selector => {
          const elem = document.querySelector(selector);
          if (elem === null) {
            throw new Error(`Не нашли элемент с селектором ${selector}`);
          }
          return elem;
        };

        const phonesElem = getElemOrFail(".helpful-info__contact-phones");
        const roomsCountElem = getElemOrNull(
          ".offer-card__feature_name_rooms-total .offer-card__feature-value"
        );
        const isStudioElem = getElemOrNull(
          ".offer-card__feature_name_studio .offer-card__feature-value"
        );
        const totalAreaElem = getElemOrNull(
          ".offer-card__feature_name_total-area .offer-card__feature-value"
        );
        const authorNoteElem = getElemOrNull(".offer-card-author__note");
        const addressElem = getElemOrFail(".offer-card-address");
        const floorElem = getElemOrFail(
          ".offer-card__feature_name_floors-total-apartment .offer-card__feature-value"
        );
        const descriptionElem = getElemOrNull(".offer-card__desc-text");
        const priceElem = getElemOrFail(".offer-price");
        const offerMapElem = getElemOrFail(".offer-map");
        const offerCardElem = getElemOrFail(".offer-card");

        const oid = location.pathname.match(/\/offer\/([^/]+)\//)[1];
        const placemark = JSON.parse(offerMapElem.dataset.bem)[
          "offer-map"
        ].placemarks.find(placemark => placemark.id === oid);

        const offerCardData = JSON.parse(offerCardElem.dataset.bem)[
          "offer-card"
        ];
        const photos = offerCardData.images
          ? offerCardData.images.map(image => image.big)
          : [];

        return {
          sid: "realty",
          oid,
          status: "active",
          timestamp: Date.now(),
          url: location.href,
          address: addressElem.textContent,
          coordinates: {
            lat: placemark.lat,
            lng: placemark.lon
          },
          roomsCount: roomsCountElem
            ? roomsCountElem.textContent
            : isStudioElem
            ? 0
            : null,
          totalArea: totalAreaElem.textContent,
          floor: floorElem.textContent,
          photos,
          description: descriptionElem ? descriptionElem.textContent : "",
          price: priceElem.textContent,
          phones: phonesElem.textContent,
          isAgent: !authorNoteElem || /агент/.test(authorNoteElem.textContent)
        };
      });
    } catch (error) {
      throw new BotError("Не смогли распарсить страницу", {
        error,
        "👉": page.url()
      });
    }
  }

  async send(offer) {
    const offers = Array.isArray(offer) ? offer : [offer];

    return retry(retry =>
      fetch(`${config.get("api.url")}/offers`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers })
      })
        .then(() => ({
          count: offers.length
        }))
        .catch(retry)
    );
  }

  getUrlInfo(url) {
    const rules = [
      {
        test: url =>
          /^https?:\/\/realty\.yandex\.ru\/moskva\/snyat\/kvartira/.test(url),
        info: url => {
          const urlObj = new URL(url);

          return {
            type: "serp",
            page: Number(urlObj.searchParams.get("page"))
          };
        }
      },
      {
        test: url => /^https?:\/\/realty\.yandex\.ru\/offer/.test(url),
        info: url => ({
          type: "offer"
        })
      },
      {
        test: url => /^https?:\/\/realty\.yandex\.ru\/showcaptcha/.test(url),
        info: url => ({
          type: "captcha"
        })
      },
      {
        test: url => true,
        info: url => ({
          type: "page"
        })
      }
    ];

    for (const rule of rules) {
      if (rule.test(url)) return rule.info(url);
    }
  }
}

module.exports = { Realty };
