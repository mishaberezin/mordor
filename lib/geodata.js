const chunk = require("lodash/chunk");

const Geocoder = require("multi-geocoder");

const geocoder = new Geocoder({
  provider: "yandex-cache",
  coordorder: "latlong"
});
const provider = geocoder.getProvider();

provider.getText = offer => offer.addressRaw;

const makeUrl = (base, params) => {
  const url = new URL(base);
  Object.entries(params).forEach(pair => url.searchParams.append(...pair));
  return url;
};

module.exports = async offers => {
  const offersChunks = chunk(offers, 200);

  for (const offersChunk of offersChunks) {
    const {
      result: { features }
    } = await geocoder.geocode(offersChunk);

    offersChunk.forEach((offer, i) => {
      const geodata = features[i];

      if (geodata) {
        const [lt, lg] = geodata.geometry.coordinates;

        offer.geodata = geodata;
        offer.address = geodata.properties.name;
        offer.maplink = makeUrl("https://static-maps.yandex.ru/1.x", {
          l: "map",
          z: "13",
          size: "600,450",
          ll: `${lg},${lt}`,
          pt: `${lg},${lt},home`
        });
      } else {
        offer.geodata = null;
        offer.address = null;
        offer.maplink = null;
      }
    });
  }
};
