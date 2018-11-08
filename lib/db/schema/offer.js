const assert = require('assert').strict;
const { Schema } = require('mongoose');
const { mergeDocs } = require('../utils/merge');

const offerSchema = new Schema({
    _id: {
        type: String,
        default: function() {
            return this.sid + '_' + this.oid;
        }
    },
    sid: {
        type: String,
        required: true
    },
    oid: {
        type: String,
        required: true
    },
    timestamp: {
        type: Number,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    totalArea: Number,
    roomsCount: Number,
    metro: String,
    photos: Array,
    history: {  // TODO обязательное field timestamp
        type: Object,
        default: undefined
    },
    floor: Number,
    description: String,
    price: Number,
    phone: String,
    isAgent: Boolean,
    address: String,
    status: {
        type: String,
        enum: ['active', 'closed']
    }
}, {
    strict: 'throw',
    versionKey: false, // https://tinyurl.com/ybt5a9rw
});

offerSchema.methods.updateOffer = async function() {
    const thisDoc = this;
    const model = thisDoc.constructor;

    // 1. Looking for a baseDoc whith the same ID in DB.
    // 2. If nothing found, $setOnInsert adds thisDoc into DB.
    const baseDoc = await model.findByIdAndUpdate(
        thisDoc.id, // 1
        { $setOnInsert: thisDoc.toObject() }, // 2
        { upsert: true } // 2
    ).exec();

    // 3. Didn't find baseDoc so just return thisDoc
    if(!baseDoc) {
        return thisDoc;
    }

    // 4. Calc a difference between baseDoc and thisDoc
    const dbUpdate = mergeDocs(baseDoc, thisDoc).dbUpdate;
    const updateIsEmpty = Object.keys(dbUpdate).length === 0;

    // 5. If no difference found just return baseDoc
    if(updateIsEmpty) {
        return baseDoc;
    }

    // 6. Trying to update baseDoc with baseDocs's timestamp included to be sure remote doc is still the same.
    const combDoc = await model.findOneAndUpdate(
        {
            _id: baseDoc.id,
            timestamp: baseDoc.timestamp // ←
        },
        dbUpdate, // ←
        { new: true }
    ).exec();

    assert(combDoc, 'Remote doc was updated during processing');

    return combDoc;
}

// Null values conflicts with history schema.
// TODO think about less restrictive history schema.
offerSchema.pre('init', offer => {

    return;
    Object.keys(offer).forEach(key => {
        if(Object.is(offer[key], null)) {
            //delete offer[key];
        }
    });
});

offerSchema.methods.removeNullFields = function() {
    const offer = this;

    Object.keys(offer).forEach(key => {
        if(Object.is(offer[key], null)) {
            delete offer[key];
        }
    });
};

offerSchema.queue('removeNullFields');

offerSchema.pre('save', function() {
    return Promise.reject('Use [updateOffer] method instead')
});

module.exports = offerSchema;
