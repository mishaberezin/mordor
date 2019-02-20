const { fixup } = require("../lib/fixup");
const { interval } = require("../lib/utils");
const {
  getRawOffers,
  updateOffer,
  addFailedOffer,
  deleteRawOffer
} = require("../lib/db");

(async () => {
  for await (const rawOffers of interval(10000, getRawOffers)) {
    for (const rawOffer of rawOffers) {
      const offer = fixup(rawOffer);

      await updateOffer(offer)
        .catch(err => {
          console.error(`Не удалось внести обновление в offer: ${offer._id}`);
          console.error(err);

          offer.reason = err.message;
          return addFailedOffer(offer);
        })
        .finally(() => {
          return deleteRawOffer(offer);
        });
    }

    console.log(`Приняли свежих офферов: ${rawOffers.length}`);
  }
})();
