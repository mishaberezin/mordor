const { Schema } = require('mongoose');

const rawOfferSchema = new Schema({
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
    url: {
        type: String,
        required: true
    },
    parsedTimestamp: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        required: true
    },
    totalArea: String,
    roomsCount: String,
    floor: String,
    metro: String,
    photos: Array,
    description: String,
    price: String,
    phone: String,
    isFakePhone: Boolean,
    isAgent: Boolean,
    address: String,
}, {
    strict: 'throw',
    minimize: false,
    versionKey: false, // https://tinyurl.com/ybt5a9rw
});

rawOfferSchema.pre('init', offer => {
    Object.keys(offer).forEach(key => {
        if(Object.is(offer[key], null)) {
            delete offer[key];
        }
    });
});

module.exports = rawOfferSchema;
