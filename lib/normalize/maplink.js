module.exports = offer => {
    const {address: {meta: {geometry: {coordinates}}}} = offer;
    const maplink = `https://static-maps.yandex.ru/1.x/?l=map&ll=${coordinates[1]},${coordinates[0]}&pt=${coordinates[1]},${coordinates[0]},home&z=13&size=600,450`;

    return Object.assign(offer, {
        photos: [
            offer.photos[0],
            maplink,
            ...offer.photos.slice(1)
        ],
        maplink
    });
}
