const test = require("ava");
const { Cian } = require("./Cian");

test("sitemap() should recognize offer urls", t => {
  const robot = new Cian();
  const wrong = [
    "https://www.cian.ru/rent/flat/",
    "https://www.cian.ru/rent/flat/favorites/"
  ];
  const right = [
    "https://www.cian.ru/rent/flat/201172277/",
    "https://www.cian.ru/rent/flat/201172277/?foo=bar"
  ];

  for (const url of wrong) {
    t.not(robot.sitemap(url).type, "offer");
  }
  for (const url of right) {
    t.is(robot.sitemap(url).type, "offer");
  }
});
