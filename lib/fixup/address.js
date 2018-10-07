const MultiGeocoder = require('multi-geocoder');
const geocoder = new MultiGeocoder({ provider: 'yandex-cache', coordorder: 'latlong' });
const provider = geocoder.getProvider();

provider.getText = function (offer) {
    return offer.addressRaw;
};

module.exports = async offers => geocoder.geocode(offers)
    .then(({ result: { features } }) => {
        
        
        return offers.map((offer, i) => {
            if(!features[i]) {
                console.log('Не нашли!');
                console.log(offer);

                return Object.assign({}, offer, {
                    address: null,
                    addressMeta: {
                        origin: offer.addressRaw,
                        normal: null,
                        meta: null
                    }
                })
            }
            
            
            return Object.assign({}, offer, {
                address: features[i].properties.name,
                addressMeta: {
                    origin: offer.addressRaw,
                    normal: features[i].properties.name,
                    meta: features[i]
                }
            })
        });
    })
    .catch(console.error);
