// Набор хелперов для работы с базой
const mongoose = require('mongoose');
mongoose.connect('mongodb://ddml:ZGRtbEBtb25nb2Ri@206.189.9.70/apt-finder');
// mongoose.connect('mongodb://localhost:27017/apt-finder');

const OfferSchema = require('./models/offer');
const OfferModel = mongoose.model('Offer', OfferSchema);

const PlaceSchema = require('./models/place');
const PlaceModel = mongoose.model('Place', PlaceSchema);

const RawOfferSchema = require('./models/rawOffer');
const RawOfferModel = mongoose.model('RawOffer', RawOfferSchema);

module.exports = {
    getOffers: async filter => {
        return OfferModel.find(filter);
    },

    updateOffers: async (filter, patch) => {
        return OfferModel.update(filter, patch);
    },

    addOffers: async offers => {
        return Promise.all(offers.map(async offer => {
            offer.published = false;
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
        return RawOfferModel.find(filter);
    }
};
