const config = require('config');
const puppeteer = require('puppeteer');
const range = require('lodash/range');
const shuffle = require('lodash/shuffle');
const fetch = require('node-fetch');
const utils = require('./utils');

const selectors = {
    districtsPopupOpenButton: '.FiltersFormField__refinements-selector .Link:nth-child(2)',
    rentalMenuItem: '.NavMenuItem[href^="/moskva/snyat/kvartira/"]',
    extraFilters: '.FiltersFormField_section_extra .Link',
    regionsContainer: '.b-geoselector-refinement_type_sub-localities',
    offerLinks: '.serp-item__offer-link, .OffersSerpItem__generalInfo .OffersSerpItem__link',
    address: '.offer-card__address',
    roomsCount: '.offer-card__feature_name_rooms-total .offer-card__feature-value',
    floor: '.offer-card__feature_name_floors-total-apartment .offer-card__feature-value',
    totalArea: '.offer-card__feature_name_total-area .offer-card__feature-value',
    description: '.offer-card__desc-text',
    price: '.offer-price',
    isStudio: '.offer-card__feature_name_studio .offer-card__feature-value',
    phonesButton: '.phones__button',
    infoModal: '.helpful-info_type_offer',
    phones: '.helpful-info__contact-phones',
    authorNote: '.offer-card__author-note',
    redirectPhone: '.helpful-info__redirect-phone',
};

const blackList = [
    /^https:\/\/mc\.yandex\.ru/,
    /^https:\/\/static-maps\.yandex\.ru/,
    /^https:\/\/realty\.yandex\.ru\/manifest\.json/,
    /^https:\/\/analytics\.twitter\.com/,
    /^https:\/\/platform\.twitter\.com/,
    /^https:\/\/www\.facebook\.com/,
    /^https:\/\/yandex\.ru\/set\/s\/rsya-tag-users/,
    /^https:\/\/www\.googleadservices\.com/,
    /^https:\/\/googleads\.g\.doubleclick\.net/,
    /^https:\/\/wcm\.solution\.weborama\.fr/,
    /^https:\/\/connect\.facebook\.net/,
    /^https:\/\/.+\.criteo\.[^.]+\//,
    /\.ico$/,
    /^https:\/\/yastatic\.net\/s3\/vertis-frontend/,
    /^https:\/\/ads\.adfox\.ru/,
    /^https:\/\/an\.yandex\.ru\/partner-code-bundles/,
    /^https:\/\/yastatic\.net\/pcode\/adfox\/loader\.js/,
    /^https:\/\/awaps\.yandex\.net/,
    /^https:\/\/google-analytics\.com/,
    /^https:\/\/unpkg\.com/,
    /^https:\/\/yastatic\.net\/realty2\/_\/fCbpL9c4MT8kkdZmRcV0QC80VNw\.png/,
    /^https:\/\/yastatic\.net\/q\/set\/s\/rsya-tag-users/,
    /^https:\/\/an\.yandex\.ru/,
    /^https:\/\/static-mon\.yandex\.net/,
    /^https:\/\/www\.googletagmanager\.com/,
    /^https:\/\/static\.ads-twitter\.com/,
    /^https:\/\/.+\.mail\.ru\//
];

const whiteList = [
    /^https:\/\/ysa-static\.passport\.yandex\.ru/
];

class Robot {
    constructor() {
        return this.init();
    }

