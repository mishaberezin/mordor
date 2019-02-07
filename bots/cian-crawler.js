const Cian = require("./cian");

const range = require("lodash/range");
const shuffle = require("lodash/shuffle");
const retry = require("promise-retry");

const config = require("config");
const cache = require("flat-cache").load("cian", config.get("fs.cacheDir"));

const { neverend, screenshot, timeloop } = require("./utils");

class CianCrawler extends Cian {
  async *offers() {
    const mainPage = this.mainPage;
    const regions = shuffle(await this.getRegions());
    const throttle = timeloop(10000);

    for (const region of neverend(regions)) {
      // На всякий случай больше 100 страниц в выдаче не бывает.
      for (const pageNumber of range(1, 100)) {
        await throttle();

        const url =
          `https://www.cian.ru/cat.php` +
          `?deal_type=rent&district%5B0%5D=${region}&engine_version=2&offer_type=flat&type=4&p=${pageNumber}`;

        const response = await retry(retry =>
          mainPage
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

        const mainPageUrl = mainPage.url();
        const { type, page } = this.getUrlInfo(mainPageUrl);

        if (response.error) {
          this.emit("error", `Таймаут или что-то такое`, {
            error: response.error,
            "👉": url
          });
          break;
        } else if (type !== "serp") {
          this.emit("warning", `Cредиректило непонятно куда`, {
            "👉": url,
            "👈": mainPageUrl
          });
          break;
        } else if (page !== pageNumber) {
          // Дошли до конца выдачи, переходим к следующему региону.
          break;
        } else if (response.ok()) {
          yield await this.page2data(mainPage);
        }
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
      phones: offer.phones.map(
        ({ countryCode, number }) => `${countryCode}${number}`
      ),
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
    return (
      cache.getKey("regions") ||
      retry(retry =>
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
        return [];
      })
    );
  }
}

module.exports = CianCrawler;
