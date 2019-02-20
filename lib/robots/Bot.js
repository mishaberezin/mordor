const EventEmitter = require("events");
const config = require("config");
const puppeteer = require("puppeteer");
const noop = require("lodash/noop");
const once = require("lodash/once");
const fetch = require("node-fetch");
const retry = require("promise-retry");

const {
  chromemod,
  getudd,
  interval,
  paralyze,
  sleep,
  screenshot,
  devtunnel,
  adblocker
} = require("./utils");

class Bot extends EventEmitter {
  constructor() {
    super();
    this.init = once(this.init);
  }

  async init() {
    const udd = await getudd(this.sid());
    const browser = await puppeteer.launch({
      // headless: false,
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
    await adblocker(browser);

    browser.on("targetchanged", async target => {
      const url = target.url();

      if (this.sitemap(url).type !== "captcha") {
        return;
      }

      const page = await target.page();
      paralyze(page, async resolve => {
        await sleep(5000); // Пауза перед скриншотом
        this.emit("error", "Капча", {
          "📸": await screenshot(page),
          "👉": url,
          "👾": await devtunnel(page)
        });

        await page
          .waitForNavigation({ timeout: 3600000 })
          .catch(error => {
            this.emit("error", "Капча не разгадана");
          })
          .finally(resolve);
      });
    });

    const allPages = await browser.pages();
    await Promise.all(allPages.map(page => page.close()));

    this.udd = udd;
    this.browser = browser;
  }

  async stop() {
    await this.browser.close().catch(noop);
    await this.udd.unlock().catch(noop);
  }

  async mine() {
    await this.init();

    const page = await this.browser.newPage();

    for await (const url of interval(5000, this.urls())) {
      try {
        const response = await this.load(page, url);
        const data = await this.grab(page, response);
        const report = await this.send(data);
        console.log(`Отправили ${report.count}`);
      } catch (error) {
        if (error instanceof BotError) {
          this.emit("error", error.message, error.data);
        } else {
          this.emit("error", `Не удалось обработать URL: ${url}`, { error });
        }
      }
    }
  }

  async send(offer) {
    const offers = Array.isArray(offer) ? offer : [offer];

    return retry(retry =>
      fetch(`${config.get("api.url")}/offers`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers })
      })
        .then(() => ({
          count: offers.length
        }))
        .catch(retry)
    );
  }
}

class BotError extends Error {
  constructor(message = "Ошибка", data = {}) {
    super(message);

    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BotError);
    }

    this.data = {
      "⏱": new Date().toLocaleString("ru-RU", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      ...data
    };
  }
}

module.exports = { Bot, BotError };
