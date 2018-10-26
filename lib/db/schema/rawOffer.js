const { Schema } = require('mongoose');

module.exports = new Schema({
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
    addressRaw: String,
}, {
    strict: 'throw',
    minimize: false,
    versionKey: false, // https://tinyurl.com/ybt5a9rw
});
