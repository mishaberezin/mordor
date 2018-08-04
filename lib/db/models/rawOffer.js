const { Schema } = require('mongoose');

module.exports = new Schema({
    totalArea: {
        type: Number,
        required: false
    },
    roomsCount: {
        type: Number,
        required: false
    },
    floor: {
        type: Number,
        required: false
    },
    metro: {
        type: String,
        required: false
    },
    photos: {
        type: Array,
        required: false
    },
    parsedTimestamp: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    price: {
        type: Number,
        required: false
    },
    phone: {
        type: String,
        required: false
    },
    url: {
        type: String,
        required: true
    },
    isAgent: {
        type: Boolean,
        required: false
    },
    addressRaw: {
        type: String,
        required: false
    }
});

