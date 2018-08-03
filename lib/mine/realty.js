const shuffle = require('lodash/shuffle');
const config = require('config');
const puppeteer = require('puppeteer');

const selectors = {
    loginButton: '.LoginButton',
    usernameInput: '.passport-Input input[name=login]',
    passwordInput: '.passport-Input input[name=passwd]',
    passportSubmitButton: '.passport-Domik-Form-Field button[type=submit]',
    notNowButton: '.request-phone_back-button button',

    heatMapsPopupCloseButton: '.heatmaps-popup__close-button',
    subscriptionWizardCloseButton: '.subscription-wizard__close-button',

    districtsPopupOpenButton: '.FiltersFormField__refinements-selector .Link:nth-child(2)',
    rentalMenuItem: '.NavMenuItem[href^="/moskva/snyat/kvartira/"]',
    extraFilters: '.FiltersFormField_section_extra .Link',

    regionsContainer: '.b-geoselector-refinement_type_sub-localities',

    offerLinks: '.serp-item__offer-link, .OffersSerpItem__generalInfo .OffersSerpItem__link',

    pagerNextArrow: '.Pager__next-arrow, .pager .icon_type_next',

    address: '.offer-card__address',
    roomsTotal: '.offer-card__feature_name_rooms-total .offer-card__feature-value'
}

class Robot {
    constructor(browser) {
        this.browser = browser;
    }

    onTargetCreated(target) {
        const page = target.page();
        
        if(!page) {
            return;
        }
    }

    onTargetChanged(target) {
        const page = target.page();
        
        if(!page) {
            return;
        }
    }

    async init() {
        const { browser } = this;
        
        browser.on('targetcreated', target => this.onTargetCreated(target));
        browser.on('targetchanged', target => this.onTargetChanged(target));
        
        const pages = await browser.pages();
        const page = pages[0] || await browser.newPage();
        const waitAndClick = async selector => {
            await (await page.waitForSelector(selector)).click();
        }
        
        await page.setViewport({ width: 1200, height: 700 });
        await page.bringToFront();
        await page.goto('https://realty.yandex.ru/', { waitUntil: 'domcontentloaded' });

        await page.evaluateOnNewDocument(() => {
            return new Promise((resolve, reject) => {
                // В evaluateOnNewDocument еще нет document.head
                const intervalId = setInterval(() => {
                    if(!document.head) {
                        return;
                    } else {
                        clearInterval(intervalId);
                    }
                    
                    if(document.getElementById('f1xed')) {
                        resolve();
                    } else {
                        document.head.insertAdjacentHTML('beforeend', [
                            '<style id="f1xed">',
                            '.subscription-wizard, .popup__under_type_paranja',
                            '{ display: none; }',
                            '</style>'
                        ].join('\n'));
                        
                        resolve();
                    } 
                }, 100);
            });
        });

        await waitAndClick(selectors.loginButton);
        await waitAndClick(selectors.usernameInput);
        await page.keyboard.type(config.get('realty.username'), { delay: 30 });
        await waitAndClick(selectors.passwordInput);
        await page.keyboard.type(config.get('realty.password'), { delay: 30 });
        await waitAndClick(selectors.passportSubmitButton);

        // Если появится баннер с просьбой добавить телефон.
        try {
            await page.waitForSelector(selectors.notNowButton, { timeout: 5000 });
            await page.click(selectors.notNowButton);
        } catch(e) {}

        // Переходим по ссылке "Аренда" в меню.
        await waitAndClick(selectors.rentalMenuItem);

        // Открываем попап с фильтрами.
        await waitAndClick(selectors.extraFilters);
        await waitAndClick(selectors.districtsPopupOpenButton);

        await page.waitForSelector(selectors.regionsContainer);

        const regions = await page.$eval(selectors.regionsContainer, elem => {
            const data = JSON.parse(elem.dataset.bem);
            const regions = data['b-geoselector-refinement']['regionData']['sub-localities'];
    
            return regions.map(item => item.id);
        });
        
        this.page = page;
        this.regions = shuffle(regions);
        this._inited = true;

        return this;
    }

    async * offers() {
        this._inited || await this.init();
        
        const { browser, page, regions } = this;

        const serpUrl = ({ region }) => {
            return `https://realty.yandex.ru/moskva/snyat/kvartira/?hasAgentFee=NO&sort=DATE_DESC&subLocality=${region}`;
        }

        const neverend = function * (arr) {
            for(let i = 0; true; i = (i + 1) % arr.length) {
                yield arr[i];
            }
        }

        const waitForPage = async (checker) => {
            return new Promise(resolve => browser.on('targetcreated', function fn(target) {
                if(target.type() === 'page' && checker(target.url())) {
                    browser.off('targetcreated', fn);
                    resolve(target.page());
                }
            }));
        }

        const waitForOffers = async () => {
            const sleep = async (ms) => {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            const get1stUrl = async () => {
                try {
                    return await page.$eval(selectors.offerLinks, link => link.href);
                } catch(e) {
                    return null;
                }
            }
            const beforeUrl = await get1stUrl();

            do {
                await sleep(100);
            } while(await get1stUrl() === beforeUrl)

            return await page.$$(selectors.offerLinks);
        }

        let counter = 0;

        for (const region of neverend(regions)) {

            let nextPageButton;

            while (nextPageButton !== null) {
                
                const offersWaiter = waitForOffers();
                
                if(nextPageButton) {
                    await page.bringToFront();
                    await nextPageButton.click();
                } else {
                    await page.goto(serpUrl({ region }), { waitUntil: 'domcontentloaded' });
                }
                
                const offers = await offersWaiter;

                for(const offer of offers.slice(0, 5)) {
                    await page.bringToFront();

                    const href = await (await offer.getProperty('href')).jsonValue();
                    const pageWaiter = waitForPage(url => url === href);

                    await offer.click();
                    await offer.dispose();

                    const offerPage = await pageWaiter;

                    yield offerPage;
                }

                nextPageButton = await page.$(selectors.pagerNextArrow);
            }
        }
    }
}

async function run() {
    const browser = await puppeteer.launch({
        headless: false
    });

    const robot = new Robot(browser);

    for await (const offer of robot.offers()) {
        await offer.waitForSelector(selectors.address);
        await offer.waitForSelector(selectors.roomsTotal);``

        const data = await offer.evaluate(([ address, roomsTotal ]) => {
            return {
                address: document.querySelector(address).textContent,
                roomsTotal: document.querySelector(roomsTotal).textContent
            }
        }, [
            selectors.address,
            selectors.roomsTotal
        ])


        console.log('🏠: \n');
        console.dir(data);
        await offer.close();
    }
}

module.exports = run;