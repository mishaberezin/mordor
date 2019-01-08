const EventEmitter = require("events");
const config = require("config");
const range = require("lodash/range");
const shuffle = require("lodash/shuffle");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const retry = require("promise-retry");

const mordobot = require("../lib/mordobot");
const { sleep, neverend, adblock } = require("./utils");

class Robot extends EventEmitter {
  async init() {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ["--disable-infobars", '--js-flags="--max-old-space-size=500"'],
      ignoreHTTPSErrors: true
    });

    const allPages = await browser.pages();
    const mainPage = allPages[0] || (await browser.newPage());

    await adblock(mainPage);

    const regions = await this.getRegions().catch(err => {
      this.emit("error", "Не удалось скачать список регионов", err);
      throw err;
    });

    this.browser = browser;
    this.mainPage = mainPage;
    this.regions = shuffle(regions);

    return this;
  }

  async getRegions() {
    return retry(retry =>
      fetch("https://www.cian.ru/api/geo/get-districts-tree/?locationId=1")
        .then(data => data.json())
        .then(regs => {
          return regs.reduce((acc, reg) => {
            return acc.concat(reg.childs.map(child => child.id));
          }, []);
        })
        .catch(retry)
    );
  }

  async stop() {
    return this.browser.close();
  }

  async mine() {
    const delay = 5000;

    for await (const offers of this.offers()) {
      await this.send(offers)
        .then(() => {
          console.log(`Отправили ${offers.length} штук офферов`);
        })
        .catch(err => {
          this.emit("error", "Не удалось отправить офферы", err);
        });

      await sleep(delay);
    }
  }

  async *offers() {
    const robot = this;
    const { mainPage, regions, makeOffer } = this;

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
        } catch (err) {
          robot.emit("error", `Не удалось загрузить страницу ${url}`, err);
          continue;
        }

        const pageParam = new URL(mainPage.url()).searchParams.get("p");

        if (pageParam === null) {
          robot.emit("error", "Не удалось узнать реальный номер страницы");
          break;
        }

        if (Number(pageParam) !== pageNumber) {
          break;
        }

        const offers = await mainPage
          .evaluate(() => window.__serp_data__.resu1lts.offers)
          .catch(err => {
            robot.emit("error", "Не нашли данные по офферам", err);
            return [];
          })
          .then(offers => offers.map(makeOffer))
          .catch(err => {
            robot.emit("error", "Не удалось обработать офферы", err);
            return [];
          });

        if (offers.length) {
          yield offers;
        }
      }
    }
  }

  makeOffer(data) {
    const {
      description,
      bargainTerms: { priceRur },
      phones,
      fullUrl,
      cianId,
      photos,
      totalArea,
      roomsCount,
      floorNumber
    } = data;

    return {
      sid: "cian",
      oid: cianId,
      status: "active",
      timestamp: Date.now(),
      totalArea,
      roomsCount,
      floor: floorNumber,
      photos: photos.map(photo => photo.fullUrl),
      description,
      price: priceRur,
      phone: `${phones[0].countryCode}${phones[0].number}`,
      metro: Object(data.geo.undergrounds.filter(u => u.isDefault)[0]).name,
      url: fullUrl,
      isAgent: Object(data.user).isAgent,
      address: (data.geo.address || [])
        .filter(a => a.geoType !== "district" && a.geoType !== "underground")
        .map(a => a.name)
        .join(" ")
    };
  }

  async send(offers) {
    return retry(retry =>
      fetch(`${config.get("api.url")}/offer`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers })
      }).catch(retry)
    );
  }
}

module.exports = async () => {
  const robot = new Robot();

  robot.on("error", (msg, err) => {
    mordobot.sendMessage(`CiAN ROBOT ERROR: ${msg} \n err`);
    console.error(msg, err);
  });

  try {
    await robot.init();
    await robot.mine();
  } catch (err) {
    mordobot.sendMessage(`CIAN ROBOT CRASH: \n err`);
    console.error(err);
    throw err;
  }
};
