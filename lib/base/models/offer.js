const { Schema } = require('mongoose');

module.exports = new Schema({
    serviceName: {
        type: String,
        required: true
    },
    serviceId: {
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
        type: String,
        required: true
    },
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
    address: Object
});
