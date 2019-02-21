const finder = require("./place-finder");

const places = [
  { key: "azbuka", q: "азбука вкуса" },
  { key: "cinema", q: "кинотеатр" },
  { key: "park", q: "парк" },
  { key: "dixy", q: "дикси" },
  { key: "magnolia", q: "магнолия" },
  { key: "perekrestok", q: "перекресток" },
  { key: "5ka", q: "пятёрочка" },
  { key: "gym", q: "тренажерный зал" }
];

module.exports = async () =>
  Promise.all(
    places.map(({ q }) => new Promise(resolve => finder(q, resolve)))
  ).then(res => places.map((p, i) => Object.assign({}, p, { items: res[i] })));
