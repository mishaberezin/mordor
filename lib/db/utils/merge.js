const assert = require('assert').strict;
const omit = require('lodash/omit');
const isEqual = require('lodash/isEqual');
const isPlainObject = require('lodash/isPlainObject');

const getPatch = (fromDoc, intoDoc) => {
    const patch = {};
    const allKeys = Object.keys({...fromDoc, ...intoDoc});

    allKeys.forEach(key => {
        if(!intoDoc.hasOwnProperty(key)) {
            patch[key] = null;
        }
        else if(isEqual(fromDoc[key], intoDoc[key])) {
            return;
        }
        else if(isPlainObject(fromDoc[key]) && isPlainObject(intoDoc[key])) {
            patch[key] = getPatch(fromDoc[key], intoDoc[key]);
        }
        else {
            patch[key] = intoDoc[key];
        }
    });

    return patch;
}

const applyPatch = (target, patch) => {
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
    });

    return result;
}

const merge = (baseJson, atopJson, { isGT, histKey }) => {
    assert(!atopJson[histKey], `Поле ${histKey} может быть только в базовом объекте.`);

    const history = [omit(baseJson, histKey), ...(baseJson[histKey] || [])];

    for (let i = history.length, prevJson, nextJson; i--;) {
        prevJson = nextJson || {};
        nextJson = applyPatch(prevJson, history[i]);

        if(isGT(atopJson, nextJson)) {
            history.splice(i, 1, getPatch(prevJson, atopJson), getPatch(atopJson, nextJson));
            break;
        }
        else if(i === 0) {
            history.unshift(getPatch(nextJson, atopJson));
            break;
        }
    }

    return { ...history[0], [histKey]: history.slice(1) };
}

const isGTByTimestamp = (obj1, obj2) => {
    return obj1.timestamp > obj2.timestamp;
}

const mergeDocs = (baseDoc, atopDoc) => {
    const baseJson = baseDoc.toObject ? baseDoc.toObject() : baseDoc;
    const atopJson = atopDoc.toObject ? atopDoc.toObject() : atopDoc;

    return merge(baseJson, atopJson, { isGT: isGTByTimestamp, histKey: 'history'});
}

module.exports = {
    mergeDocs
}
