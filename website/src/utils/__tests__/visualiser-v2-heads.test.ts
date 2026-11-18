import { describe, expect, it } from "vitest";
import type { FixtureTemplate, Head, PhysicalProperties } from "../../types-v2/fixtureTemplates";
import {
  HEAD_PITCH,
  MULTI_HEAD_BODY_HEIGHT,
  getBeamAngle,
  getFixtureBody,
  getHeadCount,
  getHeadGrid,
  getHeadLayouts,
  getHeadSpacing,
} from "../visualiser-v2-heads";

const properties = (overrides: Partial<PhysicalProperties> = {}): PhysicalProperties => ({
  columns: 1,
  rows: 1,
  maxPan: 0,
  maxTilt: 0,
  minBeamAngle: 0,
  maxBeamAngle: 0,
  brightnessModifier: 100,
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

  it("sizes a multi-head fixture from its dimensions: the front face over the grid, depth as thickness", () => {
    // Like the OPPSK 720 bar: 970 × 60 mm face, 68 mm deep, 24 × 3 heads.
    const props = properties({ columns: 24, rows: 3, width: 970, height: 60, depth: 68 });
    expect(getHeadSpacing(24, 3, props)).toEqual({ pitchX: 0.970 / 24, pitchZ: 0.02, thickness: 0.068 });
    const body = getFixtureBody(72, props);
    expect(body.shape === "box" && body.size.map((v) => +v.toFixed(3))).toEqual([0.97, 0.068, 0.06]);

    const layouts = getHeadLayouts(template(72, { columns: 24, rows: 3, width: 970, height: 60, depth: 68 }), "m1");
    expect(layouts[0].position.map((v) => +v.toFixed(4))).toEqual([-0.4648, 0.034, -0.02]);
    expect(layouts[0].size.map((v) => +v.toFixed(4))).toEqual([0.0344, 0.017]);
  });

  it("falls back to the default pitch and thickness for each missing dimension on its own", () => {
    expect(getHeadSpacing(4, 2, properties())).toEqual({
      pitchX: HEAD_PITCH,
      pitchZ: HEAD_PITCH,
      thickness: MULTI_HEAD_BODY_HEIGHT,
    });
    expect(getHeadSpacing(4, 2, properties({ width: 400, height: 0 }))).toEqual({
      pitchX: 0.1,
      pitchZ: HEAD_PITCH,
      thickness: MULTI_HEAD_BODY_HEIGHT,
    });
  });

  it("beam angle falls back like QLC+", () => {
    expect(getBeamAngle(properties({ minBeamAngle: 15, maxBeamAngle: 40 }))).toBe(15);
    expect(getBeamAngle(properties())).toBe(10);
  });
});
