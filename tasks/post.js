// Постинг свежих объявлений в группу
// ----------------------------------

const createVkPost = require('../lib/create-vk-post');
const db = require('../lib/db');

(async () => {
    const offers = await db.getOffers({ published: false });
    const queue = offers.forEach(async offer => {
        try {
            await createVkPost(offer);
            await db.updateOffers({ _id: offer._id }, { published: true });
        } catch(e) {}
    });

    for (step of queue) {
        await step;
    }

    console.log('Запостил!');

    process.exit();
})()

