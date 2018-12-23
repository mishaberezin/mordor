const config = require("config");
const shuffle = require("lodash/shuffle");
const puppeteer = require("puppeteer");
const fetch = require("node-fetch");

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function getDistrictsIds(page) {
  return fetch("https://www.cian.ru/api/geo/get-districts-tree/?locationId=1")
    .then(res => res.json())
    .then(res => res.map(d => d.id))
    .catch(e => process.exit(1));
}

async function run() {
  const districts = shuffle(await getDistrictsIds());

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ["--disable-infobars", '--js-flags="--max-old-space-size=500"'],
    ignoreHTTPSErrors: true
  });

  // Используем стартовую вкладку, если есть
  const allPages = await browser.pages();
  const page = allPages[0] || (await browser.newPage());

  // Экономим траффик
  await page.setRequestInterception(true);

  page.on("request", request => {
    if (["image", "font"].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  await page.bringToFront();
  await page.goto("https://www.cian.ru/", {
    waitUntil: "domcontentloaded"
  });

  const neverend = function*(arr) {
    for (let i = 0; true; i = (i + 1) % arr.length) {
      yield arr[i];
    }
  };

  for (const district of neverend(districts)) {
    await getOffersByDistrict(page, district);
  }
}

async function getOffersByDistrict(page, districtId, pageNumber = 1) {
  const url =
    `https://www.cian.ru/cat.php` +
    `?deal_type=rent&district%5B0%5D=${districtId}&engine_version=2&offer_type=flat&type=4&p=${pageNumber}`;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  const pageUrlParam = Number(
    await page
      .evaluate(() => new URL(window.location.href).searchParams.get("p"))
      .catch(console.error)
  );

  if (pageUrlParam !== pageNumber) return false;

  const offers = await page
    .evaluate(() => window.__serp_data__.results.offers)
    .catch(err => {
      console.error(err);
      return [];
    })
    .then(offers => offers.map(getDataFromOffer));

  console.log(`districtId: ${districtId}`, `pageNumber: ${pageNumber}`);

  await addOffers(offers);

  await delay(2000);
  return await getOffersByDistrict(page, districtId, pageNumber + 1);
}

async function addOffers(offers) {
  await fetch(`${config.get("api.url")}/offer`, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offers })
  }).catch(err => console.error(err));
}

const getDataFromOffer = offer => {
  const {
    description,
    bargainTerms: { priceRur },
    phones,
    fullUrl,
    cianId,
    user,
    photos,
    totalArea,
    roomsCount,
    floorNumber
  } = offer;

  return {
    sid: "cian",
    oid: String(cianId),
    status: "active",
    totalArea,
    roomsCount,
    floor: floorNumber,
    photos: photos.map(p => p.fullUrl),
    timestamp: Date.now(),
    description,
    price: priceRur,
    phone: `${phones[0].countryCode}${phones[0].number}`,
    metro: Object(offer.geo.undergrounds.filter(u => u.isDefault)[0]).name,
    url: fullUrl,
    isAgent: Object(user).isAgent,
    address: (offer.geo.address || [])
      .filter(a => a.geoType !== "district" && a.geoType !== "underground")
      .map(a => a.name)
      .join(" ")
  };
};

module.exports = run;
