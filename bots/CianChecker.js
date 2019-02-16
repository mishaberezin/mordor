const config = require("config");
const Cian = require("./Cian");
const retry = require("promise-retry");
const fetch = require("node-fetch");

const { screenshot, timeloop } = require("./utils");

class CianChecker extends Cian {
  async *offers() {
    const mainPage = this.mainPage;
    const apiCallInterval = timeloop(1000 * 60 * 60);
    const urlCallInterval = timeloop(5000);

    while (true) {
      await apiCallInterval();

      const offers = await this.getMissingOffers();

      for (const { url, oid } of offers) {
        await urlCallInterval();

        const response = await retry(retry =>
          mainPage
            .goto(url, {
              waitUntil: "networkidle2" // DomCL недостаточно
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

        const mainPageUrl = mainPage.url();
        const mainPageType = this.getUrlInfo(mainPageUrl).type;

        if (response.error) {
          this.emit("error", "Таймаут или что-то такое", {
            error: response.error,
            "👉": url,
            "👈": mainPageUrl
          });
          continue;
        } else if (mainPageType !== "offer") {
          this.emit("warning", "Cредиректило непонятно куда", {
            "👉": url,
            "👈": mainPageUrl
          });
          break;
        } else if (response.ok()) {
          yield await this.page2data(mainPage);
        } else if (response.status() === 404) {
          yield {
            sid: "cian",
            oid,
            url: mainPageUrl,
            status: "deleted",
            timestamp: Date.now()
          };
          continue;
        }
      }
    }
  }

  async page2data(page) {
    const mapper = ({ offer, agent, priceChanges }) => ({
      sid: "cian",
      status: offer.status === "published" ? "active" : "closed",
      url: page.url(),
      oid: offer.cianId,
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
      price: priceChanges[0].priceData.price,
      isAgent: agent.isPro,
      timestamp: Date.now()
    });

    return await page
      .evaluate(
        () =>
          window._cianConfig["offer-card"].find(
            item => item.key === "defaultState"
          ).value.offerData
      )
      .catch(async error => {
        this.emit("error", "Не нашли данные на странице", {
          error,
          "📸": await screenshot(page),
          "👉": page.url()
        });
        return [];
      })
      .then(offerData => mapper(offerData))
      .catch(async error => {
        this.emit("error", "Не удалось смапить данные", {
          error,
          "📸": await screenshot(page),
          "👉": page.url()
        });

        return [];
      });
  }

  async getMissingOffers() {
    return retry(retry =>
      fetch(`${config.get("api.url")}/offers/missing/cian`)
        .then(res => res.json())
        .catch(retry)
    );
  }
}

module.exports = { CianChecker };
