const {
    getRawOffers,
    updateOffer,
    clearRawOffers } = require('./db');

const fixup = require('./fixup');
const dedup = require('./dedup');

const TIMEOUT = 20000;

const run = async () => {
    const rawOffers = await getRawOffers();

    const offers = await fixup(rawOffers.slice(0,25));

    for(const offer of offers) {
        await updateOffer(offer).catch(err => {
            console.error(`Не удалось внести обновление в offer: ${offer._id}`);
            console.error(err);
            console.error(offer);

            // TODO добавить в коллекцию с инцидентами. Или Senrty?
        });
    }

    await clearRawOffers(offers); // Экономим время, удаляем балком.

    console.log(`${new Date()} Digested ${offers.length} raw offers`)

    setTimeout(run, TIMEOUT);
};

module.exports = run;
