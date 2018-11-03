const assert = require('assert').strict;
const omit = require('lodash/omit');
const pickBy = require('lodash/pickBy');
const isEqual = require('lodash/isEqual');
const isPlainObject = require('lodash/isPlainObject');

const derivePatch = (
    fromJson,
    intoJson,
    { maskedKeys = [] } = {}
) => {
    const patch = {};
    const allKeys = Object.keys({
        ...fromJson,
        ...intoJson
    }).filter(key => !maskedKeys.includes(key));

    allKeys.forEach(key => {
        if(!intoJson.hasOwnProperty(key)) {
            patch[key] = null;
        }
        else if(isEqual(fromJson[key], intoJson[key])) {
            return;
        }
        else if(isPlainObject(fromJson[key]) && isPlainObject(intoJson[key])) {
            patch[key] = derivePatch(fromJson[key], intoJson[key]);
        }
        else {
            patch[key] = intoJson[key];
        }
    });

    return patch;
}

const applyPatch = (
    fromJson,
    patch,
    { maskedKeys = [] } = {}
) => {
    const intoJson = {...fromJson};

    Object.entries(patch).forEach(([key, val]) => {
        if(maskedKeys.includes(key)) {
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
            deriveDBUpdate(fromVal, intoVal, { chain, update });
        }
        else {
            update.$set[keypath] = intoVal;
        }
    });

    // MongoDB requires updateDoc without empty operators
    return pickBy(update, val => Object.keys(val).length);
}

const merge = (baseJson, atopJson, { historyKey, revisionKey }) => {
    const derivePatchOptions = {
        maskedKeys: [historyKey]
    };
    const applyPatchOptions = {
        maskedKeys: [historyKey]
    };
    const atopRevision = atopJson[revisionKey];
    const history = { '_': baseJson, ...Object(baseJson[historyKey]) };

    let prevJson, patch, nextJson;
    do {
        prevJson = nextJson || {[revisionKey]: '_'};
        prevRevision = prevJson[revisionKey];
        patch = history[prevRevision];
        nextJson = applyPatch(prevJson, patch, applyPatchOptions);
        nextRevision = nextJson[revisionKey];
        isLast = history[nextRevision] === undefined;

        assert(atopRevision !== nextRevision, 'Either a duplicate or a paradox when one revision has two states');

        if(atopRevision > nextRevision) {
            history[prevRevision] = derivePatch(prevJson, atopJson, derivePatchOptions);
            history[atopRevision] = derivePatch(atopJson, nextJson, derivePatchOptions);
            break;
        }
        else if(isLast) {
            history[nextRevision] = derivePatch(nextJson, atopJson, derivePatchOptions);
        }
    } while(!isLast)

    return {
        ...history['_'],
        history: omit(history, '_')
    }
}
// const merge = (baseJson, atopJson, { isGT, histKey }) => {
//     const history = [baseJson, ...(baseJson[histKey] || [])];
//     const applyPatchSafely = (target, patch) => applyPatch(target, omit(patch, histKey));
//     const derivePatchSafely = (fromDoc, intoDoc) => omit(derivePatch(fromDoc, intoDoc), histKey);

//     for (let i = history.length, prevJson, nextJson; i--;) {
//         prevJson = nextJson || {};
//         nextJson = applyPatchSafely(prevJson, history[i]);

//         if(isGT(atopJson, nextJson)) {
//             history.splice(i, 1, derivePatchSafely(prevJson, atopJson), derivePatchSafely(atopJson, nextJson));
//             break;
//         }
//         else if(i === 0) {
//             history.unshift(derivePatchSafely(nextJson, atopJson));
//             break;
//         }
//     }

//     return { ...history[0], [histKey]: history.slice(1) };
// }

const mergeDocs = (
    baseDoc,
    atopDoc,
    { historyKey = 'history', revisionKey = 'timestamp' } = {}
) => {
    const baseJson = baseDoc.toObject ? baseDoc.toObject() : baseDoc;
    const atopJson = atopDoc.toObject ? atopDoc.toObject() : atopDoc;
    const combJson = merge(baseJson, atopJson, { historyKey, revisionKey });

    return {
        baseJson,
        atopJson,
        combJson,
        dbUpdate: deriveDBUpdate(baseJson, combJson)
    }
}

module.exports = {
    mergeDocs
}
