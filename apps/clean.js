// Removing old offers

const db = require("../lib/db");

const clean = async () => {
  const offers = await db.getOffers({ status: "active" });
  console.log(offers.length);
};

clean();
