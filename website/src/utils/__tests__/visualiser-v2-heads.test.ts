import { describe, expect, it } from "vitest";
import type { FixtureTemplate, Head, PhysicalProperties } from "../../types-v2/fixtureTemplates";
import {
  HEAD_PITCH,
  getBeamAngle,
  getFixtureBody,
  getHeadCount,
  getHeadGrid,
  getHeadLayouts,
} from "../visualiser-v2-heads";

const properties = (overrides: Partial<PhysicalProperties> = {}): PhysicalProperties => ({
  columns: 1,
  rows: 1,
  maxPan: 0,
  maxTilt: 0,
  minBeamAngle: 0,
  maxBeamAngle: 0,
  brightnessModifier: 1,
  ...overrides,
});

const heads = (count: number): Head[] =>
  Array.from({ length: count }, (_, i) => ({ name: `H${i}`, channelIndexes: [i] }));

const template = (headCount: number, props: Partial<PhysicalProperties> = {}) =>
  ({
    modes: [{ id: "m1", name: "Mode", channelIds: [], heads: heads(headCount) }],
    properties: properties(props),
  }) as unknown as FixtureTemplate;

describe("fixture heads", () => {
  it("a mode without heads is one head", () => {
    expect(getHeadCount(template(0), "m1")).toBe(1);
    expect(getHeadLayouts(template(0), "m1")).toHaveLength(1);
    expect(getFixtureBody(1, undefined).shape).toBe("cylinder");
  });

  it("unknown mode falls back to the first mode", () => {
    expect(getHeadCount(template(4), "missing")).toBe(4);
  });

  it("uses columns × rows when it matches the head count, otherwise one row", () => {
    expect(getHeadGrid(8, properties({ columns: 4, rows: 2 }))).toEqual({ columns: 4, rows: 2 });
    expect(getHeadGrid(8, properties({ columns: 3, rows: 2 }))).toEqual({ columns: 8, rows: 1 });
  });

  it("lays heads out centred, columns along X and rows along Z", () => {
    const layouts = getHeadLayouts(template(4, { columns: 2, rows: 2 }), "m1");
    expect(layouts.map((h) => [h.position[0], h.position[2]])).toEqual([
      [-HEAD_PITCH / 2, -HEAD_PITCH / 2],
      [HEAD_PITCH / 2, -HEAD_PITCH / 2],
      [-HEAD_PITCH / 2, HEAD_PITCH / 2],
      [HEAD_PITCH / 2, HEAD_PITCH / 2],
    ]);
  });

  it("beam angle falls back like QLC+", () => {
    expect(getBeamAngle(properties({ minBeamAngle: 15, maxBeamAngle: 40 }))).toBe(15);
    expect(getBeamAngle(properties())).toBe(10);
  });
});
