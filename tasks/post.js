// Постинг свежих объявлений в группу
// ----------------------------------

const createVkPost = require('../lib/create-vk-post');
const db = require('../lib/db');

(async () => {
    const offers = await db.getOffers({ published: false });
    if (!offers.length) {
        console.log('Нечего постить.');
        process.exit();
    }

    const queue = offers.map(async offer => {
        try {
            const post = await createVkPost(offer);
            if (!post) {
                throw new Error(`Не смог создать пост с ${offer.uniqueKey}`);
            }

            return db.updateOffers({ _id: offer._id }, { published: true });
        } catch(e) {
            console.error(e);
            process.exit();
        }
    });

    for (step of queue) {
        await step;
    }

    console.log('Запостил!');

    process.exit();
})()

