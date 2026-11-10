import {
  OptionSetType,
  SelectableType,
  type OptionSet,
  type Selectable,
  type SelectableBase,
} from "../types-v2/optionSet";

export const MAX_COUNTS = {
  [OptionSetType.INTENSITY]: 1,
  [OptionSetType.COLOUR]: 1,
  [OptionSetType.POSITION]: 1,
  [OptionSetType.CUSTOM]: Infinity,
};

export const shouldDisableAdding = (optionSets: OptionSet[], type: OptionSetType): boolean => {
  const existingCount = optionSets.filter((s) => s.type === type).length;
  return existingCount >= MAX_COUNTS[type];
};

export const optionSetTypeToName = (type: OptionSetType): string => {
  switch (type) {
    case "Colour":
      return "Colour";
    case "Intensity":
      return "Intensity";
    case "Position":
      return "Position";
    case "Custom":
      return "Custom";
    default:
      return "Unknown";
  }
};

export const optionSetTypeToDescription = (type: OptionSetType): string => {
  switch (type) {
    case "Colour":
      return "All fixtures in the group will be set to the chosen colour.";
    case "Intensity":
      return "All fixtures in the group will be at the selected brightness level";
    case "Position":
      return "All fixtures in the group will point at the selected position";
    case "Custom":
      return "";
    default:
      return "Unknown option set type.";
  }
};

// The inbuilt option set types can have default selectables
export const getPremadeSelectablesForOptionSetType = (type: OptionSetType): Selectable[] => {
  // for now, only intensity: return 0, 25, 50, 75, 100
  if (type === OptionSetType.INTENSITY) {
    return [0, 25, 50, 75, 100].map((percent) => ({
      id: crypto.randomUUID(),
      name: `${percent}%`,
      fixtureIds: "all",
      type: SelectableType.INTENSITY,
      percent,
    }));
  }
  return [];
};

// Some option set types are required to be filled in, some not
export const optionSetTypeRequired = (type: OptionSetType): boolean => {
  switch (type) {
    case "Colour":
      return true;
    case "Intensity":
      return true;
    case "Position":
      return true;
    case "Custom":
      return false;
    default:
      return false;
  }
};

// Rules for what option sets can exist
// Rule 1: 0..1 Intensity can exist
// Rule 2: 0..1 Colour can exist
// Rule 3: 0..1 Position can exist
const isAllowedOptionSetType = (type: OptionSetType, existingOptionSets: OptionSetType[]): boolean => {
  switch (type) {
    case "Intensity":
      return !existingOptionSets.includes("Intensity");
    case "Colour":
      return !existingOptionSets.includes("Colour");
    case "Position":
      return !existingOptionSets.includes("Position");
    case "Custom":
      return true;
    default:
      return false; // disallow multiple by default
  }
};
