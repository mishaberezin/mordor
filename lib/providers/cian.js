const fs = require('fs');
const fetch = require('node-fetch');

function getData(page, result) {

    console.log(`#${page}`);

    return new Promise(resolve => {
        doRequest(page)
            .then(parsed => {
                // if (parsed.length < 5) {
                if (page === 5) {
                    resolve([...result, ...parsed]);
                } else {
                    return resolve(new Promise(resolveTimeout => {
                        setTimeout(() => {
                            resolveTimeout(getData(page + 1, [...result, ...parsed]));
                        }, 2000);
                    }));
                }
            });
    })
};

function doRequest(page) {
    return fetch('https://api.cian.ru/search-offers/v1/search-offers-desktop/', {
        method: 'POST',
        headers: {
            'Cookie': '_CIAN_GK=b79afea9-daa9-430e-ac68-781fac509952; anonymous_id=b79afea9-daa9-430e-ac68-781fac509952; _ym_uid=1524501224946151998; _ga=GA1.2.581858944.1524501224; _gid=GA1.2.1390597137.1524501224; _ym_isad=2; cto_lwid=43a6f455-4322-47a3-859f-d14c3880d4a9; render_header_login_motivation_popup=false; session_main_town_region_id=1; session_region_id=1; __gads=ID=7270e5dbab54de52:T=1524501704:S=ALNI_MY1cxyXTv-PC6LDOuZUoM7gLcDKQw; isSaveTooltipHidden=1; rrpvid=357577020009547; rcuid=5ade0e42709e190001e83082; rrlpuid=; rrsmf=1; _ym_visorc_67132=w; _ym_visorc_34229100=b; ntvt=1; _ym_visorc_29402190=w; did_see_mobile_map_pins=1; serp_view_mode=list; hide_onboarding=1; _dc_gtm_UA-30374201-1=1; _gat_UA-30374201-1=1'
        },
        body: JSON.stringify({
            "jsonQuery": {
                "commission_type": {
                    "type":"term",
                    "value":0
                },
                "_type":"flatrent",
                "room": {
                    "type":"terms",
                    "value":[1,2,3,4,5,6,9]
                },
                "for_day": {
                    "type":"term",
                    "value":"!1"
                },

                "maxprice": {
                    "type": "range",
                    "value": {"lte": 100000}
                },
                "publish_period": {
                    "type":"term",
                    "value": 864000
                },

                "region":{
                    "type":"terms",
                    "value":[1]
                },
                "engine_version": {
                    "type":"term",
                    "value":2
                },
                "wp":{
                    "type":"term",
                    "value":true
                },
                "page":{
                    "type":"term",
                    "value": page
                },
                "debug":{
                    "type":"term",
                    "value":1
                },
                "sort": {
                    "type":"term",
                    "value":"added"
                }
            }
        })
    })
        .then(res => res.json())
        .then(body => {
            return body.data.offersSerialized
                .map((i, o) => {
                    let {
                        description, bargainTerms: { priceRur },
                        phones, fullUrl, addedTimestamp, added,
                        id, user, photos, totalArea, roomsCount
                    } = i;

                    return {
                        serviceName: 'cian',
                        serviceId: id,
                        totalArea,
                        roomsCount,
                        metro: Object(i.geo.undergrounds.filter(u => u.isDefault)[0]).fullName,
                        photos: photos.slice(0, 10).map(p => p.fullUrl),
                        addedTimestamp: addedTimestamp,
                        parsedTimestamp: Date.now()/1000,
                        description,
                        price: priceRur,
                        phone: `${phones[0].countryCode}${phones[0].number}`,
                        url: fullUrl,
                        isAgent: user.isAgent,
                        addressRaw: i.geo.address
                        .filter(a => a.geoType !== 'district' && a.geoType !== 'underground')
                        .map(a => a.name).join(' ')
                    };
                }).filter(o => o.price < 70000).slice(0, 1)
        })
}

module.exports = () => getData(1, []);

