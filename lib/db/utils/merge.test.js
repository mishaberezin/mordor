const test = require('ava');
const {
    isSameDoc,
    mergeDocs } = require('./merge');

test('isSameDocs for same docs should return true', t => {
    const doc1 = { a: 1 };
    const doc2 = { a: 1 };

    t.true(isSameDoc(doc1, doc2));
});

test('isSameDocs should not consider timestamp field', t => {
    const doc1 = { timestamp: 1000000000000, a: 1 };
    const doc2 = { timestamp: 1000000000555, a: 1 };

    t.true(isSameDoc(doc1, doc2));
});

test('isSameDocs should not consider _id field', t => {
    const doc1 = { _id: 555, a: 1 };
    const doc2 = { _id: 000, a: 1 };

    t.true(isSameDoc(doc1, doc2));
});

test('isSameDocs should not consider history field', t => {
    const doc1 = { history: null, a: 1 };
    const doc2 = { history: [{}], a: 1 };

    t.true(isSameDoc(doc1, doc2));
});

test('isSameDocs for different docs should return false', t => {
    const doc1 = { a: 1 };
    const doc2 = { a: 2 };

    t.false(isSameDoc(doc1, doc2));
});

// mergeDocs
test('mergeDocs should throw if there is no timestamp', t => {
    const baseDoc = { LookNoTimestamp: 1 };
    const atopDoc = { noTimestampEither: 2 };

    t.throws(() => mergeDocs(baseDoc, atopDoc));
});

test('mergeDocs, baseDoc without history', t => {
    const baseDoc = { timestamp: 1000000000001, a: 1 };
    const atopDoc = { timestamp: 1000000000002, a: 2 };

    t.deepEqual(mergeDocs(baseDoc, atopDoc), {
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

test('mergeDocs, baseDoc with history', t => {
    const baseDoc = {
        timestamp: 1000000000002,
        a: 2,
        history: [
            { timestamp: 1000000000001, a: 1 }
        ]
    };
    const atopDoc = {
        timestamp: 1000000000003,
        a: 3,
        b: 'B!B!B'
    };

    t.deepEqual(mergeDocs(baseDoc, atopDoc), {
        timestamp: 1000000000003,
        a: 3,
        b: 'B!B!B',
        history: [
            { timestamp: 1000000000002, a: 2, b: null },
            { timestamp: 1000000000001, a: 1 }
        ]
    });
});
