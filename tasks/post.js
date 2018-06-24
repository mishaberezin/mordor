// Постинг свежих объявлений в группу
// ----------------------------------

const createVkPost = require('../lib/create-vk-post');
const db = require('../lib/db');

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

(async () => {
    const offers = await db.getOffers({ published: false });
    if (!offers.length) {
        console.log('Нечего постить.');
        process.exit();
    }

    const processOffer = async offer => {
        const post = await createVkPost(offer);

        if (!post) {
            return false;
            // throw new Error(`Не смог создать пост с ${offer.uniqueKey}`);
        }

        return db.updateOffers({ _id: offer._id }, { published: true });
    };

    let offersCount = offers.length;
    let results = [];

    for (let i = 0; i < offersCount; i++) {
        const res = await processOffer(offers[i]);

        results.push(res);
    }

    console.log(`Запостил! ${results.filter(Boolean).length} из ${offersCount}`);

    process.exit();
})()

