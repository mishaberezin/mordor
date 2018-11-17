const {
    getRawOffers,
    updateOffer,
    addFailedOffers,
    clearRawOffers } = require('./db');

const fixup = require('./fixup');

const TIMEOUT = 10000;

const run = async () => {
    const rawOffers = await getRawOffers();

    if(rawOffers.length) {
        console.log(`${rawOffers.length} новых офферов`);
    } else {
        console.log('Нет новых офферов');
        setTimeout(run, TIMEOUT);
        return;
    }

    const offers = await fixup(rawOffers);

    const failedOffers = [];

    for(const offer of offers) {
        await updateOffer(offer).catch(err => {
            failedOffers.push(offer);
            console.error(`Не удалось внести обновление в offer: ${offer._id}`);
            console.error(`Запись будет добавлена в коллекцию failedoffers`);
            console.error(err.message);
        });
    }

    await addFailedOffers(failedOffers);
    await clearRawOffers(offers); // Экономим время, удаляем балком.

    console.log(`${new Date()} Digested ${offers.length} raw offers`)

    setTimeout(run, TIMEOUT);
};

module.exports = run;
