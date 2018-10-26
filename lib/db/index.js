const config = require('config');
const mongoose = require('mongoose');
const { mergeDocs } = require('./utils/merge');

mongoose.connect(config.get('db.url'), {
    useNewUrlParser: true,
    autoIndex: false,
});

mongoose.connection
    .once('open', () => {
        console.log('MongoDB connection established');
    })
    .on('error', error => {
        console.log(`ERROR (MongoDB): ${error.message}`);
    });

const offerSchema = require('./schema/offer');
const Offer = mongoose.model('Offer', offerSchema);

const PostOffer = mongoose.model('PostOffer', offerSchema);

const placeSchema = require('./schema/place');
const PlaceModel = mongoose.model('Place', placeSchema);

const rawOfferSchema = require('./schema/rawOffer');
const RawOffer = mongoose.model('RawOffer', rawOfferSchema);


const updateOffer = async (offer) => {
    const thisDoc = (new Offer(offer)).toObject();
    const remoteDoc = await Offer.findById(thisDoc._id).lean().exec();




    return;


    const mergedDoc = mergeDocs(remoteDoc, thisDoc);



    return Offer.save();
}

offerSchema.pre('save', async function() {
    const thisDoc = this.toObject();
    const model = this.constructor;
    const currDoc = await model.findById(thisDoc._id).lean().exec();
    const mergedDoc = mergeDocs(currDoc, thisDoc);

    return Promise.reject('Because!');
    return Promise.resolve();
});




const updateOffers = async (offers) => {
    [].concat(offers).forEach(updateOffer);
}

module.exports = {
    getOffers: async filter => {
        return Offer.find(filter).lean();
    },

    updateOffers: async updates => {
        return Promise.all(updates.map(async ({filter, patch}) => {
            return Offer.update(filter, patch);
        }));
    },

    clearRawOffers: async (filter = {}) => {
        return RawOffer.deleteMany(filter);
    },

    clearPostOffers: async (filter = {}) => {
        return PostOffer.deleteMany(filter);
    },

    addOffers: async offers => {
        return Promise.all([].concat(offers).map(async offer => {
            offer.published = false;
            const offerDoc = new Offer(offer);
            return offerDoc.save();
        })).then(res => res.filter(Boolean));
    },

    addPostOffers: async offers => {
        return Promise.all(offers.map(async offer => {
            offer.published = false;
            offer._id = undefined;
            const Offer = new PostOffer(offer);

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
        rawOffers = rawOffers.slice(0, 10);
        rawOffers[2].offerId = null;

        console.log('=rawOffers==========================');
        console.log(rawOffers.length);
        console.log(rawOffers.slice(0,3));
        console.log('===========================');

        return RawOffer.insertMany(rawOffers, {
            ordered: false, // https://tinyurl.com/ybo4b333
            rawResult: true
        })
        .then(result => {
            if(result.mongoose.validationErrors) {
                return Promise.reject(result.mongoose.validationErrors)
            }
        });
    },

    getRawOffers: async ({
        filter = {},
        limit = 5000
    }) => {
        return RawOffer.find(filter).limit(limit).lean();
    },

    getPostOffers: async filter => {
        return PostOffer.find(filter).lean();
    }
};
