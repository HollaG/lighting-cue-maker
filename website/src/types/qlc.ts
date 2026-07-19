// For every AttributeAssignment in each cue (don't need to care about FixtureGroups),
// use the QlcConfiguration to find the function IDs
// and produce QLC-compliant cue.

// Note that the key of `valueMap` is a string.
// All object values need to be a string, for example
// ColourOption --> choose "hex" as the key for Value.

// Example usage:
// attributeId = "abc" and type is select and value.select = "50"
// using attributeId = "abc", look up the valueMap
// then, use valueMap["50"] to find the function(s) associated with this value

export type QlcConfiguration = {
  [attributeId: string]: {
    valueMap: {
      [value: string]: string[]; // function ID array
    };
  };
};
