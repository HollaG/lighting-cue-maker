/**
 * Flattens any objects with only numeric keys into an array, sorted by the original key.
 *
 * {
 *  "eventName": "",
 *  "cuesPerBand": "123",
 *  "uniqueCuesPerBand": "423",
 *  "fixtureGroups": {
 *      "1783872966187": {
 *          "name": "group 1",
 *          "attributes": []
 *      },
 *      "1783872996108": {
 *          "name": "group 2",
 *          "attributes": []
 *      },
 *      "1783873010353": {
 *          "name": "",
 *          "attributes": []
 *      }
 *  }
 *}
 * becomes
 * {
 *  "eventName": "",
 *  "cuesPerBand": "123",
 *  "uniqueCuesPerBand": "423",
 *  "fixtureGroups": [
 *      {
 *          "name": "group 1",
 *          "id": 1783872966187,
 *          "attributes": []
 *      },
 *      {
 *          "name": "group 2",
 *          "id": 1783872996108,
 *          "attributes": []
 *      },
 *      {
 *          "name": "",
 *          "id": 1783873010353,
 *          "attributes": []
 *      }
 *  ]
 * }
 *
 * ... et cetera
 * @param obj
 */
export const flatten = (obj: any): any => {
  // Primitives and null pass through unchanged
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }

  const keys = Object.keys(obj);

  // If every key is a numeric string, treat the object as a pseudo-array
  const allNumeric = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));

  if (allNumeric) {
    // Sort by numeric key value, inject key as `id`, and recurse into each value
    return keys
      .map(Number)
      .sort((a, b) => a - b)
      .map((numKey) => ({
        id: numKey,
        ...flatten(obj[String(numKey)]),
      }));
  }

  // Regular object: recurse into each value
  const result: Record<string, any> = {};
  for (const key of keys) {
    result[key] = flatten(obj[key]);
  }
  return result;
};
