import { describe, it, expect } from "vitest";
import {
  insertCueInRichContent,
  getCueOrder,
  removeCueFromRawLyrics,
  CUE_START,
  CUE_END,
  createDefaultValueAssignment,
  reconcileCueAssignments,
} from "../cueUtils";
import type { Cue } from "../../types/cues";
import {
  AttributeTypes,
  BooleanOptions,
  type AttributeConfiguration,
  type FixtureGroupConfiguration,
} from "../../types/types";

describe("cueUtils", () => {
  it("constants use curly braces", () => {
    expect(CUE_START).toBe("{cueId=");
    expect(CUE_END).toBe("=cueId}");
  });

  it("insertCueInRichContent inserts {cueId=...=cueId} into word", () => {
    const initialContent = [["hello", "world"]];
    const testId = "12345678-1234-1234-1234-123456789abc";
    const result = insertCueInRichContent(testId, 0, 0, false, initialContent);

    expect(result[0][0]).toContain("{cueId=");
    expect(result[0][0]).toContain("=cueId}hello");
    expect(result[0][0]).not.toContain("<cueId=");
  });

  it("insertCueInRichContent inserts {cueId=...=cueId} into space", () => {
    const initialContent = [["hello", " ", "world"]];
    const testId = "12345678-1234-1234-1234-123456789abc";
    const result = insertCueInRichContent(testId, 0, 1, true, initialContent);

    expect(result[0]).toContain("{cueId=12345678_1234_1234_1234_123456789abc=cueId}");
  });

  it("getCueOrder parses both {cueId=...=cueId} and legacy <cueId=...=cueId>", () => {
    const rawLyrics =
      "Hello {cueId=11111111_1111_1111_1111_111111111111=cueId}world <cueId=22222222_2222_2222_2222_222222222222=cueId>test";
    const order = getCueOrder(rawLyrics);

    expect(order).toEqual([
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    ]);
  });

  it("removeCueFromRawLyrics removes curly and legacy angle cue tags", () => {
    const testId = "12345678-1234-1234-1234-123456789abc";
    const rawWithCurly = "Hello {cueId=12345678_1234_1234_1234_123456789abc=cueId}world";
    const rawWithAngle = "Hello <cueId=12345678_1234_1234_1234_123456789abc=cueId>world";

    expect(removeCueFromRawLyrics(rawWithCurly, testId)).toBe("Hello world");
    expect(removeCueFromRawLyrics(rawWithAngle, testId)).toBe("Hello world");
  });

  it("reconciles saved cue values with the current fixture-group structure", () => {
    const cue: Cue = {
      id: "cue-id",
      comments: "Keep me",
      assignments: {
        "group-1": {
          name: "Old group name",
          assignment: {
            "attribute-1": {
              name: "Old attribute name",
              type: AttributeTypes.TEXT,
              value: { [AttributeTypes.TEXT]: "Saved value" },
            },
            "deleted-attribute": {
              name: "Deleted",
              type: AttributeTypes.TEXT,
              value: { [AttributeTypes.TEXT]: "Remove me" },
            },
          },
        },
        "deleted-group": { name: "Deleted group", assignment: {} },
      },
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
      deletedAt: new Date("2026-01-03"),
    };
    const fixtureGroups: FixtureGroupConfiguration[] = [
      {
        id: "group-1",
        name: "Current group name",
        order: 0,
        attributes: [
          {
            id: "attribute-1",
            name: "Current attribute name",
            type: AttributeTypes.TEXT,
            metadata: {},
            optionPossibleValues: {},
            order: 0,
          },
          {
            id: "attribute-2",
            name: "New checkbox",
            type: AttributeTypes.BOOLEAN,
            metadata: {},
            optionPossibleValues: { [AttributeTypes.BOOLEAN]: BooleanOptions.CHECKED },
            order: 1,
          },
        ],
      },
      { id: "group-2", name: "Empty group", order: 1, attributes: [] },
    ];

    const result = reconcileCueAssignments(cue, fixtureGroups);

    expect(result.comments).toBe("Keep me");
    expect(result.assignments).toEqual({
      "group-1": {
        name: "Current group name",
        assignment: {
          "attribute-1": {
            name: "Current attribute name",
            type: AttributeTypes.TEXT,
            value: { [AttributeTypes.TEXT]: "Saved value" },
          },
          "attribute-2": {
            name: "New checkbox",
            type: AttributeTypes.BOOLEAN,
            value: { [AttributeTypes.BOOLEAN]: true },
          },
        },
      },
      "group-2": { name: "Empty group", assignment: {} },
    });
    expect(cue.assignments["group-1"].assignment).toHaveProperty("deleted-attribute");
  });

  it("resets an existing assignment when its attribute type changes", () => {
    const cue: Cue = {
      id: "cue-id",
      comments: "",
      assignments: {
        group: {
          name: "Group",
          assignment: {
            attribute: {
              name: "Attribute",
              type: AttributeTypes.TEXT,
              value: { [AttributeTypes.TEXT]: "Old text" },
            },
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    };
    const fixtureGroups: FixtureGroupConfiguration[] = [
      {
        id: "group",
        name: "Group",
        order: 0,
        attributes: [
          {
            id: "attribute",
            name: "Attribute",
            type: AttributeTypes.SELECT,
            metadata: { defaultValue: "Default option" },
            optionPossibleValues: { [AttributeTypes.SELECT]: ["Default option"] },
            order: 0,
          },
        ],
      },
    ];

    const result = reconcileCueAssignments(cue, fixtureGroups);

    expect(result.assignments.group.assignment.attribute).toEqual({
      name: "Attribute",
      type: AttributeTypes.SELECT,
      value: { [AttributeTypes.SELECT]: "Default option" },
    });
  });

  it("copies a preset position when creating a default assignment", () => {
    const defaultPosition = {
      id: "position-id",
      name: "Centre",
    };
    const attribute: AttributeConfiguration = {
      id: "attribute-id",
      name: "Position",
      type: AttributeTypes.PRESET_POSITION,
      metadata: { defaultValue: defaultPosition },
      optionPossibleValues: { [AttributeTypes.PRESET_POSITION]: [defaultPosition] },
      order: 0,
    };

    const result = createDefaultValueAssignment(attribute)[AttributeTypes.PRESET_POSITION];

    expect(result).toEqual(defaultPosition);
    expect(result).not.toBe(defaultPosition);
  });
});
