const { Schema } = require('mongoose');

module.exports = new Schema({
    key: String,
    q: String,
    items: Array
}, {
    strict: 'throw',
    autoIndex: false,
    minimize: false,
    versionKey: false, // https://tinyurl.com/ybt5a9rw
});
