const get = require('lodash/get');
const Geocoder = require('multi-geocoder');
const geocoder = new Geocoder({ provider: 'yandex-cache', coordorder: 'latlong' });
const provider = geocoder.getProvider();

provider.getText = offer => offer.addressRaw;

module.exports = async offers => {     
    return geocoder.geocode(offers)
        .then(({result: { features }}) => {
            return offers.map((offer, i) => {
                if(!features[i]) {
                    console.log('Не нашли! ' + i);
                    console.log(offer.addressRaw);
                }

                return Object.assign({}, offer, {
                    address: get(features[i], 'properties.name', null),
                    addressMeta: {
                        origin: offer.addressRaw,
                        normal: get(features[i], 'properties.name', null),
                        meta: features[i] || {}
                    }
                });
            });
        })
        .catch(console.error);
}
