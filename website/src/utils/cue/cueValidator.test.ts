import { describe, expect, it } from "vitest";
import type { Cue, ValueAssignment } from "../../types/cues";
import { AttributeTypes, type FixtureGroupConfiguration } from "../../types/types";
import { checkCueCorrectness } from "./cueValidator";

const fixtureGroup: FixtureGroupConfiguration = {
  id: "group-id",
  name: "Front lights",
  order: 0,
  attributes: [
    {
      id: "intensity-id",
      name: "Intensity",
      type: AttributeTypes.PRESET_INTENSITY,
      metadata: {},
      optionPossibleValues: {},
      order: 0,
    },
    {
      id: "colour-id",
      name: "Colour",
      type: AttributeTypes.PRESET_COLOUR,
      metadata: {},
      optionPossibleValues: {},
      order: 1,
    },
    {
      id: "position-id",
      name: "Position",
      type: AttributeTypes.PRESET_POSITION,
      metadata: {},
      optionPossibleValues: {},
      order: 2,
    },
  ],
};

const createCue = ({
  intensity,
  colour,
  position,
}: {
  intensity?: ValueAssignment[typeof AttributeTypes.PRESET_INTENSITY];
  colour?: ValueAssignment[typeof AttributeTypes.PRESET_COLOUR];
  position?: ValueAssignment[typeof AttributeTypes.PRESET_POSITION];
}): Cue => ({
  id: "cue-id",
  comments: "",
  assignments: {
    [fixtureGroup.id]: {
      name: fixtureGroup.name,
      assignment: {
        "intensity-id": {
          name: "Intensity",
          type: AttributeTypes.PRESET_INTENSITY,
          value: { [AttributeTypes.PRESET_INTENSITY]: intensity },
        },
        "colour-id": {
          name: "Colour",
          type: AttributeTypes.PRESET_COLOUR,
          value: { [AttributeTypes.PRESET_COLOUR]: colour },
        },
        "position-id": {
          name: "Position",
          type: AttributeTypes.PRESET_POSITION,
          value: { [AttributeTypes.PRESET_POSITION]: position },
        },
      },
    },
  },
  createdAt: new Date(0),
  updatedAt: new Date(0),
  deletedAt: new Date(0),
});

describe("validateCue", () => {
  it.each([
    {
      intensity: 100,
      colour: { hex: "#ffffff", name: "White" },
      position: { id: "centre", name: "Centre" },
      issue: undefined,
    },
    { intensity: 100, colour: { hex: "#ffffff", name: "White" }, issue: "error" },
    { intensity: 100, position: { id: "centre", name: "Centre" }, issue: "error" },
    { colour: { hex: "#ffffff", name: "White" }, position: { id: "centre", name: "Centre" }, issue: "error" },
    { intensity: 100, issue: "error" },
    { colour: { hex: "#ffffff", name: "White" }, issue: "error" },
    { position: { id: "centre", name: "Centre" }, issue: "warning" },
    { issue: "notice" },
  ] as const)("validates the preset combination %#", ({ issue, ...values }) => {
    const result = checkCueCorrectness(createCue(values), [fixtureGroup]);

    expect(result.issues[0]?.type).toBe(issue);
    expect(result.ok).toBe(issue === undefined || issue === "notice");
  });

  it("treats preset types that are not configured for the group as present", () => {
    const positionOnlyGroup: FixtureGroupConfiguration = {
      ...fixtureGroup,
      attributes: fixtureGroup.attributes.filter((attribute) => attribute.type === AttributeTypes.PRESET_POSITION),
    };
    const cue = createCue({ position: { id: "centre", name: "Centre" } });

    expect(checkCueCorrectness(cue, [positionOnlyGroup])).toEqual({ ok: true, issues: [] });
  });

  it("treats a cue as empty when only unconfigured preset types count as present", () => {
    const intensityAndColourGroup: FixtureGroupConfiguration = {
      ...fixtureGroup,
      attributes: fixtureGroup.attributes.filter((attribute) => attribute.type !== AttributeTypes.PRESET_POSITION),
    };

    expect(checkCueCorrectness(createCue({}), [intensityAndColourGroup])).toMatchObject({
      ok: true,
      issues: [{ type: "notice" }],
    });
  });

  it("treats zero intensity and empty preset objects as absent", () => {
    const result = checkCueCorrectness(
      createCue({ intensity: 0, colour: { hex: "", name: "" }, position: { id: "", name: "" } }),
      [fixtureGroup],
    );

    expect(result).toMatchObject({ ok: true, issues: [{ type: "notice" }] });
  });
});
