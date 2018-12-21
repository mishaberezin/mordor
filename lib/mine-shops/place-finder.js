const puppeteer = require("puppeteer");

const selectors = {
  submitButton: ".button_air-search-large",
  scrollContent: ".scroll__content",
  scrollWrap: ".scroll__container",
  addButton: ".search-list-view__add-business"
};

async function run(query, resolve) {
  let result = [];

  const browser = await puppeteer.launch({
    // headless: false
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 990, height: 600 });
  await page.bringToFront();
  await page.goto(
    "https://yandex.ru/maps/213/moscow?z=11&ll=37.620393%2C55.753960",
    { waitUntil: "networkidle2" }
  );
  await delay(2000);

  const scrollToLoad = async () => {
    const { height, scroll, hasAddButton } = await page.evaluate(selectors => {
      const height = document.querySelector(selectors.scrollContent)
        .offsetHeight;
      const scroll = document.querySelector(selectors.scrollWrap).scrollTop;
      const hasAddButton = Boolean(document.querySelector(selectors.addButton));

      return { height, scroll, hasAddButton };
    }, selectors);

    if (!hasAddButton) {
      page.evaluate(selectors => {
        const height = document.querySelector(selectors.scrollContent)
          .offsetHeight;

        document.querySelector(selectors.scrollWrap).scrollTop = height;
      }, selectors);
    } else {
      resolve(result);
    }
  };

  page.on("response", async res => {
    if (!~(await res.url().indexOf("https://yandex.ru/maps/api/search")))
      return;

    let data = (await res.json()).data.items;
    data = data
      .filter(a => !a.status || !~a.status.indexOf("closed"))
      .map(({ coordinates, address, title, categories }) => ({
        address,
        title,
        type: categories && categories[0].value,
        coordinates: coordinates.reverse()
      }));

    result = [...result, ...data];

    await delay(2500);

    scrollToLoad();
  });

  await delay(2000);
  await page.keyboard.type(query);
  await page.click(selectors.submitButton);
}

const delay = time =>
  new Promise(resolve => {
    setTimeout(resolve, time);
  });

module.exports = run;
