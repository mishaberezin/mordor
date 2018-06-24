const { URL } = require('url');
const puppeteer = require('puppeteer');
const Canvas = require('canvas');
const Image = Canvas.Image;
const OCRAD = require('../../node_modules/ocrad.js/ocrad.js');

async function getLinks(page) {
    return await page.evaluate(function(){
        return [].map.call(document.querySelectorAll('.js-catalog-item-enum'), function(el) {
            return el.querySelector('.item-description-title-link').href;
        });
    });
}

async function getLinkAndGoNext(page) {
    const res = { pageLinks: await getLinks(page) };

    try {
        await page.click('.js-pagination-next');
        // @deemidroll: удалить символ ноля в конце селектора.
        // await page.click('.js-pagination-next0');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        res.hasNext = true;
    } catch(error) {
        res.hasNext = false;
    }

    return res;
}

async function getDetails(page, pageUrl) {
    // @deemidroll: добавить недостающие поля:
    // addedTimestamp: Number,
    const itemDetails = {
        serviceName: 'Avito',
        parsedTimestamp: Date.now(),
        url: pageUrl
    };

    try {
        await page.goto(pageUrl, { waitUntil: 'networkidle0' });
        await page.click('.js-item-phone-button_card');
        await page.waitForSelector('.js-item-phone-big-number img[src]');

        Object.assign(itemDetails, await page.evaluate(function() {
            function getParam(name) {
                return ([].filter.call(document.querySelectorAll('.item-params-list-item'), function(el) {
                    return new RegExp(name).test(el.innerText);
                })[0] || {}).innerText;
            }

            const __totalArea = getParam('Общая площадь');
            const totalArea = Number(__totalArea.match(/\d+(.\d+)?/)[0]);
            const __roomsCount = getParam('Количество комнат');
            const roomsCount = Number(__roomsCount.match(/\d+/)[0]);
            const __type = getParam('Тип дома');
            const type = __type.slice(10);
            const __floor = getParam('Этаж');
            const floor = Number(__floor.match(/\d+/)[0]);
            const __floorsCount = getParam('Этажей в доме');
            const floorsCount = Number(__floorsCount.match(/\d+/)[0]);

            console.log('__floor', __floor);

            const __sellerInfo = (document.querySelector('.js-seller-info') || {}).innerText;

            let metro = [].map.call(document.querySelectorAll('.item-map-metro'), function(el) {
                return el.innerText.match(/(.+)\(/)[1].trim();
            })[0];

            metro = metro ? `м. ${metro}` : '';

            return {
                price: avito.item.price,
                addressRaw: avito.item.location,
                __title: avito.item.title,
                serviceId: avito.item.id,
                description: document.querySelector('[itemprop=description]').innerText,
                __sellerInfo,
                isAgent: /Агентство/.test(__sellerInfo),
                __phoneImage: document.querySelector('.js-item-phone-big-number img').src,
                photos: [].map.call(document.querySelectorAll('.gallery-list-item-link'), function(el) {
                    return 'https:' + el.style.backgroundImage
                    // "url("//92.img.avito.st/75x55/2795968092.jpg")"
                    // →
                    // "//92.img.avito.st/75x55/2795968092.jpg"
                        .slice(5, -2)
                        .replace('75x55', '640x480');
                }),
                __totalArea,
                totalArea,
                __roomsCount,
                roomsCount,
                metro,
                __type,
                type,
                __floor,
                floor,
                __floorsCount,
                floorsCount
            };
        }));

        Object.assign(itemDetails, {
            phone: recognizePhone(itemDetails.__phoneImage)
        });

    } catch (error) {
        console.error('Persing Erorr →', error);
        itemDetails.error = error;
    }

    return itemDetails;
}

/**
 * Возвращает распознанный телефон из картики.
 * @param String - base64string - картика в формате data url base64.
 */
function recognizePhone(base64string) {
    // Исользуем размер картинки как на странице квартиры.
    const w = 317;
    const h = 50;
    const canvas = new Canvas(w, h);
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.src = base64string;

    // Картинка с телефоном прозрачная.
    // Добавляем белый фон, чтобы улучшить распознавание.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    return OCRAD(canvas)
        // '8 985 224-33-04\n' → '89852243304'
        .replace(/\D/g, '');
}

async function getItems(pageNumber = 0) {
    const avitoUrl = 'https://www.avito.ru/moskva/kvartiry/sdam/na_dlitelnyy_srok';
    const pageUrl = new URL(avitoUrl);

    if (pageNumber) {
        pageUrl.search = `p=${pageNumber}`;
    }

    const browser = await puppeteer.launch({
        // Раскомментировать, чтобы увидеть браузер.
        // headless: false
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 990, height: 600 });
    await page.bringToFront();
    await page.goto(pageUrl, { waitUntil: 'networkidle0' });

    let links = [];

    let hasNext;

    console.info('Поиск объявлений:', avitoUrl);

    do {
        const res = await getLinkAndGoNext(page);
        links.push(...res.pageLinks);
        hasNext = res.hasNext;
    } while (hasNext)

    console.info('Всего объявлений:', links.length);

    const items = [];

    // deemidroll: remove start
    // links = links.slice(11, 12);
    // deemidroll: remove end

    while (links.length) {
        items.push(await getDetails(page, links.pop()));
        console.info('Обработано объявлений:', items.length);
    }

    browser.close();

    return items;
}

// deemidroll: remove start
// (async () => {
    // const items = await getItems();
    // console.log('getItems', items);
// })()
// deemidroll: remove end

module.exports = () => getItems();
