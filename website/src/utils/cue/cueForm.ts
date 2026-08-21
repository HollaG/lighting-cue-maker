import type { Cue, ValueAssignment } from "../../types/cues";
import {
  AttributeTypes,
  BooleanOptions,
  type AttributeConfiguration,
  type ColourOption,
  type FixtureGroupConfiguration,
  type PresetPositionOption,
} from "../../types/types";
import { convertUuidForDatabase, convertUuidForEmbedding } from "../convertUuid";

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
      const v = value.colour?.hex;
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
      const v = value.colour?.hex;
      return v !== "";
    }
    case AttributeTypes.SLIDER_PRESETS: {
      if (value[type] === undefined || value[type] === null) {
        return false;
      }

      return true;
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

export const reconcileCueAssignments = (cue: Cue, fixtureGroups: FixtureGroupConfiguration[]): Cue => {
  // Updates a cue's assignments to match the current fixture groups and attributes.
  // If a fixture group no longer exists, delete that fixtureGroup.
  // If a fixture group now exists and does not exist in Cue yet, create a new assignment for that fixture group with default values for each attribute (IF ANY).

  // If an attribute no longer exists, delete that attribute from the assignment.
  // If an attribute now exists and does not exist in Cue yet, create a new assignment for that attribute with default value.

  const newAssignments: Cue["assignments"] = {};

  for (const group of fixtureGroups) {
    // find the cue's assignments for this fixture group
    const existingGroup = cue.assignments?.[group.id];
    const assignment: Cue["assignments"][string]["assignment"] = {};

    for (const attribute of group.attributes) {
      const existingAttribute = existingGroup?.assignment?.[attribute.id];
      const canReuseValue = // false if no existing group exists, no assingment for this attribute exists, or the "type" of the attribute has changed (so it's no longer valid)
        existingAttribute?.type === attribute.type && existingAttribute?.value[attribute.type] !== undefined;
      // Object.prototype.hasOwnProperty.call(existingAttribute.value, attribute.type);

      assignment[attribute.id] = {
        name: attribute.name,
        type: attribute.type,
        value: canReuseValue
          ? ({ [attribute.type]: existingAttribute.value[attribute.type] } as ValueAssignment)
          : createDefaultValueAssignment(attribute),
      };
    }

    newAssignments[group.id] = {
      name: group.name,
      assignment,
    };
  }

  return {
    ...cue,
    assignments: newAssignments,
  };
};

/**
 * Creates a valid initial cue value for a newly added or type-changed attribute.
 *
 * TODO: default value should have a better typing than staying in metadata.
 *       A lot of the code in this function simply sanity-checks the default value
 *       to make sure it is valid.
 *
 */
export const createDefaultValueAssignment = (attribute: AttributeConfiguration): ValueAssignment => {
  const defaultValue = attribute.metadata.defaultValue;

  switch (attribute.type) {
    case AttributeTypes.TEXT:
      return { [AttributeTypes.TEXT]: typeof defaultValue === "string" ? defaultValue : "" };
    case AttributeTypes.SELECT:
      return { [AttributeTypes.SELECT]: typeof defaultValue === "string" ? defaultValue : "" };
    case AttributeTypes.MULTISELECT:
      return {
        [AttributeTypes.MULTISELECT]:
          Array.isArray(defaultValue) && defaultValue.every((value) => typeof value === "string")
            ? [...defaultValue]
            : [],
      };

    case AttributeTypes.COLOUR:
      return { [AttributeTypes.COLOUR]: isColourOption(defaultValue) ? { ...defaultValue } : { hex: "", name: "" } };
    case AttributeTypes.PRESET_COLOUR:
      return {
        [AttributeTypes.PRESET_COLOUR]: isColourOption(defaultValue) ? { ...defaultValue } : { hex: "", name: "" },
      };
    case AttributeTypes.SLIDER:
      return {
        [AttributeTypes.SLIDER]:
          typeof defaultValue === "number"
            ? defaultValue
            : (attribute.optionPossibleValues[AttributeTypes.SLIDER]?.min ?? 0),
      };

    case AttributeTypes.SLIDER_PRESETS:
      return {
        [AttributeTypes.SLIDER_PRESETS]:
          typeof defaultValue === "number"
            ? defaultValue
            : attribute.optionPossibleValues[AttributeTypes.SLIDER_PRESETS]?.[0],
      };

    case AttributeTypes.PRESET_INTENSITY:
      return {
        [AttributeTypes.PRESET_INTENSITY]:
          typeof defaultValue === "number"
            ? defaultValue
            : attribute.optionPossibleValues[AttributeTypes.PRESET_INTENSITY]?.[0],
      };
    case AttributeTypes.PRESET_POSITION: {
      const position = isPresetPositionOption(defaultValue) ? defaultValue : undefined;

      return { [AttributeTypes.PRESET_POSITION]: position ? clonePresetPositionOption(position) : undefined };
    }
    case AttributeTypes.BOOLEAN:
      return {
        [AttributeTypes.BOOLEAN]:
          typeof defaultValue === "boolean"
            ? defaultValue
            : attribute.optionPossibleValues[AttributeTypes.BOOLEAN] === BooleanOptions.CHECKED,
      };

    case AttributeTypes.NONE:
      return { [AttributeTypes.NONE]: null };
  }
};

const isColourOption = (value: unknown): value is ColourOption =>
  typeof value === "object" &&
  value !== null &&
  "hex" in value &&
  typeof value.hex === "string" &&
  "name" in value &&
  typeof value.name === "string";

const isPresetPositionOption = (value: unknown): value is PresetPositionOption =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string";

const clonePresetPositionOption = (position: PresetPositionOption): PresetPositionOption => ({
  ...position,
});
