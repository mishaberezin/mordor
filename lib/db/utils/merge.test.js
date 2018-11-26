const test = require('ava');
const {
    isSameDocs,
    getCombJson,
    getCombJsonDBUpdate } = require('./merge');

test('isSameDocs for same docs should return true', t => {
    const doc1 = { a: 1 };
    const doc2 = { a: 1 };

    t.true(isSameDocs(doc1, doc2));
});

test('isSameDocs for same docs with different _id should return true', t => {
    const doc1 = { _id: 123, a: 1 };
    const doc2 = { _id: 321, a: 1 };

    t.true(isSameDocs(doc1, doc2));
});

test('isSameDocs for different docs should return false', t => {
    const doc1 = { a: 1 };
    const doc2 = { a: 2 };

    t.false(isSameDocs(doc1, doc2));
});

// getCombJson
test('getCombJson should throw if there is no timestamp', t => {
    const doc1 = { LookNoTimestampHere: 1 };
    const doc2 = { noTimestampEither: 2 };

    t.throws(getCombJson(doc1, doc2));
});

test('getCombJson should return combined Json', t => {
    const doc1 = { timestamp: 1543252904821, a: 1 };
    const doc2 = { timestamp: 1543252904822, a: 2 };

    t.log(getCombJson(doc1, doc2));

    t.deepEqual(getCombJson(doc1, doc2), {
        a: 2
    });
});
