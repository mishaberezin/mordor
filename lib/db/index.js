const config = require('config');
const mongoose = require('mongoose');

// mongoose.connect('mongodb://robot:e3fbocIK4pqvJzr7@206.189.9.70/apt-finder?authSource=admin', {
//     useNewUrlParser: true
// });

mongoose.connect('mongodb://robot:e3fbocIK4pqvJzr7@localhost/apt-finder?authSource=admin', {
    useNewUrlParser: true
});

mongoose.connection
    .once('open', () => {
        console.log('MongoDB connection established');
    })
    .on('error', error => {
        console.log(`ERROR (MongoDB): ${error.message}`);
    })

const OfferSchema = require('./models/offer');
const OfferModel = mongoose.model('Offer', OfferSchema);

const PostOfferModel = mongoose.model('PostOffer', OfferSchema);

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

    clearPostOffers: async (filter = {}) => {
        return PostOfferModel.deleteMany(filter);
    },

    addOffers: async offers => {
        return Promise.all(offers.map(async offer => {
            offer.published = false;
            offer._id = undefined;
            const Offer = new OfferModel(offer);

            return Offer.save();
        })).then(res => res.filter(Boolean));
    },

    addPostOffers: async offers => {
        return Promise.all(offers.map(async offer => {
            offer.published = false;
            offer._id = undefined;
            const Offer = new PostOfferModel(offer);

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

        
        return Promise.all(rawOffers.map(rawOffer => {

            console.log(rawOffer.url)
            
            const RawOffer = new RawOfferModel(rawOffer);

            return RawOffer.save();
        }))
        .then(res => {
            console.log('RESULT');
            console.log(res);
            
            res.filter(Boolean)
        })
        .catch(err => {
            console.log('=ERROR==========================');
            console.log(err);
            console.log('===========================');
        });
    },

    getRawOffers: async filter => {
        return RawOfferModel.find(filter).lean();
    },

    getPostOffers: async filter => {
        return PostOfferModel.find(filter).lean();
    }
};
