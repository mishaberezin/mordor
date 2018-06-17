const { URL } = require('url');
const puppeteer = require('puppeteer');
const Canvas = require('canvas');
const Image = Canvas.Image;
const OCRAD = require('../../node_modules/ocrad.js/ocrad.js');
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

function recognizeText(base64string) {
    const canvas = new Canvas(317, 50);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = base64string;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 317, 50);
    ctx.drawImage(img, 0, 0, 317, 50);

    return OCRAD(canvas);
}

const base64string = 'data:image/png;base64,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';
const text = recognizeText(base64string);
console.log('text', text);

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

// getItems();

// @deemidroll: вроде как надо модулем делать. Дописать.
// module.exports = () => Promise.resolve([]);
