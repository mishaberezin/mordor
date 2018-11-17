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

        if(!intoJson.hasOwnProperty(key)) {
            patch[key] = null;
        }
        else if(isEqual(fromVal, intoVal)) {
            return;
        }
        else if(isPlainObject(fromVal) && isPlainObject(intoVal)) {
            patch[key] = derivePatch(fromVal, intoVal, options);
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

const deriveDBUpdate = (
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
    const patchOptions = { maskedKeys: [historyKey] };
    const history = { '_': derivePatch({}, baseJson), ...baseJson[historyKey] };
    const atopRevision = atopJson[revisionKey];

    assert(atopRevision, 'Cant find a revision of atop JSON');

    let prevJson, patch, nextJson, nothingChanged;
    do {
        prevJson = nextJson || {[revisionKey]: '_'};
        prevRevision = prevJson[revisionKey];
        patch = history[prevRevision];
        nextJson = applyPatch(prevJson, patch, patchOptions);
        nextRevision = nextJson[revisionKey];
        isLast = history[nextRevision] === undefined;

        if(atopRevision > nextRevision) {
            history[prevRevision] = derivePatch(prevJson, atopJson, patchOptions);
            history[atopRevision] = derivePatch(atopJson, nextJson, patchOptions);
            break;
        }
        else if(atopRevision === nextRevision) {
            // Trully correct comparision considering null value treatment
            const nextJson2 = applyPatch(prevJson, derivePatch(prevJson, atopJson, patchOptions), patchOptions);
            assert(isEqual(nextJson2, nextJson), 'Paradox: one revision has two states');
            nothingChanged = true;
            break;
        }
        else if(isLast) {
            history[nextRevision] = derivePatch(nextJson, atopJson, patchOptions);
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
    { historyKey = 'history', revisionKey = 'timestamp' } = {}
) => {
    const maskedKeys = ['_id'];
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
