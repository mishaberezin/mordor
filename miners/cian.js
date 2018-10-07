const shuffle = require('lodash/shuffle');
const config = require('config').get('cian');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const selectors = {
    actionButton: '#header-user-login',
    usernameWrap: '.login-form-email',
    passwordWrap: '.login-form-password',
    submitButton: '.login-form-enter'
}

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

async function getDistrictsIds(page) {
    return fetch('https://www.cian.ru/api/geo/get-districts-tree/?locationId=1')
        .then(res => res.json())
        .then(res => res.map(d => d.id))
        .catch(e => process.exit(1))
}

async function run() {
    const districts = shuffle(await getDistrictsIds());

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: [
            '--disable-infobars',
            '--js-flags="--max-old-space-size=500"'
        ],
        ignoreHTTPSErrors: true
    });

    // Используем стартовую вкладку, если есть
    const allPages = await browser.pages();
    const page = allPages[0] || await browser.newPage();

    const waitAndClick = async selector => {
        await (await page.waitForSelector(selector)).click();
    }

    // Экономим траффик
    await page.setRequestInterception(true);

    page.on('request', request => {
        if (['image', 'font'].includes(request.resourceType())) {
            request.abort();
        } else {
            request.continue();
        }
    });

    await page.bringToFront();
    await page.goto('https://www.cian.ru/', {
        waitUntil: 'domcontentloaded'
    });

    // Логинимся
    await waitAndClick(selectors.actionButton);
    await delay(2000);
    await waitAndClick(selectors.usernameWrap);
    await page.keyboard.type(config.username, { delay: 30 });
    await waitAndClick(selectors.passwordWrap);
    await page.keyboard.type(config.password, { delay: 30 });
    await waitAndClick(selectors.submitButton);

    await page.waitForNavigation({
        waitUntil: 'networkidle0'
    });

    const neverend = function * (arr) {
        for(let i = 0; true; i = (i + 1) % arr.length) {
            yield arr[i];
        }
    }

    for (const district of neverend(districts)) {
        await getOffersByDistrict(page, district);
    }
}

async function getOffersByDistrict(page, districtId, pageNumber = 1) {
    const url = `https://www.cian.ru/cat.php?currency=2&deal_type=rent&district%5B0%5D=${districtId}&engine_version=2&maxprice=70000&offer_type=flat&room1=1&room2=1&room3=1&room9=1&type=4&zerocom=0&p=${pageNumber}`;

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    let pageUrlParam = Number(await page.evaluate(() => {
        return (new URL(window.location.href)).searchParams.get('p');
    }).catch(console.error));

    if (pageUrlParam !== pageNumber) return false;

    let offers = (await page.evaluate(() => window.__serp_data__.results.offers).catch(e => {
        console.error(e);
        process.exit(1)
    }))
        .map(getDataFromOffer);

    console.log('districtId: ' + districtId, 'pageNumber: ' + pageNumber);

    await addOffers(offers);

    await delay(2000);
    return await getOffersByDistrict(page, districtId, pageNumber + 1);
}

async function addOffers(offers) {
    await fetch('http://localhost:3000/offer', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers })
    });
}

const getDataFromOffer = offer => {
    let {
        description,
        bargainTerms: { priceRur },
        phones, fullUrl, addedTimestamp, added,
        id, user, photos, totalArea, roomsCount, floorNumber
    } = offer;

    return {
        sourceId: 'cian',
        offerId: String(offer.cianId),
        totalArea,
        roomsCount,
        floor: floorNumber,
        metro: Object(offer.geo.undergrounds.filter(u => u.isDefault)[0]).fullName,
        photos: photos.map(p => p.fullUrl),
        parsedTimestamp: (Date.now() / 1000).toFixed(0, 10),
        description,
        price: priceRur,
        phone: `${phones[0].countryCode}${phones[0].number}`,
        url: fullUrl,
        isAgent: Object(user).isAgent,
        addressRaw: (offer.geo.address || [])
        .filter(a => a.geoType !== 'district' && a.geoType !== 'underground')
        .map(a => a.name).join(' ')
    }
};

module.exports = run;
