// Скрипт, который забирает свежие объявления из базы и постит в группу
const createVkPost = require('../create-vk-post');
const base = require('../lib/base');

(async () => {
    const offers = await base.getOffers({ published: false });

    const results = await Promise.all(offers.map(createVkPost))
        .catch(err => {
            console.log(err);
            process.exit();
        }).then(async results => {
            let posted = results.filter(o => o.published);
            let filter = {
                '$or': posted.map(o => {
                    return {
                        phone: o.phone,
                        price: o.price,
                        'address.normal': o.address.normal
                    }
                })
            };

            const updateResult = await Promise.all(posted.map(({phone, price, address}) => {
                const filter = { phone, price, 'address.normal': address.normal }
                return base.updateOffers(filter, { published: true });
            }))

            return posted;
        })

    console.log('Запостил!');

    process.exit();
})()

