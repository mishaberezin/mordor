const omit = require('lodash/omit');
const pick = require('lodash/pick');
const assert = require('assert').strict;
const { Schema } = require('mongoose');
const { update } = require('../utils/update');

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
    createdAt: {
        type: Date,
        default: function() {
            return new Date();
        }
    },
    checkedAt: {
        type: Date,
        default: function() {
            return this.createdAt;
        }
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

offerSchema.methods.updateTo = function(atopDoc) {
    const baseDoc = this;
    const maskedKeys = [ '_id', 'sid', 'oid', 'createdAt', 'checkedAt' ];
    const baseJson = baseDoc.toObject();
    const atopJson = atopDoc.toObject();
    const combJson = update(baseJson, atopJson, { maskedKeys });

    baseDoc.set(combJson);
    baseDoc.set('checkedAt', new Date());
}

offerSchema.statics.absorb = async function(rawData) {
    const Model = this;
    const data = omit(rawData, [ '_id', 'createdAt', 'checkedAt' ]);
    const atopDoc = new Model(data);
    const baseDoc = await Model.findById(atopDoc.id);

    if(baseDoc) {
        baseDoc.updateTo(atopDoc);
        await baseDoc.save();
    } else {
        await atopDoc.save();
    }
}

module.exports = offerSchema;
