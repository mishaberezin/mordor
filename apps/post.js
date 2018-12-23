const db = require("../lib/db");
const vkPost = require("../lib/create-vk-post");

const post = async () => {
  const offers = await db.getPostOffers();

  for (const o of offers) {
    await vkPost(o)
      .catch(console.error)
      .then(res => {
        console.log(`post_id ${res}`);
        if (res) {
          return db.clearPostOffers({ _id: o._id });
        }
      });
  }

  setTimeout(post, 10 * 1000 * 60); // 10 minutes
};

post();
