const config = require('config');
const mongoose = require('mongoose');

mongoose.connect(config.get('db.url'), {
    useNewUrlParser: true,
    useFindAndModify: false,
    autoIndex: false
});

mongoose.connection
    .on('open', () => {
        console.log('MongoDB connection established');
    })
    .on('error', error => {
        console.log(`MongoDB connection failed: ${error.message}`);
        mongoose.connection.close();
    })
    .on('disconnected', function(){
        console.log('MongoDB disconnected');
    })
    .on('reconnected', function(){
        console.log('MongoDB reconnected');
    })
    .on('reconnectFailed', function(){
        console.log('MongoDB reconnection failed');
    });

process.on('SIGINT', function(){
    mongoose.connection.close(function(){
        process.exit(0);
    });
});

const offerSchema = require('./schema/offer');
const Offer = mongoose.model('Offer', offerSchema);

const failedOfferSchema = offerSchema.clone();
failedOfferSchema.set('strict', false);
const FailedOffer = mongoose.model('FailedOffer', failedOfferSchema);

const PostOffer = mongoose.model('PostOffer', offerSchema);

const placeSchema = require('./schema/place');
const PlaceModel = mongoose.model('Place', placeSchema);

const rawOfferSchema = require('./schema/rawOffer');
const RawOffer = mongoose.model('RawOffer', rawOfferSchema);

const updateOffer = async (offer) => {
    return await Offer.absorb(offer);
}

const getOffers = async filter => {
    return Offer.find(filter).lean();
}

const addRawOffers = async (offers = []) => {
    return offers.length ? RawOffer.insertMany(offers, {
        ordered: false, // Не падать на первой ошибке https://tinyurl.com/ybo4b333
        rawResult: true
    })
    .then(result => {
        if(result.mongoose.validationErrors.length > 0) {
            return Promise.reject(result.mongoose.validationErrors)
        }
    }) : Promise.resolve();
}

const addFailedOffers = async (offers = []) => {
    const insertedDocs = await FailedOffer.insertMany(offers, {
        ordered: false
    });

    if(insertedDocs.length < offers.length) {
        console.error('Some FailedOffers wasnt saved');
    }
}

const getRawOffers = async (
    filter = {},
    options = {
        limit: 5000
    }
) => {
    return await RawOffer.find(filter, null, options).lean().exec();
};

const clearRawOffers = async (offers) => {
    const ids = offers.map(offer => offer._id);
    await RawOffer.deleteMany({ _id: { $in: ids }}).exec();
}

const clearPostOffers = async (filter = {}) => {
    return PostOffer.deleteMany(filter);
}

const addPostOffers = async offers => {
    return Promise.all(offers.map(async offer => {
        offer.published = false;
        offer._id = undefined;
        const Offer = new PostOffer(offer);

        return Offer.save();
    })).then(res => res.filter(Boolean));
}

const addPlaces = async places => {
    return Promise.all(places.map(async place => {
        const Place = new PlaceModel(place);

        return Place.save();
    })).then(res => res.filter(Boolean));
}

const getPlaces = async filter => {
return PlaceModel.find(filter);
}

const getPostOffers = async filter => {
    return PostOffer.find(filter).lean();
}

module.exports = {
    getOffers,
    updateOffer,
    clearRawOffers,
    clearPostOffers,
    addPostOffers,
    addPlaces,
    getPlaces,
    addRawOffers,
    addFailedOffers,
    getRawOffers,
    getPostOffers,
};
