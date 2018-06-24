const config = require('config');
const puppeteer = require('puppeteer');

const selectors = {
    actionButton: '#header-user-login',
    usernameWrap: '.login-form-email',
    usernameInput: '.login-form-email login',
    passwordWrap: '.login-form-password',
    submitButton: '.login-form-enter'
}

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

async function grabPage(params) {
    return fetch('https://api.cian.ru/search-offers/v1/search-offers-desktop/', {
        method: 'POST',
        body: JSON.stringify(params)
    })
        .then(res => res.json())
        .then(({ data }) => {
            return data.offersSerialized
                .map((i, o) => {
                    let {
                        description, bargainTerms: { priceRur },
                        phones, fullUrl, addedTimestamp, added,
                        id, user, photos, totalArea, roomsCount
                    } = i;

                    return Object.assign(
                        i,
                        {
                            serviceName: 'cian',
                            serviceId: id,
                            totalArea,
                            roomsCount,
                            metro: Object(i.geo.undergrounds.filter(u => u.isDefault)[0]).fullName,
                            photos: photos.slice(0, 10).map(p => p.fullUrl),
                            addedTimestamp,
                            parsedTimestamp: Date.now() / 1000,
                            description,
                            price: priceRur,
                            phone: `${phones[0].countryCode}${phones[0].number}`,
                            url: fullUrl,
                            isAgent: user.isAgent,
                            addressRaw: (i.geo.address || [])
                            .filter(a => a.geoType !== 'district' && a.geoType !== 'underground')
                            .map(a => a.name).join(' ')
                        }
                    )

                })
                .filter(o => o.price < 70000)
        });
}

const getRequestParams = page => {
    return {
        jsonQuery: {
            commission_type: { type: 'term', value: 0 },
            _type: 'flatrent',
            room: { type: 'terms', value: [1, 2, 3, 4, 5, 6, 9] },
            for_day: { type: 'term', value: '!1' },
            price: { type: 'range', value: { lte: 70000 } },
            publish_period: { type: 'term', value: 864000 },
            region: { type: 'terms', value: [1] },
            engine_version: { type: 'term', value: 2 },
            page: { type: 'term', value: page },
            sort: { type: 'term', value: 'added' }
        }
    };
};

async function grab(page, depth = 99 ) {
    let res = [];

    for(let p = 1; p <= depth; p++) {
        let data = await page.evaluate(grabPage, getRequestParams(p))
        res = [...res, ...data];

        if (data.length <= 5) break;
    }

    return res;
}

async function run() {
    const browser = await puppeteer.launch({
        // headless: false
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 990, height: 600 });
    await page.bringToFront();
    await page.goto('https://www.cian.ru/', {waitUntil: 'networkidle2'});

    await page.click(selectors.actionButton);
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

    await page.goto('https://www.cian.ru/cat.php?currency=2&deal_type=rent&engine_version=2&is_by_homeowner=1&maxprice=70000&offer_type=flat&region=1&room1=1&room2=1&room3=1&room9=1&totime=86400&type=4');

    // await page.waitForNavigation({
        // waitUntil: 'networkidle0'
    // });

    const data = await grab(page, 1);
    console.log(data)
    // const data = await grab(page); // grab everything

    browser.close();

    return data;
}

module.exports = run;
