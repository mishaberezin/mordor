const requestBL = [
  /^https?:\/\/api\.flocktory\.com/,
  /^https?:\/\/www\.facebook\.com/,
  /^https?:\/\/connect\.facebook\.net/,
  /^https?:\/\/banners\.adfox\.ru/,
  /^https?:\/\/.+\.criteo\.net/,
  /^https?:\/\/.+\.criteo\.com/,
  /^https?:\/\/top-fwz1\.mail\.ru/,
  /^https?:\/\/ad\.360yield\.com/,
  /^https:\/\/.+\.twitter\.com/,
  /^https:\/\/static\.ads-twitter\.com/
];
[
  // /^https?:\/\/www\.googletagmanager\.com/,
  // /^https?:\/\/www\.google-analytics\.com/,
  /^https?:\/\/secure\.adnxs\.com/,
  /^https?:\/\/r\.casalemedia\.com/,
  /^https?:\/\/ads\.adfox\.ru/,
  /^https?:\/\/ads\.yahoo\.com/,
  /^https?:\/\/x\.cnt\.my/,
  /^https?:\/\/rtbcc\.fyber\.com/,
  /^https?:\/\/rtb-csync\.smartadserver\.com/,
  /^https?:\/\/simage2\.pubmatic\.com/,
  /^https?:\/\/top-fwz1\.mail\.ru/,
  /^https?:\/\/an\.yandex\.ru/,
  /^https?:\/\/pixel\.advertising\.com/,
  /^https?:\/\/profile\.ssp\.rambler\.ru/,
  /^https?:\/\/trc\.taboola\.com/,
  /^https?:\/\/eb2\.3lift\.com/,
  /^https?:\/\/visitor\.omnitagjs\.com/,
  /^https?:\/\/ad\.mail\.ru/,
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
  /^https?:\/\/sy\.eu\.angsrvr\.com/,
  /^https?:\/\/sync\.outbrain\.com/,
  /^https?:\/\/idsync\.rlcdn\.com/,
  // /^https?:\/\/.*\.doubleclick\.net/,

  // REALTY
  /^https:\/\/mc\.yandex\.ru/,
  /^https:\/\/static-maps\.yandex\.ru/,
  /^https:\/\/realty\.yandex\.ru\/manifest\.json/,
  /^https:\/\/yandex\.ru\/set\/s\/rsya-tag-users/,
  // /^https:\/\/www\.googleadservices\.com/,
  // /^https:\/\/googleads\.g\.doubleclick\.net/,
  /^https:\/\/wcm\.solution\.weborama\.fr/,
  /^https:\/\/yastatic\.net\/s3\/vertis-frontend/,
  /^https:\/\/ads\.adfox\.ru/,
  /^https:\/\/an\.yandex\.ru\/partner-code-bundles/,
  /^https:\/\/yastatic\.net\/pcode\/adfox\/loader\.js/,
  /^https:\/\/awaps\.yandex\.net/,
  // /^https:\/\/google-analytics\.com/,
  /^https:\/\/unpkg\.com/,
  /^https:\/\/yastatic\.net\/q\/set\/s\/rsya-tag-users/,
  /^https:\/\/an\.yandex\.ru/,
  /^https:\/\/static-mon\.yandex\.net/,
  // /^https:\/\/www\.googletagmanager\.com/,
  /^https:\/\/.+\.mail\.ru\//
];

const requestWL = [
  /^https:\/\/www\.gstatic\.com\/recaptcha/,
  /^https:\/\/www\.google\.com\/recaptcha/,
  /^https:\/\/ysa-static\.passport\.yandex\.ru/
];

// Страницы без блокировки
const pageurlWL = [
  /^https:\/\/www\.cian\.ru\/captcha/,
  /^https:\/\/realty\.yandex\.ru\/showcaptcha/
];

const resourceTypeBL = [
  "image",
  "font",
  "media",
  "texttrack",
  "websocket",
  "manifest",
  "other"
];

const isIn = (list, sample) =>
  list.some(rule => (rule.test ? rule.test(sample) : rule === sample));

const adblock = async page => {
  await page.setRequestInterception(true);

  page.on("request", request => {
    if (isIn(pageurlWL, page.url())) {
      request.continue();
    } else if (isIn(requestBL, request.url())) {
      request.abort();
      // request.continue();
    } else if (isIn(requestWL, request.url())) {
      request.continue();
    } else if (isIn(resourceTypeBL, request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });
};

const adblockBrowser = async browser => {
  const pages = await browser.pages();
  await Promise.all(pages.map(page => adblock(page)));

  browser.on("targetcreated", async target => {
    if (target.type() === "page") {
      adblock(await target.page());
    }
  });
};

module.exports = async guess => {
  const page = guess.goto ? guess : null;
  const browser = page ? null : guess;

  if (page) {
    return adblock(page);
  } else {
    return adblockBrowser(browser);
  }
};
