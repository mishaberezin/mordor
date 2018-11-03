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
    published: Boolean,
    totalArea: Number,
    roomsCount: Number,
    metro: String,
    photos: {
        type: Array,
        required: true
    },
    history: Object, // TODO обязательное field timestamp
    geodata: Object,
    floor: String,
    maplink: String,
    description: String,
    price: {
        type: Number,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    isAgent: Boolean,
    addressRaw: String,
    address: String,
    addressMeta: Object,
    uniqueKey: String,
    status: {
        type: String,
        enum: ['active', 'closed']
    }
}, {
    strict: 'throw',
    minimize: false,
    versionKey: false, // https://tinyurl.com/ybt5a9rw
});

offerSchema.methods.updateOffer = async function() {
    const thisDoc = this;
    const model = thisDoc.constructor;

    // 1. Firstly looking for a doc whith the same ID in DB.
    // 2. If nothing found, $setOnInsert works, so we just insert thisDoc into DB.
    // 3. If baseDoc exists combine it with thisDoc to preserve full history and update.
    // 4. Include baseDocs's timestamp field to guarantie remote doc is still the same.

    return await model.findByIdAndUpdate(thisDoc.id, { // 1
        $setOnInsert: thisDoc.toObject() // 2
    }, {
        upsert: true // 2
    })
    .exec()
    .then(baseDoc => {
        return baseDoc === null ? thisDoc : model.findOneAndUpdate(
            {
                _id: baseDoc.id,
                timestamp: baseDoc.timestamp // 4
            },
            mergeDocs(baseDoc, thisDoc).dbUpdate, // 3
            {
                new: true
            }
        )
        .exec();
    });
}

offerSchema.pre('save', function() {
    return Promise.reject('Use [updateOffer] method instead')
});

module.exports = offerSchema;
