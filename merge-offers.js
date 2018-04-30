module.exports = data => {
    return new Promise(resolve => {
        const obj = data.reduce((res, offer) => {
            const key = `${offer.phone}-${offer.address}`.replace(/\s/g, '-');

            // if (res[key]) {
                // offer.double = true;
            // } else {
                // res[key] = [];
            // }

            res[key] = offer;

            // res[key].push(offer);

            return res;
        }, {});

        return resolve([].concat.apply([], Object.values(obj)));
    });
};
