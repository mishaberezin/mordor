const omit = require('lodash/omit');
const pick = require('lodash/pick');
const assert = require('assert').strict;
const { Schema } = require('mongoose');
const {
    isSameDoc,
    mergeDocs } = require('../utils/merge');

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
        type: Array,
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

offerSchema.statics.absorb = async function(offer) {
    const offerModel = this;
    const data = omit(offer, '_id');
    const thisDoc = new offerModel(data);

    // 1. Looking for a baseDoc whith the same ID in DB.
    // 2. If nothing found, $setOnInsert adds thisDoc into DB.
    const baseDoc = await offerModel.findByIdAndUpdate(
        thisDoc.id, // 1
        { $setOnInsert: thisDoc.toObject() }, // 2
        { upsert: true } // 2
    ).exec();

    // 3. No baseDoc, $setOnInsert worked
    if(!baseDoc) {
        console.count('Новый');
        return;
    }
    // 4. If no difference found just return
    if(isSameDoc(thisDoc, baseDoc)) {
        console.count('Нет изменений');
        return;
    }

    const criteria = pick(baseDoc, ['_id', 'timestamp']);
    const combJson = mergeDocs(baseDoc, thisDoc);

    // 6. Trying to update baseDoc with baseDocs's timestamp included to be sure remote doc is still the same.
    const report = await offerModel.replaceOne(
        criteria,
        combJson
    ).exec();

    assert(report.nModified, 'Remote doc wasnt updated');
    console.count('Обновили');

    return;
}

offerSchema.pre('save', function() {
    return Promise.reject('Use offerSchema.absorb()');
});

module.exports = offerSchema;
