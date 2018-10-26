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
    history: [Object],
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

offerSchema.pre('save', async function() {
    const thisDoc = this.toObject();
    const model = this.constructor;
    const currDoc = await model.findById(thisDoc._id).lean().exec();
    const mergedDoc = mergeDocs(currDoc, thisDoc);

    return Promise.reject('Because!');
    return Promise.resolve();
});


module.exports = offerSchema;


// db.rawoffers.find().forEach(function(doc){
//     doc._id=doc.sid + '_' + doc.oid; db.rawoffersb.insert(doc);
// });
// db.rawoffersb.renameCollection("rawoffers", true);
