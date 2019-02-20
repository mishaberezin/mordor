const { Schema } = require("mongoose");

const rawOfferSchema = new Schema(
  {
    sid: {
      type: String,
      required: true
    },
    oid: String,
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
      enum: ["active", "closed", "deleted"],
      required: true
    },
    totalArea: String,
    roomsCount: String,
    floor: String,
    photos: {
      type: Array,
      default: () => null
    },
    description: String,
    price: String,
    phones: {
      type: Array,
      default: () => null
    },
    isAgent: Boolean,
    address: String,
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
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
