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
};

export type AttributeMetadata = {
  placeholder?: string; // default: undefined
  required?: boolean; // default: FALSE
  defaultValue?: string | string[] | ColourOption | boolean | number; // default: undefined
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
  [AttributeTypes.TEXT]?: string;
  [AttributeTypes.SELECT]?: string[];
  [AttributeTypes.MULTISELECT]?: string[];
  [AttributeTypes.COLOUR]?: ColourOption[];
  [AttributeTypes.SLIDER]?: { min: number; max: number };
  [AttributeTypes.SLIDER_PRESETS]?: number[];
  [AttributeTypes.BOOLEAN]?: BooleanOptions;
  [AttributeTypes.NONE]?: null;
};

export type ColourOption = {
  hex: string;
  name: string;
};

export const BooleanOptions = {
  CHECKED: "checkedDefault",
  UNCHECKED: "uncheckedDefault",
} as const;

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
