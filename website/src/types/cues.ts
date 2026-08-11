import { AttributeTypes, type ColourOption } from "./types";

/**
 * Cues indicate
 */
export interface Cue {
  id: string; // must be generated and stable, so that if cue X-1 is deleted, then ... (idk lol)
  comments: string;

  assignments: FixtureGroupsAssignment;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

type FixtureGroupsAssignment = {
  [groupId: string]: { name: string; assignment: FixtureGroupAssignment };
};

type FixtureGroupAssignment = {
  [attributeId: string]: {
    name: string;
    type: AttributeTypes;
    value: ValueAssignment;
  };
};

export type ValueAssignment = {
  [AttributeTypes.TEXT]?: string;
  [AttributeTypes.SELECT]?: string; // value
  [AttributeTypes.MULTISELECT]?: string[]; // value
  [AttributeTypes.COLOUR]?: ColourOption;
  [AttributeTypes.SLIDER]?: number; // value
  [AttributeTypes.BOOLEAN]?: boolean; // True = checked, false = not checked
  [AttributeTypes.NONE]?: null;
  [AttributeTypes.SLIDER_PRESETS]?: number; // value

  // Presets
  [AttributeTypes.PRESET_INTENSITY]?: number; // value
  [AttributeTypes.PRESET_COLOUR]?: ColourOption;
};

// export const DEFAULT_VALUE_ASSIGNMENT: ValueAssignment = {
//   [AttributeTypes.TEXT]: "",
//   [AttributeTypes.SELECT]: "", // value
//   [AttributeTypes.MULTISELECT]: [], // value
//   [AttributeTypes.COLOUR]: { hex: "", name: "" },
//   [AttributeTypes.SLIDER]: 0, // value
//   [AttributeTypes.BOOLEAN]: false, // True = checked, false = not checked
//   [AttributeTypes.NONE]: null,
//   [AttributeTypes.SLIDER_PRESETS]: 0, // value
// };
