import type { Bump } from "./bumps";
import type { Cue } from "./cues";
import type { Content } from "./lyrics";

export type Option<T extends string> = {
  label: string;
  value: T;
};

export type FixtureGroupConfiguration = {
  id: string; // stable
  name: string;
  attributes: AttributeConfiguration[];
  order: number;

  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type BumpConfiguration = {
  id: string; // stable
  name: string;
  description: string;
};

export type AttributeConfiguration = {
  id: string; // stable
  name: string;
  type: AttributeTypes;
  metadata: AttributeMetadata;
  optionPossibleValues: AttributeTypesOptions;
  order: number;

  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type AttributeMetadata = {
  placeholder?: string; // default: undefined
  required?: boolean; // default: FALSE
  defaultValue?: string | string[] | ColourOption | PresetPositionOption | boolean | number; // default: undefined
};

export const AttributeTypes = {
  TEXT: "text",
  SELECT: "select",
  MULTISELECT: "multiselect",
  COLOUR: "colour",
  SLIDER: "slider",
  SLIDER_PRESETS: "sliderPresets",
  BOOLEAN: "boolean",
  NONE: "none", // Illegal type!

  // Preset types
  PRESET_INTENSITY: "presetIntensity",
  PRESET_COLOUR: "presetColour",
  PRESET_POSITION: "presetPosition",
} as const;

export type AttributeTypes = (typeof AttributeTypes)[keyof typeof AttributeTypes];

/**
 * Describes the settings for the chosen attribute type.
 *
 * Only the value given by `type` in Attribute will be used.
 * For example, if type=Select, then read Option[], which is a list of Select options.
 *              if type=Colour, then read ColourOption[], which tells us the hex code and the name of the colour.
 *
 *
 */
export type AttributeTypesOptions = {
  [AttributeTypes.TEXT]?: TextOption;
  [AttributeTypes.SELECT]?: SelectOption[];
  [AttributeTypes.MULTISELECT]?: MultiSelectOption[];
  [AttributeTypes.COLOUR]?: ColourOption[];
  [AttributeTypes.SLIDER]?: SliderOption;
  [AttributeTypes.SLIDER_PRESETS]?: SliderPresetsOption[];
  [AttributeTypes.BOOLEAN]?: BooleanOptions; // this is atypical! usually it's true or false
  [AttributeTypes.NONE]?: null;

  // Presets
  [AttributeTypes.PRESET_INTENSITY]?: PresetIntensityOption[];
  [AttributeTypes.PRESET_COLOUR]?: PresetColourOption[];
  [AttributeTypes.PRESET_POSITION]?: PresetPositionOption[];
};

export type TextOption = string;
export type SelectOption = string;
export type MultiSelectOption = string;
export type SliderOption = { min: number; max: number };
export type SliderPresetsOption = number;

export type ColourOption = {
  hex: string;
  name: string;
};

type PositionOption = {
  name: string;
};

export const BooleanOptions = {
  CHECKED: "checkedDefault",
  UNCHECKED: "uncheckedDefault",
} as const;

export type PresetIntensityOption = number;
export type PresetColourOption = ColourOption;
export type PresetPositionOption = {
  name: string;
  pan: number;
  tilt: number;
};

export type BooleanOptions = (typeof BooleanOptions)[keyof typeof BooleanOptions];

export type LightEventConfiguration = {
  // dbId: number;
  id: string; // google doc id oR something else
  name: string;
  cuesPerBand?: number;
  uniqueCuesPerBand?: number;
  description: string;
  externalLink?: string;

  // options
  fixtureGroups: FixtureGroupConfiguration[];
  bumpConfigurations: BumpConfiguration[];
};

export type Item = {
  name: string; // future: let you see history?
  rawLyrics: string;
  content: Content[];

  bumps: Bump[];
  cues: Cue[];
  id: string;
};
