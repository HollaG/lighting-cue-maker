import type { Cue } from "./cues";
import type { Content } from "./lyrics";

export type Option = {
  label: string;
  value: string;
};

export type FixtureGroupConfiguration = {
  id: string; // stable
  name: string;
  attributes: AttributeConfiguration[];
};

export type AttributeConfiguration = {
  id: string; // stable
  name: string;
  type: AttributeTypes;
  metadata: Map<string, any>;
  optionPossibleValues: AttributeTypesOptions;
};

export const AttributeTypes = {
  TEXT: "text",
  SELECT: "select",
  MULTISELECT: "multiselect",
  COLOUR: "colour",
  SLIDER: "slider",
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
 */
export type AttributeTypesOptions = {
  [AttributeTypes.TEXT]: null;
  [AttributeTypes.SELECT]: string[];
  [AttributeTypes.MULTISELECT]: string[];
  [AttributeTypes.COLOUR]: ColourOption[];
  [AttributeTypes.SLIDER]: { min: number; max: number };
  [AttributeTypes.BOOLEAN]: BooleanOptions;
  [AttributeTypes.NONE]: null;
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

  // options
  fixtureGroups: FixtureGroupConfiguration[];
};

export type Item = {
  name: string; // future: let you see history?
  rawLyrics: string;
  content: Content[];

  cues: Cue[];
  id: string;
};
