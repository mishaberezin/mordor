const config = require("config");
const puppeteer = require("puppeteer");
const db = require("../lib/db");
const { sleep, adblocker, chromemod } = require("./utils");

const fetch = require("node-fetch");

class Robot {
  constructor() {
    return this.init();
  }

  async init() {
    const browser = await puppeteer.launch({
      // headless: false,
      defaultViewport: null,
      args: ["--disable-infobars", '--js-flags="--max-old-space-size=500"'],
      ignoreHTTPSErrors: true
    });

    await chromemod(browser);

    // Используем стартовую вкладку, если есть.
    const allPages = await browser.pages();
    const mainPage = allPages[0] || (await browser.newPage());

    await adblocker(mainPage);

    await mainPage.bringToFront();
    await mainPage.goto("https://www.cian.ru/", {
      waitUntil: "domcontentloaded"
    });

    this.browser = browser;
    this.mainPage = mainPage;

    return this;
  }

  async stop() {
    return await this.browser.close();
  }

  async *urls() {
    const HOUR = 1000 * 60 * 60;
    const getYesterday = () => new Date(Date.now() - HOUR * 24);

    while (true) {
      const offers = await db.getOffers({
        sid: "cian",
        status: "active",
        checkedAt: { $lt: getYesterday() }
      });

      for (const offer of offers) {
        yield offer.url;
      }

      await sleep(HOUR / 60);
    }
  }

  async *offers() {
    const { mainPage } = this;

    for await (const url of this.urls()) {
      await sleep(5000);
      try {
        await mainPage.goto(url, {
          waitUntil: "domcontentloaded"
        });

        const { offer, agent, priceChanges } = await mainPage.evaluate(
          () =>
            window._cianConfig["offer-card"].find(
              item => item.key === "defaultState"
            ).value.offerData
        );

        yield {
          sid: "cian",
          status: offer.status === "published" ? "active" : "closed",
          url,
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
      } catch (e) {
        console.error(e);
        continue;
      }
    }
  }
}

async function postOffer(offer) {
  await fetch(`${config.get("api.url")}/offer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ offers: [offer] })
  }).catch(err => {
    console.log("ОШИБКА");
    console.log(offer);
    console.log(err);
  });
}

async function run() {
  const robot = await new Robot();

  for await (const offer of robot.offers()) {
    await postOffer(offer);
  }
}

module.exports = run;
