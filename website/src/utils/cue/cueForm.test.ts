import { describe, expect, it } from "vitest";
import type { ValueAssignment } from "../../types/cues";
import { AttributeTypes } from "../../types/types";
import { isQlcMappable } from "../qlc";
import { getValueFromValueAssignment, hasAValue } from "./cueForm";

describe("QLC preset mappings", () => {
  it.each([
    [AttributeTypes.PRESET_INTENSITY, { presetIntensity: 75 }, 75],
    [AttributeTypes.PRESET_COLOUR, { presetColour: { name: "Blue", hex: "#0000ff" } }, "#0000ff"],
    [AttributeTypes.PRESET_POSITION, { presetPosition: { id: "position-id", name: "Stage left" } }, "position-id"],
  ] as const)("uses the configured identifier for %s", (type, value, expected) => {
    expect(getValueFromValueAssignment(type, value as ValueAssignment)).toBe(expected);
    expect(hasAValue(type, value as ValueAssignment)).toBe(true);
    expect(isQlcMappable(type)).toBe(true);
  });

  it.each([AttributeTypes.PRESET_INTENSITY, AttributeTypes.PRESET_COLOUR, AttributeTypes.PRESET_POSITION])(
    "treats an empty %s assignment as unselected",
    (type) => {
      expect(hasAValue(type, {})).toBe(false);
    },
  );
});
