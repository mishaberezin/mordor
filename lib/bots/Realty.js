const { URLSearchParams } = require("url");
const { Bot, BotError } = require("./Bot");
const config = require("config");
const fetch = require("node-fetch");
const retry = require("promise-retry");
const { range, uniq, shuffle } = require("lodash");
const { interval, neverend, everpage } = require("./utils");
const flatCache = require("flat-cache");

const SID = "realty";
const cache = flatCache.load(SID, config.get("fs.cacheDir"));

class Realty extends Bot {
  sid() {
    return "realty";
  }

  sitemap(url) {
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

  async load(page, url) {
    return retry(retry =>
      page
        .goto(url, {
          waitUntil: "domcontentloaded"
        })
        .then(response => {
          const realUrl = response.url();
          const { type } = this.sitemap(realUrl);
          const status = response.status();

          if (type !== "offer") {
            throw new BotError(`Вместо оффера загрузилось [${type}]`, {
              "👉": url,
              "👈": realUrl
            });
          } else if (!response.ok()) {
            throw new BotError(`Ошибка ${status} при загрузке оффера`, {
              status,
              "👉": url,
              "👈": realUrl
            });
          } else {
            return response;
          }
        })
        .catch(retry)
    ).catch(error => {
      if (error instanceof BotError) {
        return Promise.reject(error);
      } else {
        throw new BotError("Не смогли загрузить страницу оффера", {
          error,
          "👉": url
        });
      }
    });
  }

  async grab(page, resp) {
    try {
      // https://github.com/GoogleChrome/puppeteer/issues/4011
      const mainWorld = page.mainFrame()._mainWorld;
      const isClosed = Boolean(await page.$(".offer-card__inactive"));

      if (!isClosed) {
        await page.bringToFront();
        await mainWorld.click(".phones__button");
        await mainWorld.waitForSelector(".helpful-info__contact-phones");
      }

      const url = page.url();
      const oid = url.match(/\/offer\/([^/]+)\//)[1];

      const phones = await page
        .$eval(".helpful-info__contact-phones", elem => elem.textContent)
        .catch(error => null);

      const placemark = await page
        .$eval(
          ".offer-map",
          (elem, oid) => {
            return JSON.parse(elem.dataset.bem)["offer-map"].placemarks.find(
              placemark => placemark.id === oid
            );
          },
          oid
        )
        .catch(error => {
          throw new Error(`Не смогли узнать координаты. ${error.message}`);
        });

      const roomsCount = await page
        .$eval(
          ".offer-card__feature_name_rooms-total .offer-card__feature-value",
          elem => elem.textContent
        )
        .catch(error => null);

      const isStudio = await page
        .$eval(
          ".offer-card__feature_name_studio .offer-card__feature-value",
          elem => true
        )
        .catch(error => null);

      const totalArea = await page
        .$eval(
          ".offer-card__feature_name_total-area .offer-card__feature-value",
          elem => elem.textContent
        )
        .catch(error => null);

      const isAgent = await page
        .$eval(".offer-card-author__note", elem =>
          /агент/.test(elem.textContent)
        )
        .catch(error => false);

      const address = await page
        .$eval(".offer-card-address", elem => elem.textContent)
        .catch(error => {
          throw new Error(`Не смогли узнать адрес. ${error.message}`);
        });

      const floor = await page
        .$eval(
          ".offer-card__feature_name_floors-total-apartment .offer-card__feature-value",
          elem => elem.textContent
        )
        .catch(error => null);

      const description = await page
        .$eval(".offer-card__desc-text", elem => elem.textContent)
        .catch(error => null);

      const price = await page
        .$eval(".offer-card__price", elem => elem.textContent)
        .catch(error => {
          throw new Error(`Не смогли узнать цену. ${error.message}`);
        });

      const photos = await page
        .$eval(".offer-card", elem =>
          JSON.parse(elem.dataset.bem)["offer-card"].images.map(
            image => image.big
          )
        )
        .catch(error => []);

      return {
        sid: this.sid(),
        oid,
        status: isClosed ? "closed" : "active",
        timestamp: Date.now(),
        url,
        address,
        coordinates: {
          lat: placemark.lat,
          lng: placemark.lon
        },
        roomsCount: roomsCount || (isStudio ? 0 : null),
        totalArea,
        floor,
        photos,
        description,
        price,
        phones,
        isAgent
      };
    } catch (error) {
      throw new BotError("Не смогли распарсить страницу", {
        error,
        "👉": page.url()
      });
    }
  }
}

class RealtyCrawler extends Realty {
  async *urls() {
    const getPage = everpage(this.browser);
    const regions = shuffle(await this.getRegions());
    const paginationRange = range(1, 30);

    for (const region of neverend(regions)) {
      for await (const pageNumber of interval(10000, paginationRange)) {
        const url =
          `https://realty.yandex.ru/moskva/snyat/kvartira/` +
          `?subLocality=${region}&page=${pageNumber}`;
        const page = await getPage();

        await retry(retry =>
          page
            .goto(url, {
              waitUntil: "domcontentloaded"
            })
            .then(response => {
              const realUrl = response.url();
              const { type } = this.sitemap(realUrl);

              if (!response.ok()) {
                throw new BotError("Ошибка при загрузке серпа (!ok)", {
                  status: response.status(),
                  "👉": url,
                  "👈": realUrl
                });
              } else if (type !== "serp") {
                throw new BotError("Вместо серпа загрузилось нечто", {
                  "👉": url,
                  "👈": realUrl
                });
              } else {
                return response;
              }
            })
            .catch(retry)
        ).catch(error => {
          if (error instanceof BotError) {
            return Promise.reject(error);
          } else {
            throw new BotError("Не смогли загрузить страницу серпа", {
              error,
              "👉": url
            });
          }
        });

        const realPageNumber = this.sitemap(page.url()).page;
        if (pageNumber !== realPageNumber) {
          break; // Конец выдачи → следующий регион
        }

        const urls = await page
          .$$eval(".SerpItemLink", links => links.map(link => link.href))
          .then(urls => {
            return uniq(urls).filter(url => this.sitemap(url).type === "offer");
          });

        for (const url of urls) {
          yield url;
        }
      }
    }
  }

  async getRegions() {
    const cachedRegions = cache.getKey("regions");

    if (cachedRegions) {
      return cachedRegions;
    }

    const page = await this.browser.newPage();

    return retry(async retry => {
      try {
        await page.goto("https://realty.yandex.ru/", {
          waitUntil: "domcontentloaded"
        });

        const data = await page.$eval(".b-page", elem =>
          fetch("https://realty.yandex.ru/gate/geoselector/sub-localities/", {
            method: "POST",
            body: new URLSearchParams({
              "params[rgid]": "587795", // Москва
              crc: JSON.parse(elem.dataset.bem)["i-global"].crc
            })
          }).then(resp => resp.json())
        );
        const regions = data.response["sub-localities"].map(geo => geo.id);

        cache.setKey("regions", regions);
        cache.save(true);

        return regions;
      } catch (error) {
        retry(error);
      }
    })
      .catch(error => {
        throw new BotError("Не смогли загрузить список регионов", {
          error
        });
      })
      .finally(async () => {
        await page.close();
      });
  }
}

class RealtyChecker extends Realty {
  async *urls() {
    for await (const offers of interval(180000, () =>
      this.getMissingOffers()
    )) {
      for (const { url } of offers) {
        yield url;
      }
    }
  }

  async getMissingOffers() {
    return retry(retry =>
      fetch(`${config.get("api.url")}/offers/missing/realty`)
        .then(res => res.json())
        .catch(retry)
    ).catch(error => {
      throw new BotError("Не смогли загрузить список потерянных офферов", {
        error
      });
    });
  }
}

module.exports = { RealtyCrawler, RealtyChecker };
