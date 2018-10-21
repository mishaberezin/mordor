const { Schema } = require('mongoose');

module.exports = new Schema({
    published: Boolean,
    offerId: {
        type: String,
        required: true
    },
    sourceId: {
        type: String,
        required: true
    },
    totalArea: Number,
    roomsCount: Number,
    metro: {
        type: String,
        required: false
    },
    photos: {
        type: Array,
        required: true
    },
    diff: Object,
    geodata: Object,
    addedTimestamp: Number,
    parsedTimestamp: {
        type: Number,
        required: true
    },
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
    status: String
});
