const { sendReport } = require("../lib/mordobot");
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
        .catch(async error => {
          console.error(`Не удалось принять новый оффер [${rawOffer._id}]`);
          console.error(error);
          await sendReport("☝️ DIGEST: Не удалось принять новый оффер", {
            error,
            dump: rawOffer
          });

          rawOffer.reason = error.message;
          return addFailedOffer(rawOffer);
        })
        .finally(() => {
          return deleteRawOffer(rawOffer);
        });
    }

    console.log(`Приняли свежих офферов: ${rawOffers.length}`);
  }
})();
