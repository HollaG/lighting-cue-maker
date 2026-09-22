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

export type CueConfig = { mode: "unknown" } | { mode: "normal"; enabledGroups: string[] } | { mode: "blackout" };

export type CueTransition = {
  holdTimeMs: number; // in milliseconds
  transitionTimeMs: number; // in milliseconds
};

export type CueMode = CueConfig["mode"];

/**
 * Cues indicate
 */
export interface Cue {
  id: string; // must be generated and stable, so that if cue X-1 is deleted, then ... (idk lol)
  comments: string;

  assignments: FixtureGroupsAssignment;

  cueConfig: CueConfig;
  transition: CueTransition;

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

/**
 * Dictates the _chosen attribute option_ for each attribute type.
 *
 * For example, Attribute Intensity --> chosen value of 100
 *              Attribute Boolean --> chosen value of true
 * In most cases, we can take the direct value of the attribute and pass it
 * into the Visualiser2/3D Fixture for rendering.
 *
 * However, some attributes are `dynamic`, in that the ValueAssignment only holds the
 * identifier for the attribute value.
 * Additionally, attribute selections (like position) that may result in different values depending on each
 * individual fixture, cannot be stored in the cue itself.
 *   (imagine Intensity and Colour, those are the same for all fixtures in the group.)
 *
 * For example,
 *   Attribute Position --> chosen value of { id: 'abc', name: "center stage"}
 *
 * The actual value of the position attribute is stored in the Visualiser state, and can be retrieved by looking up the fixture id and position id in the Visualiser's `fixtureAttributeMapping`.
 * We do this because we don't want to store the actual position value in the cue, since it is dynamic and
 * may be changed by the admin. It's better to look up the value.
 *
 */
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

export type DynamicValueType = PresetPositionOption;

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
