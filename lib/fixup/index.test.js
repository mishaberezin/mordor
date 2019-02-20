const test = require("ava");
const { fixPhones, fixPrice, fixTotalArea, fixFloor } = require("./index.js");

test("fixPhones() should work", t => {
  t.deepEqual(fixPhones({ phones: null }), { phones: [] });
  t.deepEqual(fixPhones({ phones: ["+7 495 727-81-69, +7 916 903-32-68"] }), {
    phones: ["+74957278169", "+79169033268"]
  });
  t.deepEqual(fixPhones({ phones: ["79169033268"] }), {
    phones: ["+79169033268"]
  });
});

test("fixPrice() should work", t => {
  t.deepEqual(fixPrice({ price: "45 000 ₽ в месяц" }), { price: 45000 });
});
test("fixTotalArea() should work", t => {
  t.deepEqual(fixTotalArea({ totalArea: "45 м²" }), { totalArea: 45 });
});
test("fixFloor() should work", t => {
  t.deepEqual(fixFloor({ floor: "23 из 25" }), { floor: 23 });
});
