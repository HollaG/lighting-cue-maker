import type { ValueAssignment } from "../types/cues";
import { AttributeTypes } from "../types/types";
import { convertUuidForDatabase, convertUuidForEmbedding } from "./convertUuid";

export const CUE_MATCH_REGEX = /<cueId=(.*?)=cueId>/;
export const CUE_START = "<cueId=";
export const CUE_END = "=cueId>";

export const insertCueInRichContent = (
  id: string,
  lineIndex: number,
  wordIndex: number,
  isSpace: boolean,
  content: string[][],
): string[][] => {
  const updatedContent = [...content.map((line) => [...line])];

  if (isSpace) {
    const cueId = "<cueId=" + id.replaceAll("-", "_") + "=cueId>";
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
    const cueId = "<cueId=" + id.replaceAll("-", "_") + "=cueId>" + updatedContent[lineIndex][wordIndex];
    updatedContent[lineIndex][wordIndex] = cueId;
  }

  return updatedContent;
};

export const removeCueFromRawLyrics = (rawLyrics: string, cueId: string) => {
  return rawLyrics.replace("<cueId=" + convertUuidForEmbedding(cueId) + "=cueId>", "");
};

export const getCueOrder = (rawLyrics: string) => {
  const order: string[] = [];
  console.log({ rawLyrics });
  for (const line of rawLyrics.split("\n")) {
    for (const word of line.split(/[\ \-]/)) {
      const match = word.match(/<cueId=(.*?)=cueId>/);
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
      return v === "";
    }
    case AttributeTypes.MULTISELECT: {
      if (!value || Object.keys(value).length === 0) {
        // cue not touched at all
        return false;
      }
      const v = value.multiselect;
      return v && v.length === 0;
    }
    case AttributeTypes.COLOUR: {
      if (!value || Object.keys(value).length === 0) {
        // cue not touched at all
        return false;
      }
      const v = value.colour.hex;
      return v === "";
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
