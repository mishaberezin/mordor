const puppeteer = require('puppeteer');
const range = require('lodash/range');
const shuffle = require('lodash/shuffle');
const config = require('config').get('realty');
const fetch = require('node-fetch');

const selectors = {
    loginButton: '.LoginButton',
    usernameInput: '.passport-Input input[name=login]',
    passwordInput: '.passport-Input input[name=passwd]',
    passportSubmitButton: '.passport-Domik-Form-Field button[type=submit]',
    notNowExtraPhoneButton: '.request-phone_back-button button',
    notNowExtraEmailButton: '.request-email_back-button .button2',

    heatMapsPopupCloseButton: '.heatmaps-popup__close-button',
    subscriptionWizardCloseButton: '.subscription-wizard__close-button',

    districtsPopupOpenButton: '.FiltersFormField__refinements-selector .Link:nth-child(2)',
    rentalMenuItem: '.NavMenuItem[href^="/moskva/snyat/kvartira/"]',
    extraFilters: '.FiltersFormField_section_extra .Link',

    regionsContainer: '.b-geoselector-refinement_type_sub-localities',

    offerLinks: '.serp-item__offer-link, .OffersSerpItem__generalInfo .OffersSerpItem__link',

    pagerNextArrow: '.Pager__next-arrow, .pager .icon_type_next',

    noOffersBanner: '.OffersSerpNotFound',

    address: '.offer-card__address',
    roomsCount: '.offer-card__feature_name_rooms-total .offer-card__feature-value',
    isStudio: '.offer-card__feature_name_studio .offer-card__feature-value',

}

class RealtyBot {
    constructor() {
        return this.init();
    }

    async init() {
        const browser = await puppeteer.launch({
            // headless: false,
            defaultViewport: null,
            args: [
                '--disable-infobars',
                '--js-flags="--max-old-space-size=500"'
            ],
            ignoreHTTPSErrors: true
        });

        // Используем стартовую вкладку, если есть
        const allPages = await browser.pages();
        const mainPage = allPages[0] || await browser.newPage();

        const waitAndClick = async selector => {
            // Если использовать ElementHandle, возвращаемый из waitForSelector,
            // await (await mainPage.waitForSelector(selector)).click();
            // иногда возникает ошибка "Error: Node is detached from document",
            // поэтому пользуемся mainPage.click(selector).
            await mainPage.waitForSelector(selector)
            await mainPage.click(selector);
        }

        // CSS фикс, устойчивый к перезагрузкам
        await mainPage.evaluateOnNewDocument(() => {
            (function fix() {
                if(!document.head) {
                    setTimeout(fix, 100);
                } else {
                    document.getElementById('f1xed') || document.head.insertAdjacentHTML('beforeend', [
                        '<style id="f1xed">',
                        '.subscription-wizard, .popup__under_type_paranja',
                        '{ display: none; }',
                        '</style>'
                    ].join('\n'));
                }
            })();
        });

        await mainPage.bringToFront();
        await mainPage.goto('https://realty.yandex.ru/', {
            waitUntil: 'domcontentloaded'
        });

        // Экономим траффик
        await mainPage.setRequestInterception(true);

        mainPage.on('request', request => {
            const requestUrl = new URL(request.url());
            const whiteList = ['ysa-static.passport.yandex.ru'];

            if(whiteList.includes(requestUrl.host)) {
                request.continue();
            } else if(['image', 'font'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        // Логинимся
        await waitAndClick(selectors.loginButton);
        await waitAndClick(selectors.usernameInput);
        await mainPage.keyboard.type(config.username, { delay: 30 });
        await waitAndClick(selectors.passwordInput);
        await mainPage.keyboard.type(config.password, { delay: 30 });
        
        const backToRealtyNavigationPromise = mainPage.waitForNavigation({
            timeout: 3000
        });

        await waitAndClick(selectors.passportSubmitButton);

        // Если паспортная форма зависла после отправки или появился баннер с просьбой добавить телефон,
        // то переход на realty.yandex.ru не сработает, но т.к. мы уже залогинились, форсим переход сами.
        await backToRealtyNavigationPromise.catch(() => mainPage.goto('https://realty.yandex.ru/', {
            waitUntil: 'domcontentloaded'
        }));

        // Переходим по ссылке "Аренда" в меню
        await waitAndClick(selectors.rentalMenuItem);

        // Выдача по всем объявлениям заканчивается на 20й странице )
        // поэтому объявления приходится загружать частями, пер риджион.
        // Список всех регионов получаем из поисковых фильтров.
        await waitAndClick(selectors.extraFilters);
        await waitAndClick(selectors.districtsPopupOpenButton);
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

    async * offers() {
        const { browser, mainPage, regions } = this;

        const neverend = function * (arr) {
            for(let i = 0; true; i = (i + 1) % arr.length) {
                yield arr[i];
            }
        }

        const getSerpUrl = (region, page) => {
            return `https://realty.yandex.ru/moskva/snyat/kvartira/` +
                `?hasAgentFee=NO&sort=DATE_DESC&subLocality=${region}&page=${page}`;
        }

        const waitNewOffers = async () => {
            const ts = Date.now();
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

            while(await get1stLinkHref() === whatWasBefore) {
                await sleep(100);
                if((Date.now() - ts) > 20000) {
                    throw new Error();
                }
            }

            return await getAllLinksHref();
        }

        for (const region of neverend(regions)) {
            // Больше 20 это какая-то аномалия
            for (const page of range(20)) {
                let newOffers;
                const newOffersWaiter = waitNewOffers();

                await mainPage.goto(getSerpUrl(region, page), {
                    waitUntil: 'domcontentloaded'
                });

                try {
                    newOffers = await newOffersWaiter;
                } catch(e) {
                    break;
                }

                for(const href of newOffers) {
                    const offerPage = await browser.newPage();

                    await offerPage.goto(href, {
                        waitUntil: 'domcontentloaded'
                    });

                    const data = await offerPage.evaluate(({ address, roomsCount, isStudio }) => {
                        const roomsCountElem = document.querySelector(roomsCount);
                        const isStudioElem = document.querySelector(isStudio);

                        return {
                            href: location.href,
                            address: document.querySelector(address).textContent,
                            roomsCount: roomsCountElem ? roomsCountElem.textContent : isStudioElem ? 0 : null,
                        }
                    }, selectors);

                    await offerPage.close();

                    yield data;
                }
            }
        }
    }
}

async function addOffer(offer) {
    await fetch('http://localhost:3000/offers/add', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers: [offer] })
    });
}

async function run() {
    const robot = await new RealtyBot();

    for await (const offer of robot.offers()) {
        await addOffer(offer);
        console.log('УРА!');
    }
}

module.exports = run;

