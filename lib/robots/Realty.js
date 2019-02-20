const { URLSearchParams } = require("url");
const { Bot, BotError } = require("./Bot");
const config = require("config");
const fetch = require("node-fetch");
const retry = require("promise-retry");
const { range, uniq, shuffle } = require("lodash");
const { interval, neverend } = require("./utils");
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
        const priceElem = getElemOrFail(".offer-card__price");
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
}

class RealtyCrawler extends Realty {
  async *urls() {
    const page = await this.browser.newPage();
    const regions = shuffle(await this.getRegions());
    const paginationRange = range(1, 30);

    for (const region of neverend(regions)) {
      for await (const pageNumber of interval(10000, paginationRange)) {
        const url =
          `https://realty.yandex.ru/moskva/snyat/kvartira/` +
          `?subLocality=${region}&page=${pageNumber}`;

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
