const { URL } = require('url');
const config = require('config');
const puppeteer = require('puppeteer');
const addressFixup = require('../fixup/address');

async function getLinks(page) {
    return await page.evaluate(function(){
        return [].map.call(document.querySelectorAll('.js-catalog-item-enum'), function(el) {
            return el.querySelector('.item-description-title-link').href;
        });
    });
}

async function getLinkAndGoNext(page) {
    const res = {
        pageLinks: await getLinks(page)
    };

    try {
        // @deemidroll: удалить 0 в селекторе.
        await page.click('.js-pagination-next0');
        await page.waitForNavigation({
            waitUntil: 'networkidle0'
        });
        res.hasNext = true;
    } catch(error) {
        res.hasNext = false;
    }

    return res;
}

async function getDetails(page, pageUrl) {
    await page.goto(pageUrl, { waitUntil: 'networkidle0' });
    await page.click('.js-item-phone-button_card');
    await page.waitForSelector('.js-item-phone-big-number');

    // @deemidroll: добавить недостающие поля:
    // addedTimestamp: Number,
    // phone: {
        // type: String,
        // required: true
    // },
    const itemDetails = {
        serviceName: 'Avito',
        parsedTimestamp: Date.now(),
        url: pageUrl
    };

    return Object.assign(itemDetails, await page.evaluate(function() {
        function getParam(name) {
            return ([].filter.call(document.querySelectorAll('.item-params-list-item'), function(el) {
                return new RegExp(name).test(el.innerText);
            })[0] || {}).innerText;
        }

        const __totalArea = getParam('Общая площадь');
        const totalArea = Number(__totalArea.match(/\d+(.\d+)?/)[0]);
        const __roomsCount = getParam('Количество комнат');
        const roomsCount = Number(__totalArea.match(/\d+/)[0]);
        // const __type = getParam('Тип дома');
        // const __floor = getParam('Этаж');
        // const __floorsCount = getParam('Этажей в доме');

        const __sellerInfo = (document.querySelector('.js-seller-info') || {}).innerText;

        return {
            price: avito.item.price,
            addressRaw: avito.item.location,
            __title: avito.item.title,
            serviceId: avito.item.id,
            description: document.querySelector('[itemprop=description]').innerText,
            __sellerInfo,
            isAgent: /Агентство/.test(__sellerInfo),
            __phoneImage: document.querySelector('.js-item-phone-button_card img').src,
            photos: [].map.call(document.querySelectorAll('.gallery-list-item-link'), function(el) {
                return el.style.backgroundImage
                    // "url("//92.img.avito.st/75x55/2795968092.jpg")"
                    // →
                    // "//92.img.avito.st/75x55/2795968092.jpg"
                    .slice(5, -2)
                    .replace('75x55', '640x480');
            }),
            __totalArea,
            totalArea,
            __roomsCount,
            roomsCount
        };
    }));
}

async function getItems(pageNumber = 0) {
    const pageUrl = new URL('https://www.avito.ru/moskva/kvartiry/sdam/na_dlitelnyy_srok');

    if (pageNumber) {
        pageUrl.search = `p=${pageNumber}`;
    }

    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 990, height: 600 });
    await page.bringToFront();
    await page.goto(pageUrl, { waitUntil: 'networkidle0' });

    const links = [];

    let hasNext;

    do {
        const res = await getLinkAndGoNext(page);
        links.push(...res.pageLinks);
        hasNext = res.hasNext;
    } while (hasNext)

    console.log('Total Items:', links.length);

    // @deemidroll: сделать map
    const itemDetails = await getDetails(page, links[0]);

    const withAddress = await addressFixup([itemDetails]);

    console.log('withAddress', withAddress);

    browser.close();
}

getItems();

// @deemidroll: вроде как надо модулем делать. Дописать.
// module.exports = () => Promise.resolve([]);