    async init() {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--disable-infobars',
                '--js-flags="--max-old-space-size=500"'
            ],
            ignoreHTTPSErrors: true
        });

        // Используем стартовую вкладку, если есть.
        const allPages = await browser.pages();
        const mainPage = allPages[0] || await browser.newPage();

        const waitAndClick = async selector => {
            // Если использовать ElementHandle, возвращаемый из waitForSelector,
            // await (await page.waitForSelector(selector)).click();
            // можно столкнуться с ошибкой "Error: Node is detached from document",
            // поэтому пользуемся mainPage.click(selector).
            await mainPage.waitForSelector(selector)
            await mainPage.click(selector);
        }

        // CSS фикс, устойчивый к перезагрузкам.
        await mainPage.evaluateOnNewDocument(() => {
            (function fix() {
                if(!document.head) {
                    setTimeout(fix, 100);
                } else {
                    document.getElementById('f1xed') || document.head.insertAdjacentHTML('beforeend', (
                        '<style id="f1xed">' +
                        '.subscription-wizard, .popup__under_type_paranja, .lg-cc' +
                        '{ display: none !important }' +
                        '</style>'
                    ));
                }
            })();
        });

        await mainPage.bringToFront();
        await mainPage.goto('https://realty.yandex.ru/', {
            waitUntil: 'domcontentloaded'
        });

        // Фильтруем траффик для экономии денег.
        await mainPage.setRequestInterception(true);

        mainPage.on('request', request => {
            const url = request.url();

            if(blackList.some(re => re.test(url))) {
                request.abort();
            } else if(whiteList.some(re => re.test(url))) {
                request.continue();
            } else if(['image', 'font'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        // Переходим по ссылке "Аренда" в меню.
        await utils.waitAndClick(mainPage, selectors.rentalMenuItem);

        // Любая выдача заканчивается на 20й странице, поэтому загрузить все сразу нельзя.
        // Получаем список регионов из поисковых фильтров, чтобы загружать выдачу частями.
        await utils.waitAndClick(mainPage, selectors.extraFilters);
        await utils.waitAndClick(mainPage, selectors.districtsPopupOpenButton);
        await mainPage.waitForSelector(selectors.regionsContainer);

        const regions = await mainPage.$eval(selectors.regionsContainer, elem => {
            const data = JSON.parse(elem.dataset.bem);
            const regions = data['b-geoselector-refinement']['regionData']['sub-localities'];

            return regions.map(item => item.id);
        });

        this.browser = browser;
        this.mainPage = mainPage;
        this.regions = shuffle(regions);

        return this;
    }

    async stop() {
        return await this.browser.close();
    }

    async * offers() {
        const { browser, mainPage, regions } = this;

        const neverend = function * (arr) {
            for(let i = 0; true; i = (i + 1) % arr.length) {
                yield arr[i];
            }
        }

        const waitNewOffers = async () => {
            const timer = (limit) => {
                const start = Date.now();
                return () => {
                    return Date.now() - start > limit;
                }
            }
            const sleep = async (ms) => {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            const get1stLinkHref = async () => {
                try {
                    return await mainPage.$eval(selectors.offerLinks, link => link.href);
                } catch(e) {
                    return null;
                }
            }
            const getAllLinksHref = async () => {
                try {
                    return await mainPage.$$eval(selectors.offerLinks, links => links.map(link => link.href));
                } catch(e) {
                    return [];
                }
            }
            const whatWasBefore = await get1stLinkHref();
            const timeout = timer(20000);

            while(await get1stLinkHref() === whatWasBefore) {
                await sleep(100);
                if(timeout()) {
                    throw new Error('Timeout');
                }
            }

            return await getAllLinksHref();
        }

        for (const region of neverend(regions)) {
            // Считаем, что больше 20 страниц это аномалия.
            for (const pageNumber of range(20)) {
                const newOffersWaiter = waitNewOffers(); // Вызывается до загрузки следующего серпа.
                const nextSerpUrl = (
                    `https://realty.yandex.ru/moskva/snyat/kvartira/` +
                    `?hasAgentFee=NO&sort=DATE_DESC&subLocality=${region}&page=${pageNumber}`);

                await mainPage.goto(nextSerpUrl, {
                    waitUntil: 'domcontentloaded'
                });

                let newOffers;
                try {
                    newOffers = await newOffersWaiter;
                } catch(e) {
                    break; // Выдача пустая, загружаем следующий регион.
                }

                for(const href of newOffers) {
                    const offerPage = await browser.newPage();

                    await offerPage.goto(href, {
                        waitUntil: 'domcontentloaded'
                    });

                    await utils.waitAndClick(offerPage, selectors.phonesButton);
                    await offerPage.waitForSelector(selectors.infoModal);

                    const data = await offerPage.evaluate(({
                        address,
                        roomsCount,
                        isStudio,
                        totalArea,
                        floor,
                        description,
                        price,
                        phones,
                        authorNote,
                        redirectPhone,
                    }) => {
                        const roomsCountElem = document.querySelector(roomsCount);
                        const isStudioElem = document.querySelector(isStudio);
                        const totalAreaElem = document.querySelector(totalArea);
                        const phonesElem = document.querySelector(phones);
                        const redirectPhoneElem = document.querySelector(redirectPhone);
                        const authorNoteElem = document.querySelector(authorNote);

                        return {
                            status: 'active',
                            url: location.href,
                            oid: location.pathname.match(/\/offer\/([^/]+)\//)[1],
                            address: document.querySelector(address).textContent,
                            roomsCount: roomsCountElem ? roomsCountElem.textContent : isStudioElem ? 0 : null,
                            totalArea: totalAreaElem ? totalAreaElem.textContent : null,
                            floor: floor ? floor.textContent : null,
                            photos: null,
                            timestamp: Date.now(),
                            description: description ? description.textContent : null,
                            price: price ? price.textContent : null,
                            phone: phonesElem ? phonesElem.textContent : null,
                            isFakePhone: redirectPhoneElem ? true : false,
                            isAgent: authorNoteElem ? /агент/.test(authorNoteElem.textContent) : null,
                        }
                    }, selectors);

                    Object.assign(data, {
                        sid: 'realty'
                    });

                    // await offerPage.close();

                    yield data;
                }
            }
        }
    }
}

async function postOffer(offer) {
    await fetch(`${config.get('api.url')}/offer`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ offers: [offer] })
    })
    .catch(err => {
        console.log('ОШИБКА');
        console.log(offer);
        console.log(err);
    });
}

async function run() {
    const robot = await new Robot();

    for await (const offer of robot.offers()) {
        await postOffer(offer);
        console.log('===========================');
        console.log(offer);
        console.log('===========================');
        return;
    }
}

module.exports = run;
