const assert = require("assert").strict;
const omit = require("lodash/omit");
const isEqual = require("lodash/isEqual");
const isPlainObject = require("lodash/isPlainObject");

const getPatch = (fromJson, intoJson, options = {}) => {
  const patch = {};
  const maskedKeys = new Set(options.maskedKeys);
  const allKeys = Object.keys({
    ...fromJson,
    ...intoJson
  }).filter(key => !maskedKeys.has(key));

  allKeys.forEach(key => {
    const fromVal = fromJson[key];
    const intoVal = intoJson[key];

    if (!intoJson.hasOwnProperty(key)) {
      patch[key] = null;
    } else if (isEqual(fromVal, intoVal)) {
    } else if (isPlainObject(fromVal) && isPlainObject(intoVal)) {
      patch[key] = getPatch(fromVal, intoVal, options);
    } else {
      patch[key] = intoVal;
    }
  });

  return patch;
};

const applyPatch = (fromJson, patch, options = {}) => {
  const maskedKeys = new Set(options.maskedKeys);
  const intoJson = { ...fromJson };

  Object.entries(patch).forEach(([key, patchVal]) => {
    if (maskedKeys.has(key)) {
      return;
    }

    if (isPlainObject(fromJson[key]) && isPlainObject(patchVal)) {
      intoJson[key] = applyPatch(fromJson[key], patchVal, options);
    } else {
      intoJson[key] = patchVal;
    }
  });

  return intoJson;
};

const update = (baseJson, atopJson, options = {}) => {
  assert(baseJson.timestamp, "Cant find a timestamp of base JSON");
  assert(atopJson.timestamp, "Cant find a timestamp of atop JSON");
  assert(
    atopJson.timestamp > baseJson.timestamp,
    "Atop JSON timestamp less than or equal base JSON timestamp"
  );

  const optionalMaskedKeys = Array.isArray(options.maskedKeys)
    ? options.maskedKeys
    : [];
  const maskedKeys = ["history", ...optionalMaskedKeys];
  const patch = getPatch(atopJson, baseJson, { maskedKeys });
  const history = baseJson.history || [];
  const nothingChanged = Object.keys(patch).length === 1; // Only timestamp changed

  if (nothingChanged) {
    return baseJson;
  }
  const atopJsonMasked = omit(atopJson, maskedKeys);
  return { ...baseJson, ...atopJsonMasked, history: [patch, ...history] };
};

module.exports = {
  update
};
