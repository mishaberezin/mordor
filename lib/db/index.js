const mongoose = require('mongoose');

// mongoose.connect('mongodb://robot:e3fbocIK4pqvJzr7@206.189.9.70/aptfinder', {
//     useNewUrlParser: true
// });
mongoose.connect('mongodb://localhost:27017/aptfinder', {
    useNewUrlParser: true
});

const OfferSchema = require('./models/offer');
const OfferModel = mongoose.model('Offer', OfferSchema);

const PlaceSchema = require('./models/place');
const PlaceModel = mongoose.model('Place', PlaceSchema);

const RawOfferSchema = require('./models/rawOffer');
const RawOfferModel = mongoose.model('RawOffer', RawOfferSchema);

module.exports = {
    getOffers: async filter => {
        return OfferModel.find(filter).lean();
    },

    updateOffers: async updates => {
        return Promise.all(updates.map(async ({filter, patch}) => {
            return OfferModel.update(filter, patch);
        }));
    },

    clearRawOffers: async () => {
        return RawOfferModel.deleteMany({});
    },

    addOffers: async offers => {
        return Promise.all(offers.map(async offer => {
            offer.published = false;
            offer._id = undefined;
            const Offer = new OfferModel(offer);

            return Offer.save();
        })).then(res => res.filter(Boolean));
    },

    addPlaces: async places => {
        return Promise.all(places.map(async place => {
            const Place = new PlaceModel(place);

            return Place.save();
        })).then(res => res.filter(Boolean));
    },

    getPlaces: async filter => {
        return PlaceModel.find(filter);
    },

    addRawOffers: async rawOffers => {
        return Promise.all(rawOffers.map(async rawOffer => {
            const RawOffer = new RawOfferModel(rawOffer);

            return RawOffer.save();
        })).then(res => res.filter(Boolean));
    },

    getRawOffers: async filter => {
        return RawOfferModel.find(filter).lean();
    }
};
