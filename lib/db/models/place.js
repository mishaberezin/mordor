const { Schema } = require('mongoose');

module.exports = new Schema({
    key: String,
    q: String,
    items: Array
});
