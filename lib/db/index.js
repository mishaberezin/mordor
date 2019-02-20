const config = require("config");
const mongoose = require("mongoose");

mongoose.connect(
  config.get("db.url"),
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    autoIndex: false
  }
);

mongoose.connection
  .on("open", () => {
    console.log("MongoDB connection established");
  })
  .on("error", error => {
    console.log(`MongoDB connection failed: ${error.message}`);
    mongoose.connection.close();
  })
  .on("disconnected", () => {
    console.log("MongoDB disconnected");
  })
  .on("reconnected", () => {
    console.log("MongoDB reconnected");
  })
  .on("reconnectFailed", () => {
    console.log("MongoDB reconnection failed");
  });

process.on("SIGINT", () => {
  mongoose.connection.close(() => {
    process.exit(0);
  });
});

const offerSchema = require("./schema/offer");
const Offer = mongoose.model("Offer", offerSchema);
const rawOfferSchema = require("./schema/rawOffer");
const RawOffer = mongoose.model("RawOffer", rawOfferSchema);
const failedOfferSchema = require("./schema/failedOffer");
const FailedOffer = mongoose.model("FailedOffer", failedOfferSchema);
const placeSchema = require("./schema/place");
const PlaceModel = mongoose.model("Place", placeSchema);
const reportSchema = require("./schema/report");
const Report = mongoose.model("report", reportSchema);

const updateOffer = async offer => {
  return Offer.absorb(offer);
};

const findOffers = (
  filter = {},
  select = null,
  options = {
    limit: 5000
  }
) => {
  return Offer.find(filter, select, options).lean();
};

const getOffers = async (...args) => {
  return findOffers(...args).exec();
};

const getOffersCursor = async (...args) => {
  return findOffers(...args).cursor();
};

const getMissingOffers = async sid => {
  const HOUR = 1000 * 60 * 60;
  const yesterday = new Date(Date.now() - HOUR * 24);

  return getOffers(
    {
      sid,
      status: "active",
      checkedAt: { $lt: yesterday }
    },
    "oid url -_id"
  );
};

const patchOffer = async (id, patch) => {
  const offer = await Offer.findById(id).exec();
  await offer.set(patch);
};

const addRawOffers = async (offers = []) => {
  return offers.length ? RawOffer.insertMany(offers) : Promise.resolve();
};

const addFailedOffer = async offer => {
  const doc = new FailedOffer(offer);
  return doc.save();
};

const getRawOffers = async (
  filter = {},
  options = {
    limit: 5000
  }
) => {
  return RawOffer.find(filter, null, options)
    .lean()
    .exec();
};

const deleteRawOffer = async offer => {
  return RawOffer.deleteOne({ _id: offer._id }).exec();
};

const deleteRawOffers = async offers => {
  const ids = offers.map(offer => offer._id);
  return RawOffer.deleteMany({ _id: { $in: ids } }).exec();
};

const addReport = async data => {
  const report = new Report(data);
  return report.save();
};

const addPlaces = async places =>
  Promise.all(
    places.map(async place => {
      const Place = new PlaceModel(place);

      return Place.save();
    })
  ).then(res => res.filter(Boolean));

const getPlaces = async filter => PlaceModel.find(filter);

const countOffers = async (filter = {}) => Offer.countDocuments(filter).exec();

module.exports = {
  getOffers,
  getOffersCursor,
  updateOffer,
  deleteRawOffer,
  deleteRawOffers,
  addPlaces,
  getPlaces,
  addRawOffers,
  addFailedOffer,
  getRawOffers,
  addReport,
  countOffers,
  patchOffer,
  getMissingOffers
};
