const { Schema } = require("mongoose");

const reportSchema = new Schema(
  {
    timestamp: {
      type: Date,
      required: true
    },
    activeOffers: {
      type: Number,
      required: true
    }
  },
  {
    versionKey: false // https://tinyurl.com/ybt5a9rw
  }
);

module.exports = reportSchema;
