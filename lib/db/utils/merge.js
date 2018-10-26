const get = require('lodash/get');
const isEqual = require('lodash/isEqual');
const isPlainObject = require('lodash/isPlainObject');

const getDiff = (fromDoc, intoDoc, masked = []) => {
    const result = {};
    const allKeys = Object.keys({...fromDoc, ...intoDoc});

    allKeys.forEach(key => {
        if(masked.includes(key)) {
            return;
        }
        else if(!intoDoc.hasOwnProperty(key)) {
            result[key] = null;
        }
        else if(isEqual(fromDoc[key], intoDoc[key])) {
            return;
        }
        else if(isPlainObject(fromDoc[key]) && isPlainObject(intoDoc[key])) {
            result[key] = getDiff(fromDoc[key], intoDoc[key]);
        }
        else {
            result[key] = intoDoc[key];
        }
    });

    return result;
}

// TODO
const applyPatch = (target, patch = {}) => {
    const result = {...target};

    Object.entries(patch).forEach(([key, val]) => {
        if(val === null) {
            delete result[key];
        }
        else if(isPlainObject(target[key]) && isPlainObject(val)) {
            result[key] = applyPatch(target[key], val);
        }
        else {
            result[key] = target[key];
        }
    })

    return result;
}

const compareByTimestamp = (doc1, doc2) => {
    return doc1.timestamp - doc2.timestamp;
}

const mergeDocs = (currDoc, cameDoc, compare = compareByTimestamp) => {
    const history = get(currDoc, 'history', []);

    // 1. Текущего документа еще нет
    if(!currDoc) {
        return {...cameDoc};
    }
    // 2. Пришедший документ новее текущего
    else if(compare(cameDoc, currDoc) > 0) {
        return {
            ...cameDoc,
            history: [
                getDiff(cameDoc, currDoc, ['history']),
                ...history
            ]
        };
    }
    // 3. Текущий документ новее пришедшего
    else {
        const prevDoc = applyPatch(currDoc, history[0]);
        const remergedPrevDoc = mergeDocs(prevDoc, cameDoc, compare);

        return Object.assign(currDoc, {
            history: [
                getDiff(currDoc, remergedPrevDoc, ['history']),
                ...remergedPrevDoc.history
            ]
        });
    }
}

module.exports = {
    mergeDocs
}
