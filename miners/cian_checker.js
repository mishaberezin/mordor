const config = require("config");
const puppeteer = require("puppeteer");
const db = require("../lib/db");
const { sleep, ...utils } = require("./utils");
const fetch = require("node-fetch");

const blackList = [
  /^https?:\/\/images-cdn\.cian\.site/,
  /^https?:\/\/api\.flocktory\.com/,
  /^https?:\/\/www\.googletagmanager\.com/,
  /^https?:\/\/connect\.facebook\.net/,
  /^https?:\/\/banners\.adfox\.ru/,
  /^https?:\/\/www\.google-analytics\.com/,
  /^https?:\/\/static\.criteo\.net/,
  /^https?:\/\/top-fwz1\.mail\.ru/,
  /^https?:\/\/ad\.360yield\.com/,
  /^https?:\/\/secure\.adnxs\.com/,
  /^https?:\/\/r\.casalemedia\.com/,
  /^https?:\/\/dis\.eu\.criteo\.com/,
  /^https?:\/\/ads\.adfox\.ru/,
  /^https?:\/\/ads\.yahoo\.com/,
  /^https?:\/\/x\.cnt\.my/,
  /^https?:\/\/rtbcc\.fyber\.com/,
  /^https?:\/\/sslwidget\.criteo\.com/,
  /^https?:\/\/rtb-csync\.smartadserver\.com/,
  /^https?:\/\/simage2\.pubmatic\.com/,
  /^https?:\/\/top-fwz1\.mail\.ru/,
  /^https?:\/\/an\.yandex\.ru/,
  /^https?:\/\/pixel\.advertising\.com/,
  /^https?:\/\/profile\.ssp\.rambler\.ru/,
  /^https?:\/\/rtax\.criteo\.com/,
  /^https?:\/\/trc\.taboola\.com/,
  /^https?:\/\/eb2\.3lift\.com/,
  /^https?:\/\/visitor\.omnitagjs\.com/,
  /^https?:\/\/ad\.mail\.ru/,
  /^https?:\/\/dis\.criteo\.com/,
  /^https?:\/\/sopr-api\.cian\.ru/,
  /^https?:\/\/x\.bidswitch\.net/,
  /^https?:\/\/px\.adhigh\.net/,
  /^https?:\/\/sync\.ligadx\.com/,
  /^https?:\/\/vk\.com/,
  /^https?:\/\/s\.sspqns\.com/,
  /^https?:\/\/counter\.yadro\.ru/,
  /^https?:\/\/us-u\.openx\.net/,
  /^https?:\/\/x\.cnt\.my/,
  /^https?:\/\/matching\.ivitrack\.com/,
  /^https?:\/\/www\.facebook\.com/,
  /^https?:\/\/sy\.eu\.angsrvr\.com/,
  /^https?:\/\/sync\.outbrain\.com/,
  /^https?:\/\/idsync\.rlcdn\.com/,
  /^https?:\/\/.*\.doubleclick\.net/
];

const whiteList = [];

class Robot {
  constructor() {
    return this.init();
  }

  async init() {
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: ["--disable-infobars", '--js-flags="--max-old-space-size=500"'],
      ignoreHTTPSErrors: true
    });

    // Используем стартовую вкладку, если есть.
    const allPages = await browser.pages();
    const mainPage = allPages[0] || (await browser.newPage());

    // CSS фикс, устойчивый к перезагрузкам.
    await mainPage.evaluateOnNewDocument(() => {
      (function fix() {
        if (!document.head) {
          setTimeout(fix, 100);
        } else {
          document.getElementById("f1xed") ||
            document.head.insertAdjacentHTML(
              "beforeend",
              '<style id="f1xed">' +
                "#header-user-login-motivation-container" +
                "{ display: none !important }" +
                "</style>"
            );
        }
      })();
    });

    // Экономим траффик.
    await mainPage.setRequestInterception(true);

    mainPage.on("request", request => {
      const url = request.url();

      if (blackList.some(re => re.test(url))) {
        request.abort();
      } else if (whiteList.some(re => re.test(url))) {
        request.continue();
      } else if (["image", "font"].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

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
    console.count("Чекнул ОФФЕР!");
  }
}

module.exports = run;
