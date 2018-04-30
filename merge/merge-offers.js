module.exports = data => {
    return new Promise(resolve => {
        const obj = data.reduce((res, offer) => {
            const key = `${offer.phone}-${offer.address}`.replace(/\s/g, '-');

            res[key] = offer;

            return res;
        }, {});

        return resolve([].concat.apply([], Object.values(obj)));
    });
};
