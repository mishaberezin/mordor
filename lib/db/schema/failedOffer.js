const { Schema } = require("mongoose");
const offerSchema = require("./offer");

const failedOfferSchema = new Schema(
  {
    ...offerSchema.obj,
    reason: String
  },
  {
    strict: false,
    versionKey: false // https://tinyurl.com/ybt5a9rw
  }
);

module.exports = failedOfferSchema;
