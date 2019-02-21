// https://github.com/paulirish/headless-cat-n-mouse/blob/master/apply-evasions.js

const chromemod = async page => {
  if (page._chromemoded) return;

  // Pass the User-Agent Test.
  const userAgent =
    "Mozilla/5.0 (X11; Linux x86_64)" +
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36";
  await page.setUserAgent(userAgent);

  await page.evaluateOnNewDocument(() => {
    // 1. Pass the Webdriver Test.
    const newProto = navigator.__proto__;
    delete newProto.webdriver;
    navigator.__proto__ = newProto;

    // 2. Pass the Chrome Test.
    // We can mock this in as much depth as we need for the test.
    window.chrome = {
      runtime: {}
    };

    // 3. Pass the Permissions Test.
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.__proto__.query = parameters =>
      parameters.name === "notifications"
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);

    // Inspired by: https://github.com/ikarienator/phantomjs_hide_and_seek/blob/master/5.spoofFunctionBind.js
    const oldCall = Function.prototype.call;
    function call() {
      return oldCall.apply(this, arguments);
    }
    Function.prototype.call = call;

    const nativeToStringFunctionString = Error.toString().replace(
      /Error/g,
      "toString"
    );
    const oldToString = Function.prototype.toString;

    function functionToString() {
      if (this === window.navigator.permissions.query) {
        return "function query() { [native code] }";
      }
      if (this === functionToString) {
        return nativeToStringFunctionString;
      }
      return oldCall.call(oldToString, this);
    }
    Function.prototype.toString = functionToString;

    // 4. Pass the Plugins Length Test.
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, "plugins", {
      // This just needs to have `length > 0` for the current test,
      // but we could mock the plugins too if necessary.
      get: () => [1, 2, 3, 4, 5]
    });

    // 5. Pass the Languages Test.
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"]
    });

    // XXX: С этим патчем не грузится recaptcha
    // 6. Pass the iframe Test
    // Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
    //   get: function() {
    //     return window;
    //   }
    // });

    // 7. Pass toString test, though it breaks console.debug() from working
    window.console.debug = () => {
      return null;
    };
  });
};

const chromemodBrowser = async browser => {
  const pages = await browser.pages();
  await Promise.all(pages.map(page => chromemod(page)));

  browser.on("targetcreated", async target => {
    if (target.type() === "page") {
      chromemod(await target.page());
    }
  });
};

module.exports = async guess => {
  const page = guess.goto ? guess : null;
  const browser = page ? null : guess;

  if (page) {
    return chromemod(page);
  } else {
    return chromemodBrowser(browser);
  }
};
