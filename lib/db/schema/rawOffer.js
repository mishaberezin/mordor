const { Schema } = require("mongoose");

const rawOfferSchema = new Schema(
  {
    sid: {
      type: String,
      required: true
    },
    oid: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    timestamp: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      required: true
    },
    totalArea: String,
    roomsCount: String,
    floor: String,
    metro: String,
    photos: Array,
    description: String,
    price: String,
    phone: String,
    isAgent: Boolean,
    address: String
  },
  {
    strict: true,
    minimize: false,
    versionKey: false // https://tinyurl.com/ybt5a9rw
  }
);

rawOfferSchema.pre("init", offer => {
  Object.keys(offer).forEach(key => {
    if (Object.is(offer[key], null)) {
      delete offer[key];
    }
  });
});

module.exports = rawOfferSchema;
