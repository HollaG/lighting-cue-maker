import type { Cue, ValueAssignment } from "../types/cues";
import { AttributeTypes, type FixtureGroupConfiguration } from "../types/types";
import { convertUuidForDatabase, convertUuidForEmbedding } from "./convertUuid";

export const CUE_MATCH_REGEX = /[\{<]cueId=(.*?)=cueId[\}>]/;
export const CUE_START = "{cueId=";
export const CUE_END = "=cueId}";

export const insertCueInRichContent = (
  id: string,
  lineIndex: number,
  wordIndex: number,
  isSpace: boolean,
  content: string[][],
): string[][] => {
  const updatedContent = [...content.map((line) => [...line])];

  if (isSpace) {
    const cueId = "{cueId=" + convertUuidForEmbedding(id) + "=cueId}";
    updatedContent[lineIndex][wordIndex] = cueId;

    const isLineBreak = updatedContent[lineIndex].length === 1;

    const line = updatedContent[lineIndex];

    line.splice(wordIndex + 1, 0, " ");
    line.splice(wordIndex, 0, " ");
    updatedContent[lineIndex] = line;

    if (isLineBreak) {
      updatedContent.splice(lineIndex + 1, 0, [" "]);
      updatedContent.splice(lineIndex, 0, [" "]);
    }
  } else {
    const cueId = "{cueId=" + convertUuidForEmbedding(id) + "=cueId}" + updatedContent[lineIndex][wordIndex];
    updatedContent[lineIndex][wordIndex] = cueId;
  }

  return updatedContent;
};

export const removeCueFromRawLyrics = (rawLyrics: string, cueId: string) => {
  // support both ids: try removing both the new curly format and legacy angle bracket format
  let newRawLyrics = rawLyrics.replace("{cueId=" + convertUuidForEmbedding(cueId) + "=cueId}", "");
  newRawLyrics = newRawLyrics.replace("<cueId=" + convertUuidForEmbedding(cueId) + "=cueId>", "");
  newRawLyrics = newRawLyrics.replace("{cueId=" + cueId.replaceAll("-", "_") + "=cueId}", "");
  newRawLyrics = newRawLyrics.replace("<cueId=" + cueId.replaceAll("-", "_") + "=cueId>", "");
  return newRawLyrics;
};

export const getCueOrder = (rawLyrics: string) => {
  const order: string[] = [];
  for (const line of rawLyrics.split("\n")) {
    for (const word of line.split(/[ -]/)) {
      const match = word.match(/[\{<]cueId=(.*?)=cueId[\}>]/);
      if (match) order.push(convertUuidForDatabase(match[1]));
    }
  }
  return order;
};

/**
 * Given a type and value assignment,
 * return the value saved in this Cue for this Attribute
 *
 * @param type
 * @param value
 * @returns
 */
export const getValueFromValueAssignment = (type: AttributeTypes, value: ValueAssignment) => {
  switch (type) {
    case AttributeTypes.TEXT: {
      const v = value.text;
      return v;
    }
    case AttributeTypes.SELECT: {
      const v = value.select;
      return v;
    }
    case AttributeTypes.MULTISELECT: {
      const v = value.multiselect;
      return v;
    }
    case AttributeTypes.COLOUR: {
      const v = value.colour.hex;
      return v;
    }
    case AttributeTypes.SLIDER: {
      const v = value.slider;
      return v;
    }
    case AttributeTypes.BOOLEAN: {
      const v = value.boolean ? "true" : "false";
      return v;
    }
    case AttributeTypes.NONE: {
      const v = value.none;
      return v;
    }
    default: {
      return [];
    }
  }
};

export const hasAValue = (type: AttributeTypes, value: ValueAssignment) => {
  // for these types, the value can never be unselected

  switch (type) {
    case AttributeTypes.SELECT: {
      if (!value || Object.keys(value).length === 0) {
        // cue not touched at all
        return false;
      }
      const v = value.select;
      return v !== "";
    }
    case AttributeTypes.MULTISELECT: {
      if (!value || Object.keys(value).length === 0) {
        // cue not touched at all
        return false;
      }
      const v = value.multiselect;
      return v && v.length !== 0;
    }
    case AttributeTypes.COLOUR: {
      if (!value || Object.keys(value).length === 0) {
        // cue not touched at all
        return false;
      }
      const v = value.colour.hex;
      return v !== "";
    }

    case AttributeTypes.TEXT:
    case AttributeTypes.SLIDER:
    case AttributeTypes.BOOLEAN:
    case AttributeTypes.NONE:
      return true;
    default:
      return false;
  }
};

/**
 * Simplifies the cue to a one-line string.
 * Follow the style of [AttributeName]: [AttributeValue];
 *
 * @param cue The cue to generate
 */
export const generateOneLineCue = (cue: Cue, fixtureGroups: FixtureGroupConfiguration[]): string => {
  if (!cue || !cue.assignments) return "";

  const fixtureGroupIdMap: Record<string, FixtureGroupConfiguration> = {};
  for (const group of fixtureGroups) {
    fixtureGroupIdMap[group.id] = group;
  }

  const parts: string[] = [];

  for (const [fixtureGroupId, group] of Object.entries(cue.assignments)) {
    if (!group?.assignment) continue;
    const fixtureGroup = fixtureGroupIdMap[fixtureGroupId];
    if (!fixtureGroup) continue;

    for (const attr of Object.values(group.assignment)) {
      if (!attr || attr.type === AttributeTypes.NONE) continue;
      if (!hasAValue(attr.type, attr.value)) {
        parts.push(`${fixtureGroup.name}/${attr.name}: Not selected`);
      }

      const val = getValueFromValueAssignment(attr.type, attr.value);
      let valStr = "";

      if (Array.isArray(val)) {
        valStr = val.join(", ");
      } else if (val !== null && val !== undefined) {
        valStr = String(val);
      }

      if (valStr.trim() !== "") {
        parts.push(`${fixtureGroup.name}/${attr.name}: ${valStr}`);
      }
    }
  }

  if (parts.length === 0) return "";
  return parts.join("; ");
};
