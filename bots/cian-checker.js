const Cian = require("./cian");
const retry = require("promise-retry");
const { getOffersCursor } = require("../lib/db");
const { screenshot, timeloop } = require("./utils");

class CianChecker extends Cian {
  async *offers() {
    const mainPage = this.mainPage;
    const HOUR = 1000 * 60 * 60;
    const getYesterday = () => new Date(Date.now() - HOUR * 24);
    const apiCallThrottle = timeloop(HOUR);
    const urlCallThrottle = timeloop(5000);

    while (true) {
      await apiCallThrottle();

      const offers = await getOffersCursor(
        {
          sid: "cian",
          status: "active",
          checkedAt: { $lt: getYesterday() }
        },
        "url"
      );

      for await (const { url } of offers) {
        await urlCallThrottle();

        const response = await retry(retry =>
          mainPage
            .goto(url, {
              waitUntil: "networkidle2" // dcl недостаточно
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
        const { type } = this.getUrlInfo(mainPageUrl);

        if (response.error) {
          this.emit("error", `Таймаут или что-то такое`, {
            error: response.error,
            "👉": url
          });
          continue;
        } else if (type !== "offer") {
          this.emit("warning", `Cредиректило непонятно куда`, {
            "👉": url,
            "👈": mainPageUrl
          });
          break;
        } else if (response.ok()) {
          yield await this.page2data(mainPage);
        } else if (response.status() === 404) {
          // TODO
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
      phones: offer.phones.map(
        ({ countryCode, number }) => `${countryCode}${number}`
      ),
      price: priceChanges[0].priceData.price,
      isAgent: agent.accountType !== null
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
      .catch(error => {
        this.emit("error", "Не удалось смапить данные", { error });
        return [];
      });
  }
}

module.exports = CianChecker;
