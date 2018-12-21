const test = require("ava");
const { update } = require("./update");

test("update() should throw if there is no timestamp", t => {
  const baseJson = { LookNoTimestamp: 1 };
  const atopJson = { noTimestampEither: 2 };

  t.throws(() => update(baseJson, atopJson));
});

test("update() should throw if timestamps mess", t => {
  const baseJson = { timestamp: 1000000000001, a: 1 };
  const atopJson = { timestamp: 1000000000000, a: 2 };

  t.throws(() => update(baseJson, atopJson));
});

test("update() works with no history baseJson", t => {
  const baseJson = { timestamp: 1000000000001, a: 1 };
  const atopJson = { timestamp: 1000000000002, a: 2 };

  t.deepEqual(update(baseJson, atopJson), {
    timestamp: 1000000000002,
    a: 2,
    history: [
      {
        timestamp: 1000000000001,
        a: 1
      }
    ]
  });
});

test("update() works whit baseJson with history", t => {
  const baseJson = {
    timestamp: 1000000000002,
    a: 2,
    history: [{ timestamp: 1000000000001, a: 1 }]
  };
  const atopJson = {
    timestamp: 1000000000003,
    a: 3,
    b: "B!B!B"
  };

  t.deepEqual(update(baseJson, atopJson), {
    timestamp: 1000000000003,
    a: 3,
    b: "B!B!B",
    history: [
      { timestamp: 1000000000002, a: 2, b: null },
      { timestamp: 1000000000001, a: 1 }
    ]
  });
});

test("update() return baseJson if atopJson has no data changes", t => {
  const baseJson = {
    timestamp: 1000000000001,
    a: 1
  };

  const atopJson = {
    timestamp: 1000000000002,
    a: 1
  };

  t.deepEqual(update(baseJson, atopJson), {
    timestamp: 1000000000001,
    a: 1
  });
});

test("update() ignores atopJson history field", t => {
  const baseJson = {
    timestamp: 1000000000001,
    a: 1
  };

  const atopJson = {
    timestamp: 1000000000002,
    a: 2,
    history: [{ timestamp: 1000000000001, a: 123 }]
  };

  t.deepEqual(update(baseJson, atopJson), {
    timestamp: 1000000000002,
    a: 2,
    history: [{ timestamp: 1000000000001, a: 1 }]
  });
});
