const MultiGeocoder = require('multi-geocoder');
const geocoder = new MultiGeocoder({ provider: 'yandex-cache', coordorder: 'latlong' });

module.exports = data => {
    const addresses = data.map(a => a.addressRaw);

    return new Promise(resolve => {
        geocoder.geocode(addresses)
            .then(res => {
                resolve(data.map((o, i) => {
                    o.address = res.result.features[i].properties.name;

                    return o;
                }));
            });
    })
}
