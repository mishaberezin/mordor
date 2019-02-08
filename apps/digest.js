const { timeloop } = require("../lib/utils");
const {
  getRawOffers,
  updateOffer,
  addFailedOffers,
  clearRawOffers
} = require("../lib/db");

const fixup = require("../lib/fixup");

(async () => {
  const interval = timeloop(10000);

  for (;;) {
    await interval();

    const offers = await getRawOffers({}, { limit: 3 }).then(fixup);
    const failed = [];

    if (!offers.length) {
      console.log("Нет новых офферов");
      continue;
    }

    for (const offer of offers) {
      await updateOffer(offer).catch(err => {
        console.error(`Не удалось внести обновление в offer: ${offer._id}`);
        console.error(`Запись будет добавлена в коллекцию failedoffers`);
        console.error(err.message);

        offer.reason = err.message;
        failed.push(offer);
      });
    }

    await addFailedOffers(failed);
    await clearRawOffers(offers); // Экономим время, удаляем балком.

    console.log(`Digested ${offers.length} raw offers`);
  }
})();
