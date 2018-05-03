// Набор хелперов для работы с базой
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27018/apt-finder');

const OfferSchema = require('./models/offer');
const OfferModel = mongoose.model('Offer', OfferSchema);

module.exports = {
    addOffers: async offers => {
        return Promise.all(offers.map(async offer => {
            const Offer = new OfferModel(offer);

            return Offer.save();
        }));
    }
}
