const omit = require('lodash/omit');
const assert = require('assert').strict;
const { Schema } = require('mongoose');
const { mergeDocs } = require('../utils/merge');

// Rules:
// 1. All keys must have a default value. Universal default value is null.
// 2. Rename or remove keys only with appropriate DB migration.
//    Any doc's revision should be consistent with the current state of schema.
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
    totalArea: {
        type: Number,
        default: null
    },
    roomsCount: {
        type: Number,
        default: null
    },
    metro: {
        type: String,
        default: null
    },
    photos: {
        type: Array,
        default: null
    },
    history: {
        type: Object,
        default: null
    },
    floor: {
        type: Number,
        default: null
    },
    description: {
        type: String,
        default: null
    },
    price: {
        type: Number,
        default: null
    },
    phone: {
        type: String,
        default: null
    },
    isAgent: {
        type: Boolean,
        default: null
    },
    address: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: null
    }
}, {
    strict: 'throw',
    versionKey: false, // https://tinyurl.com/ybt5a9rw
});

offerSchema.methods.updateOffer = async function() {
    const thisDoc = this;
    const offerModel = thisDoc.constructor;
    const id = thisDoc.sid + '_' + thisDoc.oid;

    // 1. Looking for a baseDoc whith the same ID in DB.
    // 2. If nothing found, $setOnInsert adds thisDoc into DB.
    const baseDoc = await offerModel.findByIdAndUpdate(
        id, // 1
        { $setOnInsert: omit(thisDoc.toObject(), '_id') }, // 2
        { upsert: true } // 2
    ).exec();

    // 3. Didn't find baseDoc so just return thisDoc
    if(!baseDoc) {
        return thisDoc; // TODO: thisDoc возвращать некорректно
    }

    // 4. Calc a difference between baseDoc and thisDoc
    const { noChange, dbUpdate } = mergeDocs(baseDoc, thisDoc);

    // 5. If no difference found just return baseDoc
    if(noChange) {
        return baseDoc;
    }

    // 6. Trying to update baseDoc with baseDocs's timestamp included to be sure remote doc is still the same.
    const combDoc = await offerModel.findOneAndUpdate(
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

offerSchema.pre('save', function() {
    return Promise.reject('Use offerSchema.updateOffer');
});

module.exports = offerSchema;
