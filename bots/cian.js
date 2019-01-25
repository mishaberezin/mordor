const EventEmitter = require("events");
const config = require("config");
const once = require("lodash/once");
const noop = require("lodash/noop");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const retry = require("promise-retry");

const {
  sleep,
  paralyze,
  adblocker,
  devtunnel,
  chromemod,
  screenshot,
  getudd
} = require("./utils");

class Cian extends EventEmitter {
  constructor() {
    super();
    this.init = once(this.init);
  }

  async init() {
    const udd = await getudd("cian");
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        "--disable-infobars",
        "--disable-session-crashed-bubble",
        '--js-flags="--max-old-space-size=500"'
      ],
      ignoreHTTPSErrors: true,
      userDataDir: udd.path
    });

    await chromemod(browser);

    const allPages = await browser.pages();
    const mainPage = allPages[0] || (await browser.newPage());

    await adblocker(mainPage);

    browser.on("targetchanged", async target => {
      const targetUrl = target.url();

      if (this.getUrlInfo(targetUrl).type !== "captcha") {
        return;
      }

      const targetPage = await target.page();
      paralyze(targetPage, async resolve => {
        await sleep(5000); // Подождем перед скриншотом
        this.emit("error", "Капча", {
          "📸": await screenshot(targetPage),
          "👉": targetUrl,
          "👾": await devtunnel(targetPage)
        });

        await targetPage
          .waitForNavigation({ timeout: 3600000 })
          .catch(error => {
            this.emit("error", "Капча не разгадана");
          })
          .finally(resolve);
      });
    });

    this.udd = udd;
    this.browser = browser;
    this.mainPage = mainPage;
  }

  async stop() {
    try {
      await this.browser.close().catch(noop);
      await this.udd.unlock().catch(noop);
    } catch (error) {
      return;
    }
  }

  async mine() {
    await this.init();

    for await (const offer of this.offers()) {
      await this.send(offer)
        .then(report => {
          console.log(`Отправили ${report.count}`);
        })
        .catch(error => {
          this.emit("error", "Не удалось отправить офферы", { error });
        });
    }
  }

  async send(offer) {
    const offers = Array.isArray(offer) ? offer : [offer];

    return retry(retry =>
      fetch(`${config.get("api.url")}/offer`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers })
      })
        .then(() => ({
          ok: true,
          count: offers.length
        }))
        .catch(retry)
    );
  }

  getUrlInfo(url) {
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
        test: url => /^https?:\/\/(\w+\.)?cian\.ru\/rent\/flat/.test(url),
        info: url => ({
          type: "offer"
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
}

module.exports = Cian;
