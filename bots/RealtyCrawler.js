const { Realty } = require("./Realty");
const { BotError } = require("./Bot");
const { URLSearchParams } = require("url");

const range = require("lodash/range");
const shuffle = require("lodash/shuffle");
const retry = require("promise-retry");
const fetch = require("node-fetch");

const config = require("config");
const cache = require("flat-cache").load("realty", config.get("fs.cacheDir"));

const { neverend, timeloop } = require("./utils");

class RealtyCrawler extends Realty {
  async *urls() {
    const page = await this.browser.newPage();
    const regions = shuffle(await this.getRegions());
    const interval = timeloop(10000);
    const serpPagesLimit = 30;

    for (const region of neverend(regions)) {
      for (const pageNumber of range(0, serpPagesLimit)) {
        await interval();

        const url =
          `https://realty.yandex.ru/moskva/snyat/kvartira/` +
          `?subLocality=${region}&page=${pageNumber}`;

        const response = await retry(retry =>
          page
            .goto(url, {
              waitUntil: "domcontentloaded"
            })
            .then(response => {
              const { type } = this.getUrlInfo(response.url());

              if (type !== "serp") {
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
        const { type, page: realPageNumber } = this.getUrlInfo(pageUrl);

        if (response.error) {
          this.emit("error", "Не смогли загрузить страницу серпа", {
            error: response.error,
            "👉": url
          });
          break;
        } else if (type !== "serp") {
          this.emit("error", "Непонятный редирект при попытке загрузить серп", {
            "👉": url,
            "👈": pageUrl
          });
          break;
        } else if (pageNumber !== realPageNumber) {
          // Дошли до конца выдачи, переходим к следующему региону.
          break;
        } else if (response.ok()) {
          const offerLinksSelector =
            ".serp-item__offer-link, .OffersSerpItem__generalInfo .OffersSerpItem__link";
          const urls = await page
            .$$eval(offerLinksSelector, links => links.map(link => link.href))
            .catch(error => {
              this.emit("warning", "Не нашли ссылки на серпе", {
                error,
                "👉": pageUrl
              });

              return [];
            });

          for (const url of urls) {
            yield url;
          }
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

module.exports = { RealtyCrawler };
