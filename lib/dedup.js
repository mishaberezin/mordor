const uniq = require('lodash/uniq');
const uniqBy = require('lodash/uniqBy');
const groupBy = require('lodash/groupBy');
const isEqual = require('lodash/isEqual');
const mergeWith = require('lodash/mergeWith');
const db = require('./db');

// const { isSimilarByPhotos } = require('compare/offers');
// Чтобы заработало, добавь "compare": "git+ssh://git@bitbucket.org/dedimolya/compare.git",

const removeByUniqueKey = offers => {
    return uniqBy(offers, 'uniqueKey');
};

const mergeOffers = (offers) => {
    let offer = offers[0];
    const diff = offer.diff ? {...offer.diff} : {};

    offers.slice(1).forEach(o => {
        if (offer.timestamp > o.timestamp) return;

        mergeWith(offer, o, (objValue, srcValue, key) => {
            if (key === '_id') return objValue;

            if (key === 'addressMeta' &&
                Object(offer.addressMeta).normal === Object(o.addressMeta).normal) return objValue;

            if (isEqual(objValue, srcValue) ||
                ['timestamp', 'diff'].includes(key)) return srcValue;

            if (diff[offer.timestamp]) {
                diff[offer.timestamp][key] = objValue;
            } else {
                diff[offer.timestamp] = {};
                diff[offer.timestamp][key] = objValue;
            }

            return srcValue;
        })
    });

    offer.diff = diff;

    return offer;
};

const dedup = async offers => {
    const add = [];
    const update = [];

    if (!offers.length) {
        return { add, update };
    }

    // Merging inside rawOffers
    // 1. By uniqueKey
    let offersByKey = Object.values(groupBy(offers, 'uniqueKey'));

    offers = offersByKey.reduce((acc, group) => {
        if (group.length === 1) {
            acc.push(group[0]);

            return acc;
        }

        group.sort((a, b) => a.timestamp > b.timestamp ? 1 : -1);

        acc.push(mergeOffers(group))

        return acc;
    }, []);

    // 2. By uniqueKey with database
    const dbOffers = await db.getOffers({
        $in: offers.map(({uniqueKey}) => ({uniqueKey}))
    });
    const dbOffersByKey = groupBy(dbOffers, 'uniqueKey');
    const dbOffersIds = uniq(dbOffers.map(({uniqueKey}) => uniqueKey));

    offers.forEach(o => {
        if (!dbOffersIds.includes(o.uniqueKey)) {
            return add.push(o);
        }

        update.push(mergeOffers([dbOffersByKey[o.uniqueKey], o]));
    });








    // 3. Working with `add`
    const extractAddress = (offer) => offer.address.normal;
    const dbOffersAddress = await db.getOffers({
        'address.normal': { $in: offers.map(extractAddress) }
    });
    const dbOffersByAddress = groupBy(dbOffersAddress, extractAddress);
    const dbOffersAddresses = uniq(dbOffersAddress.map(extractAddress));

    return Promise.all(offers.map((offer) => {
        if (!dbOffersAddresses.includes(extractAddress(offer))) {
            return Promise.resolve(add.push(offer));
        }

        const maxSimilarPhotos = 2;

        return Promise.all(dbOffersAddress.map(offerToCmpare =>
            isSimilarByPhotos(offerToCmpare, offer, maxSimilarPhotos)
                .then(isSimilar => {
                    if (isSimilar) {
                        add.push(offer);
                    } else {
                        update.push(mergeOffers([dbOffersByKey[extractAddress(offer)], offer]));
                    }
                    return Promise.resolve();
                })
        ));
    })).then(() => Promise.resolve({ add, update }));
    // This is where we de-duplicate
    // and merge offers from different sites
    //
    // Equal % 60
    // !Equal % 30
    //
    // 3.1 Same address
    // const offersByAddress = groupBy(add, 'address');

    // 3.2 Photos
    // offersByAddress.forEach(group => {
        // const offersToCompare = group.filter(o => o.photos.length);
    // });

    // 3.3 Room count +10/-10
    //
    // 3.4 Phone +20/0
    // 3.5 Price +5/0
    // 3.6 Floor +5/0
    // 3.7 Square +7/0

};

const comparePhotos = offers => {
    return 0;
};

module.exports = dedup;
