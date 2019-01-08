const fs = require("fs");
const EventEmitter = require("events");
const config = require("config");
const range = require("lodash/range");
const shuffle = require("lodash/shuffle");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const retry = require("promise-retry");
const tempy = require("tempy");

const mordobot = require("../lib/mordobot");
const { sleep, neverend, adblock } = require("./utils");

class Robot extends EventEmitter {
  async init() {
    const browser = await puppeteer.launch({
      // headless: false,
      defaultViewport: null,
      args: ["--disable-infobars", '--js-flags="--max-old-space-size=500"'],
      ignoreHTTPSErrors: true
    });

    const allPages = await browser.pages();
    const mainPage = allPages[0] || (await browser.newPage());

    await adblock(mainPage);

    const regions = await this.getRegions().catch(error => {
      this.emit("error", "Не удалось скачать список регионов", { error });
      throw error;
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
    const delay = 20000;

    for await (const offers of this.offers()) {
      await this.send(offers)
        .then(() => {
          console.log(`Отправили ${offers.length} штук офферов`);
        })
        .catch(error => {
          this.emit("error", "Не удалось отправить офферы", { error });
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
        } catch (error) {
          robot.emit("error", `Не удалось загрузить страницу ${url}`, {
            error
          });
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
          .evaluate(() => window.__serp_data__.results.offers)
          .catch(async error => {
            const screenshotPath = tempy.file();

            await mainPage.screenshot({
              path: screenshotPath,
              type: "jpeg",
              quality: 1,
              // fullPage: true,
              encoding: "binary"
            });

            robot.emit("error", "Не нашли данные по офферам", {
              error,
              screenshotPath
            });

            return [];
          })
          .then(offers => offers.map(makeOffer))
          .catch(error => {
            robot.emit("error", "Не удалось обработать офферы", { error });
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

  robot.on("error", async (msg, { error, screenshotPath }) => {
    await mordobot.sendMessage(`CIAN ROBOT ERROR: ${msg} \n ${error}`);
    if (screenshotPath) {
      await mordobot.sendPhoto(fs.createReadStream(screenshotPath));
    }
    console.error(msg, error);
  });

  try {
    await robot.init();
    await robot.mine();
  } catch (error) {
    await mordobot.sendMessage(`CIAN ROBOT CRASH: \n ${error}`);
    console.error(error);
    setTimeout(() => {
      throw error;
    }, 5000);
  }
};
