import {
  AttributeTypes,
  type ColourOption,
  type MultiSelectOption,
  type PresetColourOption,
  type PresetIntensityOption,
  type PresetPositionOption,
  type SelectOption,
  type SliderPresetsOption,
  type TextOption,
} from "./types";

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

export type FixtureGroupsAssignment = {
  [groupId: string]: { name: string; assignment: AttributesAssignment };
};

export type AttributesAssignment = {
  [attributeId: string]: AttributeAssignment;
};

export type AttributeAssignment = {
  name: string;
  type: AttributeTypes;
  value: ValueAssignment;
};

export type ValueAssignment = {
  [AttributeTypes.TEXT]?: TextOption;
  [AttributeTypes.SELECT]?: SelectOption; // value
  [AttributeTypes.MULTISELECT]?: MultiSelectOption[]; // value
  [AttributeTypes.COLOUR]?: ColourOption;
  [AttributeTypes.SLIDER]?: number; // value
  [AttributeTypes.BOOLEAN]?: boolean; // True = checked, false = not checked
  [AttributeTypes.NONE]?: null;
  [AttributeTypes.SLIDER_PRESETS]?: SliderPresetsOption; // value

  // Presets
  [AttributeTypes.PRESET_INTENSITY]?: PresetIntensityOption; // value
  [AttributeTypes.PRESET_COLOUR]?: PresetColourOption;
  [AttributeTypes.PRESET_POSITION]?: PresetPositionOption;
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
