const assert = require('assert').strict;
const omit = require('lodash/omit');
const pickBy = require('lodash/pickBy');
const isEqual = require('lodash/isEqual');
const isPlainObject = require('lodash/isPlainObject');

const derivePatch = (
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

        assert(intoVal !== null, `Uncompatible field value [${key}:${intoVal}]`);

        if(!intoJson.hasOwnProperty(key)) {
            patch[key] = null;
        }
        else if(isEqual(fromVal, intoVal)) {
            return;
        }
        else if(isPlainObject(fromVal) && isPlainObject(intoVal)) {
            patch[key] = derivePatch(fromVal, intoVal);
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

    Object.entries(patch).forEach(([key, val]) => {
        if(maskedKeys.has(key)) {
            return;
        }
        else if(val === null) {
            delete intoJson[key];
        }
        else if(isPlainObject(fromJson[key]) && isPlainObject(val)) {
            intoJson[key] = applyPatch(fromJson[key], val);
        }
        else {
            intoJson[key] = val;
        }
    });

    return intoJson;
}

const deriveDBUpdate = (
    fromJson,
    intoJson,
    options = {},
    { chain = [], update = { $set: {}, $unset: {} } } = {}
) => {
    const maskedKeys = new Set(options.maskedKeys);

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
            deriveDBUpdate(fromVal, intoVal, options, { chain, update });
        }
        else {
            update.$set[keypath] = intoVal;
        }
    });

    // MongoDB prohibits empty operators in updateDoc
    return pickBy(update, val => Object.keys(val).length);
}

const merge = (baseJson, atopJson, { historyKey, revisionKey }) => {
    const maskedKeys = [historyKey];
    const derivePatchOptions = { maskedKeys };
    const applyPatchOptions = { maskedKeys };
    const history = { '_': derivePatch({}, baseJson), ...baseJson[historyKey] };
    const atopRevision = atopJson[revisionKey];

    assert(atopRevision, 'Cant find atop JSON revision');

    let prevJson, patch, nextJson, nothingChanged;
    do {
        prevJson = nextJson || {[revisionKey]: '_'};
        prevRevision = prevJson[revisionKey];
        patch = history[prevRevision];
        nextJson = applyPatch(prevJson, patch, applyPatchOptions);
        nextRevision = nextJson[revisionKey];
        isLast = history[nextRevision] === undefined;

        if(atopRevision > nextRevision) {
            history[prevRevision] = derivePatch(prevJson, atopJson, derivePatchOptions);
            history[atopRevision] = derivePatch(atopJson, nextJson, derivePatchOptions);
            break;
        }
        else if(atopRevision === nextRevision) {
            assert(isEqual(atopJson, nextJson), 'Paradox: one revision has two states');
            nothingChanged = true;
            break;
        }
        else if(isLast) {
            history[nextRevision] = derivePatch(nextJson, atopJson, derivePatchOptions);
        }
    } while(!isLast)

    if(nothingChanged) {
        return baseJson;
    }

    return {
        ...history['_'],
        [historyKey]: omit(history, '_')
    }
}

const mergeDocs = (
    baseDoc,
    atopDoc,
    { historyKey = 'history', revisionKey = 'timestamp', maskedKeys = ['_id'] } = {}
) => {
    const baseJson = baseDoc.toObject ? baseDoc.toObject() : baseDoc;
    const atopJson = atopDoc.toObject ? atopDoc.toObject() : atopDoc;

    maskedKeys.forEach(key => {
        delete baseJson[key];
        delete atopJson[key];
    });

    const combJson = merge(baseJson, atopJson, { historyKey, revisionKey });
    const dbUpdate = deriveDBUpdate(baseJson, combJson);

    return { baseJson, atopJson, combJson, dbUpdate };
}

module.exports = {
    mergeDocs
}
