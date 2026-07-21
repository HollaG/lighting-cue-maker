import type { ValueAssignment } from "../types/cues";
import { AttributeTypes } from "../types/types";
import { convertUuidForDatabase } from "./convertUuid";

export const getCueOrder = (rawLyrics: string) => {
  const order: string[] = [];
  for (const line of rawLyrics.split("\n")) {
    for (const word of line.split(" ")) {
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
