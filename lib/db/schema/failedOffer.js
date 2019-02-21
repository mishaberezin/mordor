const { Schema } = require("mongoose");

const failedOfferSchema = new Schema(
  {},
  {
    strict: false
  }
);

module.exports = failedOfferSchema;
