const assert = require('assert').strict;
const omit = require('lodash/omit');
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

const isSameDocs = (baseDoc, atopDoc) => {
    const [ baseJson, atopJson ] = convertDocToJson(baseDoc, atopDoc);
    const patch = getPatch(baseJson, atopJson, { maskedKeys: ['history', 'timestamp', '_id'] });

    return Object.keys(patch).length === 0;
}

const getCombJson = (baseDoc, atopDoc) => {
    const [ baseJson, atopJson ] = convertDocToJson(baseDoc, atopDoc);

    assert(atopJson.timestamp, 'Cant find a revision of atop JSON');
    assert(atopJson.timestamp > baseJson.timestamp, 'Atop JSON older than base JSON');

    if(isSameDocs(baseJson, atopJson)) {
        return baseJson;
    }

    const atopToBasePatch = getPatch(atopJson, baseJson, { maskedKeys: ['history', '_id'] });

    return {
        ...
        atopJson,
        history: { ...baseJson.history, [baseJson.timestamp]: atopToBasePatch }
    };
}

const getCombJsonDBUpdate = (baseDoc, atopDoc) => {
    const [ baseJson, atopJson ] = convertDocToJson(baseDoc, atopDoc);
    const combJson = getMergedJson(baseJson, atopJson);

    return getDBUpdate(baseJson, combJson);
}

module.exports = {
    isSameDocs,
    getCombJson,
    getCombJsonDBUpdate
}
