const assert = require('assert').strict;
const pickBy = require('lodash/pickBy');
const isEqual = require('lodash/isEqual');
const isPlainObject = require('lodash/isPlainObject');

const getPatch = (
    fromJson,
    intoJson,
    options = {}
) => {
    const patch = {};
    const maskedKeys = new Set(options.maskedKeys);
    const allKeys = Object.keys({
        ...fromJson,
        ...intoJson
    }).filter(key => !maskedKeys.has(key));

    allKeys.forEach(key => {
        const fromVal = fromJson[key];
        const intoVal = intoJson[key];

        if(!intoJson.hasOwnProperty(key)) {
            patch[key] = null;
        }
        else if(isEqual(fromVal, intoVal)) {
            return;
        }
        else if(isPlainObject(fromVal) && isPlainObject(intoVal)) {
            patch[key] = getPatch(fromVal, intoVal, options);
        }
        else {
            patch[key] = intoVal;
        }
    });

    return patch;
}

const applyPatch = (
    fromJson,
    patch,
    options = {}
) => {
    const maskedKeys = new Set(options.maskedKeys);
    const intoJson = {...fromJson};

    Object.entries(patch).forEach(([key, patchVal]) => {
        if(maskedKeys.has(key)) {
            return;
        }

        if(isPlainObject(fromJson[key]) && isPlainObject(patchVal)) {
            intoJson[key] = applyPatch(fromJson[key], patchVal, options);
        }
        else {
            intoJson[key] = patchVal;
        }
    });

    return intoJson;
}

const getDBUpdate = (
    fromJson,
    intoJson,
    options = {},
    { chain = [], update = { $set: {}, $unset: {} } } = {}
) => {
    Object.keys({
        ...fromJson,
        ...intoJson
    }).forEach(key => {
        const keypath = [...chain, key].join('.');
        const fromVal = fromJson[key];
        const intoVal = intoJson[key];

        if(intoVal === undefined) {
            update.$unset[keypath] = 1;
        }
        else if(isEqual(fromVal, intoVal)) {
            return;
        }
        else if(isPlainObject(fromVal) && isPlainObject(intoVal)) {
            chain.push(key);
            getDBUpdate(fromVal, intoVal, options, { chain, update });
        }
        else {
            update.$set[keypath] = intoVal;
        }
    });

    // MongoDB prohibits empty operators in updateDoc
    return pickBy(update, val => Object.keys(val).length);
}

const convertDocToJson = (...docs) => {
    return docs.map(doc => doc.toObject ? doc.toObject() : doc)
}

const isEmptyObject = (obj) => {
    return Object.keys(obj).length === 0;
}

const isSameDoc = (doc1, doc2) => {
    const [ obj1, obj2 ] = convertDocToJson(doc1, doc2);
    const maskedKeys = ['history', 'timestamp', '_id'];
    const patch = getPatch(obj1, obj2, { maskedKeys });

    return isEmptyObject(patch);
}

const mergeDocs = (baseDoc, atopDoc) => {
    const [ baseJson, atopJson ] = convertDocToJson(baseDoc, atopDoc);

    assert(baseJson.timestamp, 'Cant find a timestamp of base JSON');
    assert(atopJson.timestamp, 'Cant find a timestamp of atop JSON');
    assert(atopJson.timestamp > baseJson.timestamp, 'Atop JSON timestamp less than or equal base JSON timestamp');

    const maskedKeys = ['history', '_id'];
    const patch = getPatch(atopJson, baseJson, { maskedKeys });
    const history = baseJson.history || [];

    return { ...atopJson, history: [patch, ...history] };
}

module.exports = {
    isSameDoc,
    mergeDocs
}
