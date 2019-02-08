module.exports = rawOffers => {
  rawOffers.forEach(offer => {
    if (!offer.phones) {
      offer.phones = [];
    } else {
      offer.phones = offer.phones.map(phone => {
        if (phone.startsWith("7")) {
          return "+" + phone;
        } else {
          return phone;
        }
      });
    }
  });

  return rawOffers;
};
