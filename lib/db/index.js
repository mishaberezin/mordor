// Набор хелперов для работы с базой
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27018/apt-finder');

const OfferSchema = require('./models/offer');
const OfferModel = mongoose.model('Offer', OfferSchema);

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
    }
}
