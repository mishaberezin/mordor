const express = require("express");

const router = express.Router();
const fetch = require("node-fetch");

const base = require("../../lib/db");

/* GET home page. */
router.get("/", async (req, res, next) => {
  const offers = await base.getOffers({});
  res.render("index", { offers });
});

router.get("/offer/:id", async (req, res, next) => {
  const id = req.params.id;
  const offer = (await base.getOffers({ _id: id }))[0];
  const places = [].concat.apply(
    [],
    (await base.getPlaces()).map(a => a.items)
  );
  const offerCoords = offer.geodata.geometry.coordinates;

  let closePlaces = places
    .map(p => {
      const lat = p.coordinates[0];
      const lang = p.coordinates[1];
      const dLat = Math.abs(lat - offerCoords[0]);
      const dLang = Math.abs(lang - offerCoords[1]);
      const dCoord = dLat < 0.025 && dLang < 0.025;

      if (!dCoord) return false;

      return Object.assign(p);
    })
    .filter(Boolean);

  const distances = await Promise.all(
    closePlaces.map(
      p =>
        new Promise(resolve =>
          fetch(
            `http://localhost:8989/route?point=${offerCoords.join(
              ","
            )}&point=${p.coordinates.join(",")}&instructions=false&vehicle=foot`
          )
            .then(res => res.json())
            .then(({ paths }) => ({
              distance: paths[0].distance,
              distanceText:
                paths[0].distance < 1000
                  ? `${Math.ceil(paths[0].distance.toFixed(0, 10) / 10) * 10}м`
                  : `${(paths[0].distance / 1000).toFixed(1, 10)}км`,
              time: (paths[0].distance / 80).toFixed(0, 10),
              timeText: `${(paths[0].distance / 80).toFixed(0, 10)}мин.`
            }))
            .then(resolve)
        )
    )
  );

  closePlaces = closePlaces
    .map((p, i) => Object.assign(p, distances[i]))
    .filter(a => a.time < 20)
    .sort((a, b) => (a.distance > b.distance ? 1 : -1));

  res.render("offer", { offer, places: closePlaces });
});

module.exports = router;
