const isNil = require("lodash/isNil");

const fixPhones = offer => {
  const phones = [];

  for (const phone of offer.phones || []) {
    phones.push(
      ...phone.split(/,\s*/).map(rawPhone =>
        rawPhone
          .trim()
          .replace(/[-\s]/g, "")
          .replace(/^7/, "+7")
      )
    );
  }

  offer.phones = phones;
  return offer;
};

const fixPrice = offer => {
  if (!isNil(offer.price)) {
    offer.price = parseInt(
      String(offer.price)
        .trim()
        .replace(/\s+/g, "")
    );
  }
  return offer;
};

const fixTotalArea = offer => {
  if (!isNil(offer.totalArea)) {
    offer.totalArea = parseInt(String(offer.totalArea).trim());
  }
  return offer;
};

const fixFloor = offer => {
  if (!isNil(offer.floor)) {
    offer.floor = parseInt(String(offer.floor).trim());
  }
  return offer;
};

const fixup = rawOffer => {
  return [fixPhones, fixPrice, fixTotalArea, fixFloor].reduce(
    (offer, fix) => fix(offer),
    { ...rawOffer }
  );
};

module.exports = { fixup, fixPhones, fixPrice, fixTotalArea, fixFloor };
