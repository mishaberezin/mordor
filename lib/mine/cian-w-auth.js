const config = require('config');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const db = require('../db');

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
        .catch(console.error)
}

async function run() {
    const districts = await getDistrictsIds();
    districts.sort(() => Math.random() > 0.5 ? -1 : 1)

    const browser = await puppeteer.launch({
        // headless: false
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 990, height: 600 });
    await page.bringToFront();
    await page.goto('https://www.cian.ru/', {waitUntil: 'networkidle2'});

    await page.click(selectors.actionButton);
    await delay(2000);
    await page.click(selectors.usernameWrap);
    await page.keyboard.type(config.get('cian.username'), {
        delay: 30
    });
    await page.click(selectors.passwordWrap);
    await page.keyboard.type(config.get('cian.password'), {
        delay: 30
    });
    await page.click(selectors.submitButton);

    await page.waitForNavigation({
        waitUntil: 'networkidle0'
    });

    let currentDistrictIndex = 0;

    while(true) {
        if (currentDistrictIndex === districts.length) {
            currentDistrictIndex = 0;
        }

        await getOffersByDistrict(page, districts[currentDistrictIndex]);
        currentDistrictIndex++;
    }

}

async function getOffersByDistrict(page, districtId, pageNumber = 1) {
    const url = `https://www.cian.ru/cat.php?currency=2&deal_type=rent&district%5B0%5D=${districtId}&engine_version=2&maxprice=70000&offer_type=flat&room1=1&room2=1&room3=1&room9=1&type=4&zerocom=0&p=${pageNumber}`;

    await page.goto(url);

    let pageUrlParam = Number(await page.evaluate(() => {
        return (new URL(window.location.href)).searchParams.get('p');
    }).catch(console.error));

    if (pageUrlParam !== pageNumber) return false;

    let offers = (await page.evaluate(() => window.__serp_data__.results.offers).catch(console.error))
        .map(getDataFromOffer);

    console.log('districtId: ' + districtId, 'pageNumber: ' + pageNumber);

    addOffers(offers);

    await delay(2000);
    return await getOffersByDistrict(page, districtId, pageNumber + 1);
}

async function addOffers(offers) {
    db.addOffers(offers);
}

const getDataFromOffer = offer => {
    let {
        description, bargainTerms: { priceRur },
        phones, fullUrl, addedTimestamp, added,
        id, user, photos, totalArea, roomsCount, floorNumber
    } = offer;

    return Object.assign(
        {
            totalArea,
            roomsCount,
            floor: floorNumber,
            metro: Object(offer.geo.undergrounds.filter(u => u.isDefault)[0]).fullName,
            photos: photos.slice(0, 10).map(p => p.fullUrl),
            parsedTimestamp: Date.now() / 1000,
            description,
            price: priceRur,
            phone: `${phones[0].countryCode}${phones[0].number}`,
            url: fullUrl,
            isAgent: Object(user).isAgent,
            addressRaw: (offer.geo.address || [])
            .filter(a => a.geoType !== 'district' && a.geoType !== 'underground')
            .map(a => a.name).join(' ')
        }
    )
};

module.exports = run;
