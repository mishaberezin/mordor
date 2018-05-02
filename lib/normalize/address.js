const MultiGeocoder = require('multi-geocoder');
const geocoder = new MultiGeocoder({ provider: 'yandex-cache', coordorder: 'latlong' });
const provider = geocoder.getProvider();

provider.getText = function (offer) {
    return offer.addressRaw;
};

module.exports = offers => geocoder.geocode(offers)
    .then(({ result: { features } }) => {
        offers.forEach((offer, i) => offer.address = {
            origin: offer.addressRaw,
            normal: features[i].properties.name,
            meta: features[i]
        });
        return offers;
    });
