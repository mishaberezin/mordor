const { Bot, BotError } = require("./Bot");
const config = require("config");
const { range, shuffle, uniq } = require("lodash");
const retry = require("promise-retry");
const { screenshot, neverend, interval, everpage } = require("./utils");
const flatCache = require("flat-cache");
const fetch = require("node-fetch");

const SID = "cian";
const cache = flatCache.load(SID, config.get("fs.cacheDir"));

class Cian extends Bot {
  sid() {
    return "cian";
  }

  sitemap(url) {
    const rules = [
      {
        test: url => /^https?:\/\/(\w+\.)?cian.ru\/captcha/.test(url),
        info: url => ({
          type: "captcha"
        })
      },
      {
        test: url => /^https?:\/\/(\w+\.)?cian\.ru\/cat\.php/.test(url),
        info: url => {
          const urlObj = new URL(url);
          return {
            type: "serp",
            page: Number(urlObj.searchParams.get("p"))
          };
        }
      },
      {
        test: url =>
          /^https?:\/\/(\w+\.)?cian\.ru\/rent\/flat\/\d+\//.test(url),
        info: url => {
          const urlObj = new URL(url);
          return {
            type: "offer",
            oid: urlObj.pathname.match(/\/rent\/flat\/(\d+)\//)[1]
          };
        }
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
          } else if (![200, 404].includes(status)) {
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
    const sid = this.sid();
    const url = page.url();
    const oid = this.sitemap(url).oid;

    if (resp.status() === 404) {
      return {
        sid,
        oid,
        url,
        status: "deleted",
        timestamp: Date.now()
      };
    }

    const mapper = ({ offer, agent }) => ({
      sid,
      oid,
      url,
      status: offer.status === "published" ? "active" : "closed",
      timestamp: Date.now(),
      address: (offer.geo.address || [])
        .filter(a => a.type !== "metro")
        .map(a => a.name)
        .join(", "),
      coordinates: offer.geo.coordinates,
      roomsCount: offer.flatType === "studio" ? 0 : offer.roomsCount,
      floor: offer.floorNumber,
      photos: offer.photos.map(p => p.fullUrl),
      totalArea: offer.totalArea,
      description: offer.description,
      phones: offer.phones.map(
        ({ countryCode, number }) => `${countryCode}${number}`
      ),
      price: offer.bargainTerms.price,
      isAgent: Boolean(offer.isByHomeowner)
    });

    const data = await page
      .evaluate(
        () =>
          window._cianConfig["offer-card"].find(
            item => item.key === "defaultState"
          ).value.offerData
      )
      .catch(async error => {
        throw new BotError("Не нашли данные на странице", {
          error,
          "📸": await screenshot(page),
          "👉": page.url()
        });
      });

    const offer = await Promise.resolve(mapper(data)).catch(async error => {
      throw new BotError("Не удалось смапить данные", {
        error,
        "📸": await screenshot(page),
        "👉": page.url()
      });
    });

    return offer;
  }
}

class CianCrawler extends Cian {
  async *urls() {
    const getPage = everpage(this.browser);
    const regions = shuffle(await this.getRegions());
    const paginationLimit = 100;
    const pageNumbers = interval(10000, range(1, paginationLimit));

    for (const region of neverend(regions)) {
      for await (const pageNumber of pageNumbers) {
        const url =
          `https://www.cian.ru/cat.php` +
          `?deal_type=rent&district%5B0%5D=${region}&engine_version=2&offer_type=flat&type=4&p=${pageNumber}`;
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
          .$$eval('a[href*="/rent/flat/"]', links =>
            links.map(link => link.href)
          )
          .then(urls =>
            uniq(urls).filter(url => this.sitemap(url).type === "offer")
          );

        for (const url of urls) {
          yield url;
        }
      }
    }
  }

  async getRegions() {
    const cached = cache.getKey("regions");

    if (cached) {
      return cached;
    }

    const page = await this.browser.newPage();

    return retry(retry =>
      page
        .goto("https://www.cian.ru/api/geo/get-districts-tree/?locationId=1")
        .then(res => res.json())
        .then(data => {
          const regions = data.reduce((acc, reg) => {
            return acc.concat(reg.childs.map(child => child.id));
          }, []);

          cache.setKey("regions", regions);
          cache.save(true);

          return regions;
        })
        .catch(retry)
    )
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

class CianChecker extends Cian {
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
      fetch(`${config.get("api.url")}/offers/missing/cian`)
        .then(res => res.json())
        .catch(retry)
    ).catch(error => {
      throw new BotError("Не смогли загрузить список потерянных офферов", {
        error
      });
    });
  }
}

module.exports = { Cian, CianCrawler, CianChecker };
